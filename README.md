# whowillwinairace.com

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

Known ceiling: voter ids are client-generated, so a determined person can stuff the box.
Add IP rate limiting or auth if the numbers ever matter.
