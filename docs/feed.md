# Editing the schedule

Events and redeem codes live in [`feed/events.json`](../feed/events.json). Merging a change to `main`
publishes the file to <https://dev1f965x.github.io/4ghz/events.json>, which every
installed app fetches on launch and every six hours.

## Adding an event

1. Add an entry to `events`:

   ```json
   {
     "id": "genshin-7-2-livestream",
     "game": "genshin",
     "kind": "livestream",
     "title": "7.2 버전 특별 방송",
     "startsAt": "2026-11-01T11:00:00Z",
     "url": "https://genshin.hoyoverse.com/ko-kr/news",
     "note": "From the official announcement"
   }
   ```

2. Bump `publishedAt` to the current UTC time. The app shows it as the age of the
   schedule.
3. Run `npm run feed:validate`, then open a pull request. CI runs the same check.

## The fields

| Field | Required | Meaning |
|---|---|---|
| `id` | yes | Stable and unique. Changing it makes a new event; keep it when a date moves. |
| `game` | yes | `genshin`, `starrail`, or `zenless`. |
| `kind` | yes | `livestream`, `version`, `maintenance`, or `ingame`. |
| `title` | yes | Shown as written, in Korean. |
| `startsAt` | yes | UTC instant ending in `Z`. |
| `endsAt` | no | UTC instant. Without it an event drops off the list two hours after it starts, which suits a livestream. |
| `url` | no | Official announcement. |
| `note` | no | For editors. The app ignores it. |

## Adding a redeem code

Codes go in the same file, under `codes` (ADR 11):

```json
{
  "code": "GENSHINGIFT",
  "game": "genshin",
  "rewards": "원석 50, 대영웅의 경험 3",
  "addedAt": "2026-09-21T00:00:00Z",
  "expiresAt": "2026-09-30T15:59:00Z",
  "source": "https://genshin.hoyoverse.com/ko/news"
}
```

| Field | Required | Meaning |
|---|---|---|
| `code` | yes | Letters and digits, exactly as announced. |
| `game` | yes | `genshin`, `starrail`, or `zenless`. The same code may appear once per game. |
| `rewards` | yes | Shown as written, in Korean. |
| `addedAt` | yes | When it went into the feed. The app lists the newest first. |
| `expiresAt` | no | UTC instant. The app hides the code after it. Leave it out only for codes that never expire. |
| `source` | no | Where it was announced. For editors. |
| `note` | no | For editors. The app ignores it. |

Livestream codes usually expire within a day or two; when the announcement gives no time,
check a second source before publishing rather than guessing.

## Times

Announcements are given in the game's own zone; the feed stores the instant in UTC.
A version update that a site lists as 11:00 (UTC+8) is `03:00:00Z` on that date, and the
app renders it in whatever zone the player's computer is set to.

Prefer the official announcement over an aggregator, and record which one in `note` when
the two disagree.

## Removing an event

Delete the entry once it is over. Nothing prunes the file automatically, and an event
with an `endsAt` in the past is already hidden in the app — the file is just easier to
read without it.
