# 4GHz

[English](./README.md) | [한국어](./README.ko.md)

Desktop app that counts down to official Genshin Impact, Honkai: Star Rail, and Zenless
Zone Zero events — livestreams, version updates, and in-game events — in one window.

The name reads as *for GHZ*: **G**enshin, **H**onkai, **Z**enless.

## Install

Download the latest `4GHz_x.y.z_x64-setup.exe` from
[Releases](https://github.com/dev1f965x/4ghz/releases). The build is unsigned, so Windows
SmartScreen warns once: **More info** → **Run anyway**.

## Run it

Requires [Node.js](https://nodejs.org) 24+ and the [Rust toolchain](https://rustup.rs).

```bash
npm ci
npm run tauri dev
```

## Build an installer

```bash
npm run tauri build
```

The installer lands in `src-tauri/target/release/bundle`.

## Checks

```bash
npm run lint       # Biome, format and lint
npm run typecheck  # TypeScript
npm run test       # Vitest
```

Rust checks live in `src-tauri`: `cargo fmt --check`, `cargo clippy`, `cargo test`.

## How it is put together

Event dates are not scraped. They live in [`feed/events.json`](feed/events.json), are
reviewed like code, and are published to GitHub Pages as a static file the app fetches and
caches, so a new schedule needs no new installer. [docs/feed.md](docs/feed.md) is how an
entry is added; decisions like this one are recorded in [docs/adr](docs/adr).

## License

[MIT](./LICENSE)
