# 4GHz

[English](./README.md) | [한국어](./README.ko.md)

원신, 붕괴: 스타레일, 젠레스 존 제로의 공식 일정(생방송, 버전 업데이트, 인게임 행사)을
한 창에서 남은 날짜와 함께 보여주는 데스크탑 앱입니다.

이름은 *for GHZ*로 읽습니다. **G**enshin, **H**onkai, **Z**enless.

> 아직 만드는 중입니다. 1.0.0에 들어가는 범위는 [제품 정의](docs/product.md)에 있습니다.

## 실행

[Node.js](https://nodejs.org) 24 이상과 [Rust 툴체인](https://rustup.rs)이 필요합니다.

```bash
npm ci
npm run tauri dev
```

## 설치 파일 만들기

```bash
npm run tauri build
```

설치 파일은 `src-tauri/target/release/bundle`에 생성됩니다.

## 검사

```bash
npm run lint       # Biome, 포맷과 린트
npm run typecheck  # TypeScript
npm run test       # Vitest
```

Rust 검사는 `src-tauri`에서 `cargo fmt --check`, `cargo clippy`, `cargo test`로 합니다.

## 구조

일정은 크롤링하지 않습니다. `feed/events.json`에 두고 코드처럼 리뷰한 뒤 정적 파일로
배포하면, 앱이 그걸 받아 캐시합니다. 일정이 바뀌어도 새 설치 파일이 필요 없습니다.
이런 결정들은 [docs/adr](docs/adr)에 기록해 둡니다.

## 라이선스

[MIT](./LICENSE)
