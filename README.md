# 4GHz

Countdowns to official Genshin Impact, Honkai: Star Rail, and Zenless Zone Zero events,
in one desktop window. (*for GHZ* — **G**enshin, **H**onkai, **Z**enless.)

[![CI](https://github.com/dev1f965x/4ghz/actions/workflows/ci.yml/badge.svg)](https://github.com/dev1f965x/4ghz/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/dev1f965x/4ghz?display_name=tag)](https://github.com/dev1f965x/4ghz/releases)
![Tauri 2](https://img.shields.io/badge/Tauri-2-24C8DB?logo=tauri&logoColor=white)
![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)
![Rust](https://img.shields.io/badge/Rust-stable-DEA584?logo=rust&logoColor=white)

## Install

Grab `4GHz_x.y.z_x64-setup.exe` from [Releases](https://github.com/dev1f965x/4ghz/releases).
Unsigned, so SmartScreen asks once: **More info** → **Run anyway**.

## How it works

- Dates live in [`feed/events.json`](feed/events.json), reviewed like code and served from
  GitHub Pages. Nothing is scraped.
- The app fetches on launch and every six hours, caches the last good copy, and falls back
  to it offline.
- No account, no telemetry, one outbound request. The window is 2.6 MB installed.

## Develop

```bash
npm ci
npm run tauri dev
```

| Command | Checks |
|---|---|
| `npm run lint` | Biome, format and lint |
| `npm run typecheck` | TypeScript |
| `npm run test` | Vitest |
| `npm run feed:validate` | feed against its JSON Schema |
| `npm run check:tauri` | crate and npm plugin versions agree |

Rust side, in `src-tauri`: `cargo fmt --check`, `cargo clippy`, `cargo test`.

## Docs

- [Product definition](docs/product.md) — scope and acceptance criteria
- [Editing the schedule](docs/feed.md) — how an event gets published
- [ADR](docs/adr) — why it is built this way

[MIT](./LICENSE)
