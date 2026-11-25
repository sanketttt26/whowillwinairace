# whowillwinairace.com

> the winner has already been chosen.

A satirical one-page site about the AI race. Visitors mark a prediction on an official ballot, seal it in an envelope, and watch a classified "final report" reveal the real winner (spoiler: it's them, at $20 a month). Their vote then joins a live public tally.

**Live:** https://whowillwintheairace.com

## What it does

- **Ballot and sealed envelope.** Pick one of five contenders, then seal it with the button or by swiping across the envelope on a phone. A short "secure feed" plays, the wax seal breaks, and the report unfolds.
- **Shareable record.** "Share the truth" draws a 1200×675 prediction record in the browser (sized for X). It uses the native share sheet where available and offers a download and an X post link otherwise.
- **Live public tally.** Every sealed prediction is a vote. The results appendix shows the split, and the nav shows the running total ("1,284 OPINIONS ON FILE").
- **Small easter eggs.** Click the CONFIDENTIAL stamp a few times, hover the document number, or unredact the footer memo.
- **Accessible as drawn.** Real radio buttons and buttons, full keyboard path (focus moves to the report on reveal), visible focus rings, reduced-motion support, and text contrast of at least 4.5:1.

## Stack

| | |
|---|---|
| Framework | Next.js (App Router), React, plain JavaScript |
| Styling | One global stylesheet (`app/globals.css`) plus inline styles carried over from the design |
| Fonts | IBM Plex Mono, IBM Plex Sans and Instrument Serif via `next/font` |
| Votes | Upstash Redis over its REST API (plain `fetch`, no SDK) |
| Hosting | Vercel |

No other runtime dependencies.

## Run it locally

Requires Node 20 or newer.

```bash
npm install
npm run dev
```

Open http://localhost:3000. Without any environment variables, votes are kept in server memory and reset when the dev server restarts, which is fine for local work.

## Environment variables

| Name | Required | Purpose |
|---|---|---|
| `UPSTASH_REDIS_REST_URL` | In production | REST URL of the Upstash Redis database |
| `UPSTASH_REDIS_REST_TOKEN` | In production | REST token for that database |

Copy `.env.example` to `.env.local` to use a real database locally. Upstash's free plan (500K commands a month) comfortably covers this site: a vote uses about two commands, and the nav counter is cached for 10 seconds at the CDN.

Without these variables in production, each serverless instance keeps its own in-memory count, so the tally will not be shared.

## Voting API

**`POST /api/vote`** with body `{ "voter": "<uuid>", "pick": "<id>" }`

- `pick` is one of `openai`, `anthropic`, `google`, `xai`, `meta`.
- `voter` is a UUID the browser creates once and keeps in localStorage.
- One ballot per voter: voting again moves the vote to the new pick instead of counting twice. This happens atomically in a small Lua script.
- Returns `{ "tallies": { "openai": 12, ... } }`, or `400` for an invalid ballot and `503` if the database is unreachable.

**`GET /api/vote`** returns the same `{ tallies }` and is cached at the CDN for 10 seconds.

If the ballot box is unreachable, the page still completes the reveal, shows only the visitor's own vote, and says so. The nav counter is hidden rather than showing a wrong number.

**Known limit:** voter ids are created in the browser, so someone determined could stuff the box. Add rate limiting or sign-in if the numbers ever need to be trustworthy.

## Project layout

```
app/
  layout.jsx              fonts, page metadata, link previews
  page.jsx                the whole experience (one client component)
  globals.css             styles and animations
  opengraph-image.png     1200×630 link-preview card
  api/vote/route.js       GET and POST for the ballot box
lib/
  store.js                Redis (or in-memory) vote storage
  site.js                 the deployed site URL
.claude/skills/           design-review skills used on this codebase
.github/workflows/        release automation
```

## Deploying

The Vercel project is connected to this repository, so every push to `main` deploys to production and every other branch gets a preview URL. Set the two Upstash variables in the Vercel project before the first production deploy.

The deployed domain is set in `lib/site.js`. It drives link previews and share links, so update it if the domain changes.

## Releases

Versions follow [semantic versioning](https://semver.org) and live in `package.json`. To publish a release:

```bash
git tag -a v1.1.0 -m "Release notes go here"
git push origin v1.1.0
```

The Release workflow then creates the GitHub release, using the tag message followed by GitHub's generated list of merged pull requests.

## Design review skills

`.claude/skills/` holds three skills for Claude Code, pinned in `skills-lock.json`:

- `web-design-guidelines` (Vercel): checks UI code against interface guidelines.
- `impeccable`: design audits, critique and refinement commands.
- `ui-taste` (Uizze): UI quality playbooks.

Ask Claude Code to "audit the UI" or "review my UI" to run them.

## Disclaimer

Satire. Every joke on the site is fiction, not a factual claim, and the site is not affiliated with any company named.
