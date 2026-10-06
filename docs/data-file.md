# Editing the data file

The app shows schedules, redeem codes, and chores from `data/v1.json`. Edit that file in a pull request; CI checks it against the schema, and after the merge the "Publish data" workflow puts it on GitHub Pages. Running apps pick up the change within about 40 minutes (a 30-minute refresh plus GitHub Pages caching).

On every edit, set `updatedAt` to the current time (ISO 8601 with an offset, such as `2026-10-06T09:30:00+09:00`); the app shows it as the data's update time.

Editors that understand JSON Schema (such as VS Code) check the file as you type, through the `$schema` line at the top. `pnpm test` runs the full check, including the rules the editor cannot check:

- valid times (real dates, an offset on every instant) and an end after the start on every server;
- unique ids, and unique codes ignoring case;
- periods that belong to a periodic chore and do not overlap;
- links on the allowed sites.

## Text

Every name and title is `{ "ko": "...", "en": "..." }`. Korean is required; English is optional, and the English UI shows the Korean text when it is missing. Write in your own words, following [CONTENT.md](../CONTENT.md): no copied announcement text.

## Times

Each time says which clock it uses:

| Kind | Format | Meaning | Use for |
| --- | --- | --- | --- |
| `instant` | `2026-11-04T06:00:00+08:00` | One moment everywhere. The offset is required. | Livestreams, updates, maintenance; events that end at a global maintenance |
| `server` | `2026-11-04T04:00` | That clock time on each server, so it happens at different moments in Asia, Europe, and America. | Events, endgame modes, periods of periodic chores |

| Field | Allowed kinds |
| --- | --- |
| Livestream, update, maintenance: `start`, `end` | `instant` |
| Event: `start`, `end` | `instant` or `server` |
| Endgame: `start`, `end` | `server` |
| Code: `expires` | `instant` or `server` |
| Period: `start`, `end` | `server` |

Schedule entries (usually upcoming livestreams and updates) can be added before they are announced, worked out from the usual cycle, with `"estimated": true`. The Schedule tab labels them "예상" (estimated). When the official date is out, correct the time and remove the flag. Never add an estimate without the flag.

Intervals include the start and exclude the end: a period from `2026-10-16T04:00` to `2026-11-16T04:00` is over at 04:00 on Nov 16, and the next period can start at exactly that time. An entry without `end` leaves the Schedule list 3 hours after it starts.

## Ids

- Ids use lowercase letters, digits, and hyphens, and are unique within a game.
- A chore id is permanent. Never reuse or rename one: the app keeps check history by id, and a new id counts as a new chore from its next cycle.
- Codes use letters and digits only and are unique per game, ignoring case. `addedAt` (ISO 8601 with an offset) sets the newest-first order.
- A period's `choreId` names a chore whose `cycle` is `periodic`.

## Links

`url` is optional and must be a plain `https` link on an official site: `hoyoverse.com` or `hoyolab.com`, including their subdomains, with no port or user name.

## Compatibility

Adding a new optional field keeps `v1`. Anything else (a new game, entry type, cycle, or time kind, a new required field, or a changed meaning) needs `data/v2.json`; see the [Design Doc](https://dev1f965x.atlassian.net/wiki/spaces/GHZ/pages/1867975), "Validation and compatibility". When `v1` is no longer maintained, replace it with:

```json
{ "schemaVersion": 1, "retired": true, "updatedAt": "2027-01-01T00:00:00+09:00" }
```
