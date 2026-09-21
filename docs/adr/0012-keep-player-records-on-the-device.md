# 12. Keep the player's records on the device

Status: accepted
Date: 2026-09-21

## Context

1.1.0 is the first version that stores something the player entered: chores checked off,
codes marked as used, the games they play.

## Decision

Those records live in the app data folder through the store plugin, beside the feed cache,
and are never sent anywhere. There is no account and no sync.

## Consequences

- Nothing about the player leaves the machine, which keeps the privacy line in the product
  definition true without qualification.
- Records do not follow the player to a second computer. Sync would need an account, which
  the product rules out.
- Records are keyed by the day in the game's reset calendar, so a change of time zone does
  not reshuffle past days.
