# 8. Ship updates through the Tauri updater

Status: accepted
Date: 2026-09-20

## Context

The app is installed once and then forgotten. A fix to the countdown or to feed parsing
has to reach players who will never visit the releases page. Feed content already updates
without a release; the binary does not.

## Options

- **Tell people to download the new installer.** No moving parts, and almost nobody does
  it. A parsing bug would live on every installed copy forever.
- **Package through a store.** Automatic updates, plus review queues, developer fees, and
  an account. Too much for a three-game countdown.
- **Tauri's updater plugin.** The app checks a signed manifest, downloads in the
  background, and applies on restart. Updates must be signed with a key kept out of the
  repository.

## Decision

Use the updater plugin. The release workflow publishes `latest.json` and signed artifacts
to the GitHub release; the app checks it on launch and installs on the next restart, with
an opt-out in settings.

## Consequences

A signing key now has to exist and survive. Losing it means published installs can no
longer update and have to be reinstalled by hand, so the key lives beside the other
release keys and is backed up. Code signing certificates for the Windows installer are a
separate, paid concern and are not bought yet: SmartScreen will warn on first install
until that changes, which the README says plainly.
