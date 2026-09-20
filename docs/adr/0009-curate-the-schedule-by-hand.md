# 9. Curate the schedule by hand

Status: accepted
Date: 2026-09-20

## Context

ADR 4 decided *where* the schedule is published. It left open *how* the entries get
there. Before writing an editor's workflow, the automatic routes were checked.

## What exists

- **Official APIs.** HoYoverse publishes no schedule API for Genshin Impact, Honkai:
  Star Rail, or Zenless Zone Zero. The announcement endpoints the games use for their
  in-game notice boards are undocumented, unversioned, and gated per client.
- **Community APIs.** `torikushiii/hoyoverse-api` (api.ennead.cc) exposes exactly the
  data this app wants. It is AGPL-3.0, and it works by scraping HoYoLAB, so using it
  moves someone else's terms-of-service risk and uptime into this app.
- **RSS or calendar feeds.** The official sites publish neither.

## Decision

An editor enters events in `feed/events.json` by hand, as a pull request. CI validates
the file against the schema; merging publishes it.

Three or four entries appear per game every six weeks, announced days in advance in a
livestream. That is minutes of work per version, against a scraper that breaks silently
and a licence that would pull this repository into AGPL.

## Consequences

- An event is only as timely as its editor. The feed carries `publishedAt` so the app
  can show how old the schedule is.
- Every entry is reviewed before it reaches installed apps, and every change has an
  author and a date in git history.
- The editing steps live in [docs/feed.md](../feed.md).
- Nothing here blocks automation later: a bot that opens the same pull request would
  need no change in the app.
