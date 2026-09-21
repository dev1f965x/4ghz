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
- Event data is refreshed from a published feed on launch and every six hours, and can
  be refreshed by hand. A failed fetch retries three times with growing delays, then waits
  for the next cycle.
- The last good feed is cached, so the window still shows the last known schedule with no
  network, alongside when it was fetched.
- The app checks for a newer release on launch and every six hours, and installs it in place
  when asked. Releases are signed; an update that fails the signature check is refused.

## Acceptance criteria

- Opening the app shows every upcoming event of the three games, soonest first.
- An event starting today reads as today, not as "in 0 days".
- An event that has started but not ended reads as running.
- An event announced without an end, such as a livestream, stays listed as running for
  two hours after it starts, then drops off.
- With the network unplugged, the last fetched schedule is still shown, with the time
  it was fetched.
- An event published to the feed appears within six hours, or immediately after a manual
  refresh.
- On a first run with no network and no cache, the window explains that the schedule could
  not be fetched and offers to retry, rather than showing an empty list.
- A published release reaches an installed copy without a manual download.

## Interface language

Korean, with every user-facing string kept in one place so a second language can be added
without touching components. English follows once the feed covers global announcement
times.

## Non-functional requirements

- The window is usable with the keyboard alone, and the countdown is announced to screen
  readers as text, not as color.
- Cold start to a readable list is under two seconds on the cached path.
- Nothing about the player is collected, stored, or sent. The app makes two kinds of request,
  both reads from GitHub: the schedule feed, and the release manifest with the installer
  it points to. GitHub sees the address a request comes from, as any server would; the
  developer sees nothing.

## Out of scope for 1.0.0

Desktop notifications, redeem codes, daily quest calendars, streaks, account linking, and
a Discord bot or webhook. Each lands in a later version:

| Version | Adds |
|---|---|
| 1.0.0 | Official event countdowns |
| 1.1.0 | Notifications before an event, redeem codes |
| 1.2.0 | Daily quests, dailies, streaks |

A Discord bot or webhook may publish the same feed later, which is why the feed is a
separate artifact rather than something baked into the app.

## Non-users

This is not a wiki, a damage calculator, or an account dashboard. It does not log in
to HoYoverse accounts, and it never asks for credentials.
