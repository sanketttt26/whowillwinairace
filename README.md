# whowillwintheairace.com

Next.js (App Router) build of the sealed-envelope design.

```bash
npm install
npm run dev
```

## Ballot box

`POST /api/vote` takes `{ voter, pick }` and returns the public tally. One ballot per browser
(`voter` is a UUID kept in localStorage); voting again replaces the earlier pick.

- **Production:** create a free Upstash Redis database and set `UPSTASH_REDIS_REST_URL` and
  `UPSTASH_REDIS_REST_TOKEN` (see `.env.example`). Works on Vercel as is.
- **Local dev:** with no env vars, votes live in process memory and reset on restart.

### Abuse protection

- **Bots:** Vercel BotID (invisible challenge) guards `POST /api/vote`. Enforced only on Vercel
  deployments; turn on Deep Analysis under Firewall in the Vercel dashboard for headless-browser bots.
- **Cross-site voting:** only same-origin `application/json` requests are accepted.
- **Per network** (IPv4 address or IPv6 /64), in the same atomic Redis script as the vote:
  10 requests/minute, and 20 new voter ids/day. Over the cap, the ballot isn't counted but the
  tally is still returned (HTTP 429). Limit keys store a keyed hash of the network, never the raw IP,
  and expire with their window. Tune `LIMITS` in `lib/store.js`.
- **Production without Upstash** returns 503 instead of a per-instance in-memory tally.

Ceiling: this is one vote per browser, bounded per network, not one per human. That needs sign-in.
Someone with many residential IPs and a real browser can still add votes, slowly and at a cost.

`npm test` runs the IP-prefix check.
