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
- The countdown runs to the second: days when there are any, then hours, minutes, and seconds.
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

## 1.1.0 scope

Three tabs under the header — schedule, redeem codes, dailies — with browser-style back and
forward in the top left corner.

- **Navigation.** Switching tabs is recorded like page visits in a browser. Back and forward
  sit at the left end of the title bar, and also answer to `Alt+←`/`Alt+→` and a mouse's
  side buttons. The window opens on the schedule.
- **Redeem codes.** Active codes for the three games, newest first. Each shows its rewards
  and, when known, the day it expires. One button copies the code; another opens the game's
  official redemption page with the code filled in. A code can be marked as used, which is
  remembered on this device and moves it to the bottom. Codes are published through the same
  feed as the schedule.
- **Dailies.** A checklist of each game's daily chores for today, and a month calendar that
  shows which days were finished. Finishing every chore of a game on consecutive days builds
  a streak for that game. Days roll over at each game's daily reset, 04:00 server time (Asia
  server). Only the games the player picks are shown. Everything here is kept on this device.

### Acceptance criteria

- Back returns to the tab seen before; forward undoes a back. Opening a tab after going back
  drops the forward entries, as in a browser. Both buttons are disabled at the ends.
- A code past its expiry is not shown. A code published to the feed appears within six hours,
  or immediately after a manual refresh.
- Copying a code says so. The redemption button opens the official page in the default
  browser, and the app can open no other address.
- A chore checked before 05:00 KST counts for the previous day; one checked after counts for
  the new day.
- A streak counts back from today, or from yesterday while today is still unfinished, and
  breaks at the first day a chore was left undone.
- Checks, used codes, and the chosen games survive a restart and never leave the device.

## Interface language

Korean, with every user-facing string kept in one place so a second language can be added
without touching components. English follows once the feed covers global announcement
times.

## Non-functional requirements

- The window is usable with the keyboard alone, and the countdown is announced to screen
  readers as text, not as color.
- Cold start to a readable list is under two seconds on the cached path.
- Nothing about the player leaves the device. What they record — checked chores, used codes,
  the games they play — is stored locally and never sent. The app makes two kinds of request,
  both reads from GitHub: the feed, and the release manifest with the installer it points
  to. GitHub sees the address a request comes from, as any server would; the developer sees
  nothing. Opening a redemption page hands a URL to the default browser, and only a
  HoYoverse redemption page can be opened.

## Roadmap

Account linking and redeeming on the player's behalf are out of scope for good: both need
HoYoverse credentials. The rest lands in order:

| Version | Adds |
|---|---|
| 1.0.0 | Official event countdowns |
| 1.1.0 | Tabs with back and forward, redeem codes, dailies calendar and streaks |
| 1.2.0 | Notifications before an event |
| later | A Discord bot or webhook reading the same feed |

A Discord bot or webhook may publish the same feed later, which is why the feed is a
separate artifact rather than something baked into the app.

## Non-users

This is not a wiki, a damage calculator, or an account dashboard. It does not log in
to HoYoverse accounts, and it never asks for credentials.
