# 4GHz

[English](./README.md) | [한국어](./README.ko.md)

Desktop app that counts down to official Genshin Impact, Honkai: Star Rail, and Zenless
Zone Zero events — livestreams, version updates, and in-game events — in one window.

The name reads as *for GHZ*: **G**enshin, **H**onkai, **Z**enless.

> Work in progress. Nothing is released yet; see [the product definition](docs/product.md)
> for what 1.0.0 covers.

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

> The published feed does not exist yet; release builds wait on the deploy workflow in
> issue #11. Development reads `feed/events.sample.json` instead.

## How it is put together

Event dates are not scraped. They live in `feed/events.json`, are reviewed like code, and
are published as a static file the app fetches and caches, so a new schedule needs no new
installer. Decisions like this one are recorded in [docs/adr](docs/adr).

## License

[MIT](./LICENSE)
