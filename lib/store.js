// The ballot box. One ballot per voter id; casting again replaces the previous pick.
// Production: Upstash Redis over REST (set UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN).
// Without those, falls back to process memory so `npm run dev` just works (resets on restart).

export const OPTION_IDS = ['openai', 'anthropic', 'google', 'xai', 'meta'];

// Atomic: undo the voter's old pick (if any), count the new one, remember it.
const CAST = `
local old = redis.call('HGET', KEYS[2], ARGV[1])
if old == ARGV[2] then return 0 end
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

export async function castVote(voter, pick) {
  const url = process.env.UPSTASH_REDIS_REST_URL, token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    // ponytail: in-memory fallback is single-process; set the Upstash env vars for a real shared tally.
    const old = mem.voters.get(voter);
    if (old !== pick) {
      if (old) mem.tally[old] = (mem.tally[old] || 0) - 1;
      mem.tally[pick] = (mem.tally[pick] || 0) + 1;
      mem.voters.set(voter, pick);
    }
    return toTally(Object.entries(mem.tally).flat());
  }
  const res = await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify([['EVAL', CAST, 2, 'air:tally', 'air:voters', voter, pick], ['HGETALL', 'air:tally']]),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('ballot box ' + res.status);
  const out = await res.json();
  if (out.some((r) => r.error)) throw new Error(out.find((r) => r.error).error);
  return toTally(out[1].result);
}
