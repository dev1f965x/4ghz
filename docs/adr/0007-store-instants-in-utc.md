# 7. Store instants in UTC and render in the viewer's zone

Status: accepted
Date: 2026-09-20

## Context

A livestream announced as 19:00 UTC+8 is 20:00 in Seoul, and the countdown has to agree
with the player's wall clock. Game servers also reset on their own schedule, which later
versions will need. Dates that travel as "2026-10-02 19:00" with no zone are the usual
source of off-by-one-day bugs.

## Options

- **Store local wall-clock strings.** Reads naturally in the feed file and breaks as soon
  as the reader is in another zone.
- **Store an offset per event.** Correct, but every consumer repeats the same conversion,
  and daylight saving turns a fixed offset into a wrong one.
- **Store an instant in UTC.** One unambiguous point in time, converted once at render.

## Decision

Feed entries carry an ISO 8601 instant in UTC (`2026-10-02T11:00:00Z`). The app converts
to the operating system's zone for display, and countdowns are computed from calendar days
in that same zone, so "today" means the viewer's today.

## Consequences

The feed is slightly less readable to a human editor, which the schema check and a comment
field offset. Game-server reset times, which are zone-bound rather than instants, will get
their own representation when dailies arrive, and that decision gets its own record.
