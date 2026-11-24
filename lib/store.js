// The ballot box. One ballot per voter id; casting again replaces the previous pick.
// Production: Upstash Redis over REST (set UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN).
// Without those, dev falls back to process memory so `npm run dev` just works (resets on restart).
import { createHmac } from 'node:crypto';

export const OPTION_IDS = ['openai', 'anthropic', 'google', 'xai', 'meta'];

// Per network (IPv4 address or IPv6 /64). `fresh` is the one that matters: voter ids are made by the
// browser, so minting new ones is free; this caps how many new voters one network can add per day.
// Shared networks (offices, campuses, carrier NAT) hit it first; raise `fresh` if that bites.
const LIMITS = { rate: 10, rateWindow: 60, fresh: 20, freshWindow: 86400 };

// Atomic: flood guard, new-voter cap, then undo the voter's old pick (if any) and count the new one.
// Returns 1 counted, 0 unchanged, -1 rate limited, -2 network over its new-voter cap.
// ponytail: fixed windows allow a 2x burst at the boundary; fine for a poll.
const CAST = `
local n = redis.call('INCR', KEYS[3])
if n == 1 then redis.call('EXPIRE', KEYS[3], ARGV[4]) end
if n > tonumber(ARGV[3]) then return -1 end
local old = redis.call('HGET', KEYS[2], ARGV[1])
if old == ARGV[2] then return 0 end
if not old then
  local m = redis.call('INCR', KEYS[4])
  if m == 1 then redis.call('EXPIRE', KEYS[4], ARGV[6]) end
  if m > tonumber(ARGV[5]) then return -2 end
end
if old then redis.call('HINCRBY', KEYS[1], old, -1) end
redis.call('HINCRBY', KEYS[1], ARGV[2], 1)
redis.call('HSET', KEYS[2], ARGV[1], ARGV[2])
return 1`;

const mem = (globalThis.__ballotBox ??= { tally: {}, voters: new Map() });

const toTally = (flat) => {
  const t = Object.fromEntries(OPTION_IDS.map((id) => [id, 0]));
  for (let i = 0; i < (flat?.length ?? 0); i += 2) if (flat[i] in t) t[flat[i]] = Math.max(0, Number(flat[i + 1]) || 0);
  return t;
};

// One person on IPv6 usually holds a whole /64, so limit by that prefix, not the full address.
export function netKey(ip) {
  if (ip.includes('.')) return ip.slice(ip.lastIndexOf(':') + 1); // IPv4, incl. ::ffff:1.2.3.4
  if (!ip.includes(':')) return ip;
  const [head, tail = ''] = ip.toLowerCase().split('::');
  const h = head ? head.split(':') : [], t = tail ? tail.split(':') : [];
  const groups = [...h, ...Array(Math.max(0, 8 - h.length - t.length)).fill('0'), ...t];
  return groups.slice(0, 4).map((g) => parseInt(g || '0', 16).toString(16)).join(':') + '::/64';
}

// status: 'ok' | 'limited' (flooding) | 'capped' (too many new voters from this network today)
export async function castVote(voter, pick, ip) {
  const url = process.env.UPSTASH_REDIS_REST_URL, token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    // Serverless instances don't share memory: a per-instance tally in production would be silently wrong.
    if (process.env.NODE_ENV === 'production') throw new Error('ballot box not configured');
    // ponytail: dev-only box, no abuse limits.
    const old = mem.voters.get(voter);
    if (old !== pick) {
      if (old) mem.tally[old] = (mem.tally[old] || 0) - 1;
      mem.tally[pick] = (mem.tally[pick] || 0) + 1;
      mem.voters.set(voter, pick);
    }
    return { status: 'ok', tallies: toTally(Object.entries(mem.tally).flat()) };
  }
  // Keyed hash: limit keys never hold a raw IP, and they expire with their window.
  const net = createHmac('sha256', token).update(netKey(ip)).digest('base64url').slice(0, 16);
  const res = await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify([
      ['EVAL', CAST, 4, 'air:tally', 'air:voters', 'air:rate:' + net, 'air:fresh:' + net, voter, pick, LIMITS.rate, LIMITS.rateWindow, LIMITS.fresh, LIMITS.freshWindow],
      ['HGETALL', 'air:tally'],
    ]),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('ballot box ' + res.status);
  const out = await res.json();
  if (out.some((r) => r.error)) throw new Error(out.find((r) => r.error).error);
  const code = Number(out[0].result);
  return { status: code === -1 ? 'limited' : code === -2 ? 'capped' : 'ok', tallies: toTally(out[1].result) };
}
