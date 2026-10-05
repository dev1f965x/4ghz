# AGENTS.md

Guidance for coding agents working in this repository. Humans should start with [README.md](README.md).

## Project

An unofficial Windows app with schedules, redeem codes, and a chore calendar for Genshin Impact, Honkai: Star Rail, and Zenless Zone Zero. Product and design documents are in Confluence (space GHZ); work is tracked in Jira (GHZ).

## Setup

- Develop natively on Windows 11; there is no Dev Container. The prerequisites are listed in [README.md](README.md#development).
- Tool versions are pinned in the repository and matched in CI.

## Product rules

- The app never reads, changes, or automates the games, game files, or game accounts.
- No official logos, character icons, or artwork. Game names appear only as text.
- No telemetry and no personal data. The only network requests are the data file and the latest release check.

## Commands

The commands are listed in [README.md](README.md#development). Run every check (format and lint, type check, tests, build, end-to-end) before handing off any change. After a dependency change, run all of them even if the change looks unrelated.

## Structure

| Path | Contents |
| --- | --- |
| `src/` | React and TypeScript frontend; product logic lives here |
| `src-tauri/` | Rust core, Tauri configuration, capabilities, and icons |
| `design/` | Wireframes, visual direction tokens and checks, and the icon source; not shipped |
| `mise.toml`, `rust-toolchain.toml` | Pinned tool versions |

## Conventions

- Comments explain why, not what.

## Git and pull requests

- Branch: `<type>/GHZ-<n>-<short-description>`. Commits follow Conventional Commits and end with a `Refs: GHZ-<n>` paragraph.
- `main` changes only through squash-merged pull requests.
- Do not push, open pull requests, or merge; the maintainer does that.
- When the working tree is shared, use a separate `git worktree` and do not switch the checked-out branch.
- Before handing a change over, have it reviewed by a separate agent or review tool that did not write it.
