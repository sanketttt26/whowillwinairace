import { NextResponse } from 'next/server';
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

export async function POST(req) {
  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }); }
  const { voter, pick } = body ?? {};
  if (typeof voter !== 'string' || !/^[0-9a-f-]{36}$/i.test(voter) || !OPTION_IDS.includes(pick)) {
    return NextResponse.json({ error: 'invalid ballot' }, { status: 400 });
  }
  try {
    return NextResponse.json({ tallies: await castVote(voter, pick) });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'ballot box unavailable' }, { status: 503 });
  }
}
