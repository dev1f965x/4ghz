# 4GHz — product definition

## Problem

Genshin Impact, Honkai: Star Rail, and Zenless Zone Zero each announce their own
livestreams, version updates, and events. Dates live on three different sites and
community posts, so players either miss them or keep a calendar by hand.

## Who it is for

A player of two or three of these games who wants one place that answers
"what is coming up, and how many days away is it".

## 1.0.0 scope

Upcoming official events for the three games, sorted by how soon they happen, each
with a countdown.

- An event has a game, a title, a kind (livestream, version update, maintenance,
  in-game event), a start instant, and an optional end instant.
- The list shows how many days remain, marks what happens today, and separates what
  is already running from what has not started.
- Event data is refreshed from a published feed and cached, so the window still shows
  the last known schedule with no network.
- A desktop notification fires for events that start within a day.

## Acceptance criteria

- Opening the app shows every upcoming event of the three games, soonest first.
- An event starting today reads as today, not as "in 0 days".
- An event that has started but not ended reads as running.
- With the network unplugged, the last fetched schedule is still shown, with the time
  it was fetched.
- A schedule published to the feed appears in the app within one refresh cycle.
- Notifications can be turned off, and turning them off silences them immediately.

## Out of scope for 1.0.0

Redeem codes, daily quest calendars, streaks, account linking, and a Discord bot or
webhook. Each lands in a later version:

| Version | Adds |
|---|---|
| 1.0.0 | Official event countdowns |
| 1.1.0 | Redeem codes |
| 1.2.0 | Daily quests, dailies, streaks |

A Discord bot or webhook may publish the same feed later, which is why the feed is a
separate artifact rather than something baked into the app.

## Non-users

This is not a wiki, a damage calculator, or an account dashboard. It does not log in
to HoYoverse accounts, and it never asks for credentials.
