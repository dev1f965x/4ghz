# 14. Publish dailies in the feed

Status: accepted
Date: 2026-09-22

## Context

1.1.0 built each game's daily chores into the app. Games add, rename, and retire dailies
with version updates, and a list compiled into the installer only changes with a release.
Events and codes already reach every copy through the feed (ADR 4, ADR 11).

## Options

- **Keep them in the build.** A release for every change to a two-line list.
- **A `dailies` object in the feed.** The same fetch, cache, review, and validation as
  events and codes.

## Decision

Chores are a `dailies` object in the feed with one list per game, and `schemaVersion`
moves to `1.2`. A chore has a stable `id`, a `title`, and optionally the first (`from`)
and last (`until`) game day it is due. A chore is retired by setting `until`, never by
deleting it, so a past day is always judged by the chores that were due on it.

The build carries the `dailies` of `feed/events.json` as it was at build time, and uses
them before the first fetch and with any feed that has none, such as a cache written by
1.1.0.

## Consequences

- A game update that changes its dailies is a feed edit, live within six hours.
- The ids 1.1.0 recorded checks under are the ids the feed publishes, so no check is lost.
- Streaks survive a chore being added or retired, because each day is judged on its own
  list.
- 1.1.0 copies ignore `dailies` and keep their built-in list.
- A chore's id can never be reused for something else; `docs/feed.md` says so.
