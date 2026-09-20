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

Events live in `feed/events.json` in this repository, validated in CI against a schema,
and published as a static file. The app fetches it on a schedule and caches the last good
copy.

## Consequences

Adding an event is a pull request, which is slower than typing into a window but leaves a
history and a review. The same file can later feed a Discord bot or a website without
either owning the data. If the feed is unreachable, the app shows the cached copy and
says when it was fetched.
