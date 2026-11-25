import { NextResponse } from 'next/server';
import { checkBotId } from 'botid/server';
import { OPTION_IDS, castVote, getTally } from '@/lib/store';

// Public tally for the nav counter. CDN-cached for 10s so page views don't each cost a Redis command.
export async function GET() {
  try {
    return NextResponse.json({ tallies: await getTally() }, { headers: { 'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=60' } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'ballot box unavailable' }, { status: 503 });
  }
}

const deny = (status, error, headers) => NextResponse.json({ error }, { status, headers });

export async function POST(req) {
  // Another site can't send application/json here without a CORS preflight we never answer, and the
  // Origin check covers the rest: no page elsewhere can use its visitors' browsers (and IPs) to vote.
  const origin = req.headers.get('origin');
  const sameSite = !origin || (URL.canParse(origin) && new URL(origin).host === req.headers.get('host'));
  if (!sameSite || !req.headers.get('content-type')?.startsWith('application/json')) return deny(403, 'forbidden');

  // Invisible challenge; only enforced on Vercel deployments (dev and other hosts get a human verdict).
  try {
    if ((await checkBotId({ developmentOptions: { isDevelopment: !process.env.VERCEL } })).isBot) return deny(403, 'forbidden');
  } catch (e) {
    console.error('botid', e); // fail open: the per-network limits in the store still bound abuse
  }

  let body;
  try { body = await req.json(); } catch { return deny(400, 'bad json'); }
  const { voter, pick } = body ?? {};
  if (typeof voter !== 'string' || !/^[0-9a-f-]{36}$/i.test(voter) || !OPTION_IDS.includes(pick)) return deny(400, 'invalid ballot');

  // Vercel sets these itself, overwriting anything the client sent. On another host, only trust them
  // behind a proxy that does the same, or anyone can claim any IP and dodge the limits.
  const ip = req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';

  try {
    const { status, tallies } = await castVote(voter, pick, ip);
    if (status === 'limited') return deny(429, 'slow down', { 'Retry-After': '60' });
    // Over the new-voter cap: not counted, but the tally is public, so still show it.
    return NextResponse.json({ tallies, counted: status === 'ok' }, { status: status === 'ok' ? 200 : 429 });
  } catch (e) {
    console.error(e);
    return deny(503, 'ballot box unavailable');
  }
}
