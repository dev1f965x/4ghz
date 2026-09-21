# 11. Publish redeem codes in the feed

Status: accepted
Date: 2026-09-21

## Context

Redeem codes are published by HoYoverse in livestreams and posts, expire within days to
weeks, and have no official API. ADR 9 already settled that the schedule is curated by
hand; codes are the same kind of data, arriving the same way.

## Options

- **A second file, `codes.json`.** A clean name, but a second fetch, cache, and schema.
- **A `codes` array in the existing feed.** One fetch and one cache; the file keeps the
  name `events.json`.

## Decision

Codes are an optional `codes` array in the existing feed, and `schemaVersion` moves to
`1.1`. The parser ignores fields it does not know (ADR 4), so 1.0.0 copies keep reading
events and never see codes.

Opening a redemption page needs the opener plugin, removed in 1.0.0 because nothing used
it. It returns scoped to the three official redemption hosts, so the app still cannot open
any other address.

## Consequences

- An editor adds a code exactly the way they add an event.
- The file name no longer describes everything in it; `docs/feed.md` says so.
- A malformed code fails CI like a malformed event, so it never reaches an installed app.
