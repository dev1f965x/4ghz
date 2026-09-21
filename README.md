<a id="readme-top"></a>

[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![MIT License][license-shield]][license-url]

<br />
<div align="center">
  <a href="https://github.com/dev1f965x/4ghz">
    <img src="src-tauri/icons/128x128.png" alt="4ghz" width="80" height="80">
  </a>

  <h3 align="center">4GHz</h3>

  <p align="center">
    Countdowns to official Genshin Impact, Honkai: Star Rail, and Zenless Zone Zero events, in one desktop window.
    <br />
    <a href="docs/product.md">Explore the docs »</a>
    ·
    <a href="https://github.com/dev1f965x/4ghz/releases">Download</a>
    ·
    <a href="https://github.com/dev1f965x/4ghz/issues/new?labels=bug">Report Bug</a>
    ·
    <a href="https://github.com/dev1f965x/4ghz/issues/new?labels=feature">Request Feature</a>
  </p>
</div>

<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
      <ul>
        <li><a href="#built-with">Built With</a></li>
      </ul>
    </li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation">Installation</a></li>
      </ul>
    </li>
    <li><a href="#usage">Usage</a></li>
    <li><a href="#roadmap">Roadmap</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#disclaimer">Disclaimer</a></li>
    <li><a href="#contact">Contact</a></li>
    <li><a href="#acknowledgments">Acknowledgments</a></li>
  </ol>
</details>

## About The Project

Three games, three sites, three announcement feeds. 4GHz puts every upcoming livestream, version update, and in-game event in one window and counts the days down in your own time zone.

The name reads as *for GHZ*: **G**enshin, **H**onkai, **Z**enless.

- Upcoming events for the three games, soonest first, each with days remaining
- Running events are separated from the ones that have not started
- Fetches on launch, every six hours, and on demand; the last good schedule is cached for offline
- A window the app draws itself, and a walkthrough on first run
- Updates itself: a signed release is announced in the window and installed in place
- No account, no telemetry; it only ever reads the schedule and checks for a release, both on GitHub

Dates are not scraped. They live in [`feed/events.json`](https://github.com/dev1f965x/4ghz/blob/main/feed/events.json), are reviewed like code, and are published to GitHub Pages, so a new schedule needs no new installer.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

### Built With

[![Tauri](https://img.shields.io/badge/Tauri-24C8DB?style=for-the-badge&logo=tauri&logoColor=white)](https://tauri.app/)
[![Rust](https://img.shields.io/badge/Rust-000000?style=for-the-badge&logo=rust&logoColor=white)](https://www.rust-lang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vite.dev/)
[![Vitest](https://img.shields.io/badge/Vitest-6E9F18?style=for-the-badge&logo=vitest&logoColor=white)](https://vitest.dev/)
[![Biome](https://img.shields.io/badge/Biome-60A5FA?style=for-the-badge&logo=biome&logoColor=white)](https://biomejs.dev/)
[![GitHub Actions](https://img.shields.io/badge/GitHub%20Actions-2088FF?style=for-the-badge&logo=githubactions&logoColor=white)](https://docs.github.com/actions)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Getting Started

### Prerequisites

[Node.js](https://nodejs.org) 24+ and the [Rust toolchain](https://rustup.rs).

To run the app, nothing: the installer carries what it needs.

### Installation

Download `4GHz_x.y.z_x64-setup.exe` from [Releases](https://github.com/dev1f965x/4ghz/releases). The build is unsigned, so Windows SmartScreen warns once: **More info** → **Run anyway**.

From source:

```sh
git clone https://github.com/dev1f965x/4ghz.git
cd 4ghz
npm ci
npm run tauri dev
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Usage

```sh
npm run tauri build   # installer in src-tauri/target/release/bundle
```

| Command | Checks |
|---|---|
| `npm run lint` | Biome, format and lint |
| `npm run typecheck` | TypeScript |
| `npm run test` | Vitest |
| `npm run feed:validate` | the feed against its JSON Schema |
| `npm run check:tauri` | crate and npm plugin versions agree |

Rust side, in `src-tauri`: `cargo fmt --check`, `cargo clippy`, `cargo test`.

Adding an event to the published schedule is [docs/feed.md](https://github.com/dev1f965x/4ghz/blob/main/docs/feed.md). Cutting a release is [docs/release.md](https://github.com/dev1f965x/4ghz/blob/main/docs/release.md). Why it is built this way is in [docs/adr](https://github.com/dev1f965x/4ghz/tree/main/docs/adr).

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Roadmap

- [x] 1.0.0 — official event countdowns
- [x] 1.0.0 — updates itself from GitHub Releases
- [ ] 1.1.0 — notifications 24 hours and 1 hour before an event
- [ ] 1.1.0 — redeem codes
- [ ] 1.2.0 — daily quests and streaks

See the [open issues](https://github.com/dev1f965x/4ghz/issues) for the full list.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## License

Distributed under the MIT License. See [`LICENSE`](https://github.com/dev1f965x/4ghz/blob/main/LICENSE) for more information.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Disclaimer

Not affiliated with, endorsed by, or connected to HoYoverse. Genshin Impact, Honkai: Star Rail, and Zenless Zone Zero are trademarks of their respective owners. Dates are transcribed from public announcements and carry no guarantee.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Contact

[@dev1f965x](https://github.com/dev1f965x) — https://github.com/dev1f965x/4ghz

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Acknowledgments

- [OverlayScrollbars](https://kingsora.github.io/OverlayScrollbars/)
- [Shields.io](https://shields.io)
- [Best-README-Template](https://github.com/othneildrew/Best-README-Template)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

[contributors-shield]: https://img.shields.io/github/contributors/dev1f965x/4ghz.svg?style=for-the-badge
[contributors-url]: https://github.com/dev1f965x/4ghz/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/dev1f965x/4ghz.svg?style=for-the-badge
[forks-url]: https://github.com/dev1f965x/4ghz/network/members
[stars-shield]: https://img.shields.io/github/stars/dev1f965x/4ghz.svg?style=for-the-badge
[stars-url]: https://github.com/dev1f965x/4ghz/stargazers
[issues-shield]: https://img.shields.io/github/issues/dev1f965x/4ghz.svg?style=for-the-badge
[issues-url]: https://github.com/dev1f965x/4ghz/issues
[license-shield]: https://img.shields.io/github/license/dev1f965x/4ghz.svg?style=for-the-badge
[license-url]: https://github.com/dev1f965x/4ghz/blob/main/LICENSE
