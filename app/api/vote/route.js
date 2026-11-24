import { NextResponse } from 'next/server';
import { OPTION_IDS, castVote } from '@/lib/store';

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
