# 4. Publish events as a versioned JSON feed

Status: accepted
Date: 2026-09-20

## Context

Event dates come from official announcements. They change, and they arrive between app
releases. The app must not require a new installer every time a livestream is scheduled.

## Options

- **Scrape official sites.** No manual upkeep, but layouts change without warning, terms
  of service restrict automated access, and a broken scraper silently shows nothing.
- **Enter events inside the app.** Full control and no network, but every device keeps
  its own copy and nothing is shared with a future Discord bot.
- **A JSON feed published from this repository.** Events live in version control, get
  reviewed like code, and are served as a static file the app fetches and caches.

## Decision

Events live in `feed/events.json` in this repository, validated in CI against a JSON
Schema, and published to GitHub Pages by a workflow on every push to `main`. The app
fetches that URL on a schedule and caches the last good copy.

The document carries a `schemaVersion`. The app reads a feed whose major version it
knows and refuses one it does not, telling the player to update instead of failing to
parse.

GitHub Pages rather than `raw.githubusercontent.com`: raw serves with a fixed five
minute cache and an unauthenticated rate limit shared across the whole host, and its URL
is tied to the branch name. Pages puts the file behind a CDN, answers conditional
requests with ETags, and keeps the URL stable if the layout changes.

## Consequences

Publishing now depends on a workflow, so a broken deploy means a stale feed rather than a
broken app: clients keep their cache. Adding an event is a pull request, which is slower than typing into a window but leaves a
history and a review. The same file can later feed a Discord bot or a website without
either owning the data. If the feed is unreachable, the app shows the cached copy and
says when it was fetched.
