# whowillwintheairace.com

> the winner has already been chosen.

A satirical one-page site about the AI race. Visitors mark a prediction on an official ballot, seal it in an envelope, and watch a classified "final report" reveal the real winner (spoiler: it's them, at $20 a month). Their vote then joins a live public tally.

**Live:** https://www.whowillwintheairace.com

## What it does

- **Ballot and sealed envelope.** Pick one of five contenders, then seal it with the button or by swiping across the envelope on a phone. A short "secure feed" plays, the wax seal breaks, and the report unfolds.
- **A verdict for your pick.** Each contender has several roasts, and the prediction record has several reason/status variants, so repeat visits read differently.
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
| Bot protection | Vercel BotID |
| Analytics | Vercel Web Analytics |
| Hosting | Vercel |

## Run it locally

Requires Node 20 or newer.

```bash
npm install
npm run dev
```

Open http://localhost:3000. Without any environment variables, the dev server keeps votes in memory (reset on restart) and skips the abuse limits, which is fine for local work.

`npm test` runs the unit tests (the IPv6 network-prefix logic).

## Environment variables

| Name | Required | Purpose |
|---|---|---|
| `UPSTASH_REDIS_REST_URL` | In production | REST URL of the Upstash Redis database |
| `UPSTASH_REDIS_REST_TOKEN` | In production | REST token for that database (also keys the hash of each voter's network) |

Copy `.env.example` to `.env.local` to use a real database locally. Upstash's free plan (500K commands a month) comfortably covers this site: a vote is one request, and the nav counter is cached for 10 seconds at the CDN.

In production, the ballot box refuses to run without these variables and returns 503, rather than keeping a separate, silently wrong count in each serverless instance.

## Voting API

**`POST /api/vote`** with body `{ "voter": "<uuid>", "pick": "<id>" }`

- `pick` is one of `openai`, `anthropic`, `google`, `xai`, `meta`.
- `voter` is a UUID the browser creates once and keeps in localStorage.
- One ballot per voter: voting again moves the vote to the new pick instead of counting twice.
- Returns `{ "tallies": { "openai": 12, ... }, "counted": true }`.
- Errors: `400` invalid ballot, `403` cross-site request or bot, `429` rate limited (or, with a tally and `counted: false`, the network is over its daily new-voter cap), `503` database unreachable.

**`GET /api/vote`** returns `{ tallies }` for the nav counter and is cached at the CDN for 10 seconds.

If the ballot box is unreachable, the page still completes the reveal, shows only the visitor's own vote, and says so. The nav counter is hidden rather than showing a wrong number.

### Abuse protection

- **Bots:** Vercel BotID (an invisible challenge) guards `POST /api/vote`. It is enforced only on Vercel deployments. Turn on Deep Analysis under Firewall in the Vercel dashboard to catch headless-browser bots.
- **Cross-site voting:** only same-origin `application/json` requests are accepted.
- **Per network** (an IPv4 address or an IPv6 /64), checked in the same atomic Redis script as the vote: 10 requests a minute and 20 new voter ids a day. Over the daily cap the ballot isn't counted, but the tally is still returned (HTTP 429). Limit keys store a keyed hash of the network, never the raw IP, and expire with their window. Tune `LIMITS` in `lib/store.js`.

**Ceiling:** this is one vote per browser, bounded per network, not one per person; that would need sign-in. Someone with many residential IPs and a real browser can still add votes, slowly and at a cost.

## Project layout

```
app/
  layout.jsx                fonts, page metadata, link previews, analytics
  page.jsx                  the whole experience (one client component)
  globals.css               styles and animations
  opengraph-image.png       1200×630 link-preview card
  icon.png, apple-icon.png  wax-seal favicon
  api/vote/route.js         GET and POST for the ballot box
lib/
  store.js                  Redis (or dev in-memory) vote storage and abuse limits
  store.test.mjs            tests for the network-prefix logic
  site.js                   the canonical site URL
instrumentation-client.js   BotID client setup
next.config.mjs             BotID Next.js integration
.claude/skills/             design-review skills used on this codebase
.github/workflows/          release automation (see Releases)
CHANGELOG.md                release notes per version
```

## Deploying

The Vercel project is connected to this repository, so every push to `main` deploys to production and every other branch gets a preview URL. Set the two Upstash variables in the Vercel project before the first production deploy.

The canonical URL is set in `lib/site.js`. It drives link previews and share links, so update it if the domain changes.

## Releases

Versions follow [semantic versioning](https://semver.org). To publish a release:

1. Bump `version` in `package.json`.
2. Add a `## vX.Y.Z` section at the top of `CHANGELOG.md` with the release notes.
3. Merge to `main`.

The Release workflow sees a version that hasn't been released yet and publishes the GitHub release (tag `vX.Y.Z`), using the changelog section followed by GitHub's generated list of merged pull requests. Pushes that don't change the version do nothing.

## Design review skills

`.claude/skills/` holds three skills for Claude Code, pinned in `skills-lock.json`:

- `web-design-guidelines` (Vercel): checks UI code against interface guidelines.
- `impeccable`: design audits, critique and refinement commands.
- `ui-taste` (Uizze): UI quality playbooks.

Ask Claude Code to "audit the UI" or "review my UI" to run them.

## Disclaimer

Satire. Every joke on the site is fiction, not a factual claim, and the site is not affiliated with any company named.
