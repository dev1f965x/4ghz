# 4GHz

원신, 붕괴: 스타레일, 젠레스 존 제로의 공식 일정을 한 창에서 세는 데스크탑 앱.
(*for GHZ* — **G**enshin, **H**onkai, **Z**enless.)

[![CI](https://github.com/dev1f965x/4ghz/actions/workflows/ci.yml/badge.svg)](https://github.com/dev1f965x/4ghz/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/dev1f965x/4ghz?display_name=tag)](https://github.com/dev1f965x/4ghz/releases)
![Tauri 2](https://img.shields.io/badge/Tauri-2-24C8DB?logo=tauri&logoColor=white)
![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)
![Rust](https://img.shields.io/badge/Rust-stable-DEA584?logo=rust&logoColor=white)

[English](./README.md) | [한국어](./README.ko.md)

## 설치

[릴리즈](https://github.com/dev1f965x/4ghz/releases)에서 `4GHz_x.y.z_x64-setup.exe`.
서명이 없어 SmartScreen이 한 번 묻는다. **추가 정보** → **실행**.

## 동작

- 일정은 [`feed/events.json`](feed/events.json)에 두고 코드처럼 리뷰한 뒤 GitHub Pages로
  배포한다. 크롤링 없음.
- 앱은 실행할 때와 6시간마다 받아오고, 마지막으로 성공한 응답을 캐시해 오프라인에서도 쓴다.
- 계정 없음, 수집 없음, 나가는 요청은 피드 하나. 설치 크기 2.6 MB.

## 개발

```bash
npm ci
npm run tauri dev
```

| 명령 | 검사 |
|---|---|
| `npm run lint` | Biome 포맷·린트 |
| `npm run typecheck` | TypeScript |
| `npm run test` | Vitest |
| `npm run feed:validate` | 피드가 JSON Schema에 맞는지 |
| `npm run check:tauri` | 크레이트와 npm 플러그인 버전 일치 |

러스트는 `src-tauri`에서 `cargo fmt --check`, `cargo clippy`, `cargo test`.

## 문서

- [제품 정의](docs/product.md) — 범위와 인수 조건
- [일정 편집](docs/feed.md) — 일정이 배포되기까지
- [ADR](docs/adr) — 이렇게 만든 이유

[MIT](./LICENSE)
