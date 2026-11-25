# Changelog

Each `## vX.Y.Z` section becomes that version's GitHub release notes.

## v1.0.0

First public release of whowillwintheairace.com. The winner has already been chosen.

- Sealed-envelope prediction flow: ballot, wax seal, secure feed, classified final report
- Live public tally in the results appendix and a running "opinions on file" counter in the nav
- Shareable 1200×675 prediction record with native share, download and an X post link
- Several roasts and record variants per contender
- Ballot box on Upstash Redis: one vote per browser, and a changed vote moves instead of counting twice
- Abuse protection: Vercel BotID, same-origin checks, per-network rate and new-voter limits
- Accessibility: real form controls, full keyboard path, reduced motion, 4.5:1 text contrast
- Vercel Web Analytics, wax-seal favicon and link-preview card
