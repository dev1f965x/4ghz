<a id="readme-top"></a>

[![CI][ci-shield]][ci-url]
[![Release][release-shield]][release-url]
[![Issues][issues-shield]][issues-url]
[![License][license-shield]][license-url]

<br />
<div align="center">
  <a href="https://github.com/dev1f965x/4ghz/releases/latest">
    <img src="design/icon/app-icon.svg" alt="4GHz 로고" width="80" height="80">
  </a>

<h3 align="center">4GHz</h3>

  <p align="center">
    원신, 붕괴: 스타레일, 젠레스 존 제로의 일정, 코드, 숙제 캘린더를 보여 주는 비공식 Windows 앱입니다.
    <br />
    <a href="README.md">English</a> | 한국어
    <br />
    <br />
    <a href="https://github.com/dev1f965x/4ghz/releases/latest"><strong>다운로드 »</strong></a>
    <br />
    <br />
    <a href="https://github.com/dev1f965x/4ghz/issues/new?template=bug_report.yml">버그 제보</a>
    &middot;
    <a href="https://github.com/dev1f965x/4ghz/issues/new?template=feature_request.yml">기능 요청</a>
  </p>
</div>

<details>
  <summary>목차</summary>
  <ol>
    <li>
      <a href="#프로젝트-소개">프로젝트 소개</a>
      <ul>
        <li><a href="#사용한-기술">사용한 기술</a></li>
      </ul>
    </li>
    <li>
      <a href="#시작하기">시작하기</a>
      <ul>
        <li><a href="#필요한-것">필요한 것</a></li>
        <li><a href="#설치">설치</a></li>
        <li><a href="#내려받은-파일-검증">내려받은 파일 검증</a></li>
        <li><a href="#삭제">삭제</a></li>
      </ul>
    </li>
    <li><a href="#사용법">사용법</a></li>
    <li><a href="#로드맵">로드맵</a></li>
    <li><a href="#개인정보">개인정보</a></li>
    <li><a href="#데이터-정확성">데이터 정확성</a></li>
    <li>
      <a href="#개발">개발</a>
      <ul>
        <li><a href="#릴리스">릴리스</a></li>
      </ul>
    </li>
    <li><a href="#기여">기여</a></li>
    <li><a href="#라이선스">라이선스</a></li>
    <li><a href="#연락처">연락처</a></li>
    <li><a href="#감사의-말">감사의 말</a></li>
  </ol>
</details>

## 프로젝트 소개

원신, 붕괴: 스타레일, 젠레스 존 제로의 일정, 코드, 숙제 캘린더를 보여 주는 비공식 Windows 앱입니다.

4GHz는 각 게임의 퍼블리셔나 권리자와 제휴하지 않았고 승인도 받지 않은 비공식 앱입니다. 원신, 붕괴: 스타레일, 젠레스 존 제로는 각 권리자의 상표입니다.

변경 사항은 [변경 이력](CHANGELOG.md)에 있습니다.

<p align="right">(<a href="#readme-top">맨 위로</a>)</p>

### 사용한 기술

* [![Tauri][tauri-shield]][tauri-url]
* [![Rust][rust-shield]][rust-url]
* [![React][react-shield]][react-url]
* [![TypeScript][typescript-shield]][typescript-url]
* [![Tailwind CSS][tailwind-shield]][tailwind-url]

<p align="right">(<a href="#readme-top">맨 위로</a>)</p>

## 시작하기

### 필요한 것

64비트 Windows 11이 필요합니다. Windows 10에서도 동작할 것으로 보지만 테스트하지는 않았습니다.

### 설치

1. [최신 릴리스](https://github.com/dev1f965x/4ghz/releases/latest)에서 `4GHz_<버전>_x64-setup.exe`를 내려받습니다.
2. 실행합니다. 현재 Windows 계정에만 설치되며 관리자 권한을 요구하지 않습니다.
3. 설치 파일에 코드 서명이 없어서 Microsoft Defender SmartScreen이 "Windows의 PC 보호" 창을 띄울 수 있습니다. **추가 정보**를 누르고 앱 이름이 `4GHz_<버전>_x64-setup.exe`인지 확인한 다음 **실행**을 누르세요. 이 저장소에서 빌드한 파일이 맞는지 확인하려면 먼저 아래 방법으로 검증하세요.

4GHz는 시작할 때 새 버전이 있는지 확인하고 앱 안에 알림을 띄웁니다. 스스로 업데이트하지는 않습니다. 새 버전을 기존 버전 위에 설치하면 업데이트되며, 기록은 그대로 남습니다.

### 내려받은 파일 검증

릴리스마다 설치 파일의 SHA-256 체크섬을 `<설치 파일>.sha256`에 올립니다. 내려받은 폴더에서 PowerShell로 다음을 실행합니다.

```powershell
(Get-FileHash .\4GHz_<버전>_x64-setup.exe -Algorithm SHA256).Hash
```

결과가 체크섬 파일과 같아야 합니다(대소문자는 무시).

설치 파일에는 빌드 출처 증명(attestation)도 있습니다. 이 저장소의 릴리스 워크플로가 버전 태그에서 빌드할 때 서명한 증명입니다. [GitHub CLI](https://cli.github.com/)로 확인합니다.

```powershell
gh attestation verify .\4GHz_<버전>_x64-setup.exe --repo dev1f965x/4ghz `
  --signer-workflow dev1f965x/4ghz/.github/workflows/release.yml --source-ref refs/tags/v<버전>
```

### 삭제

**설정 > 앱 > 설치된 앱**에서 4GHz를 제거합니다. 제거 프로그램에서 앱 데이터 삭제를 선택하지 않으면 기록은 `%LOCALAPPDATA%\io.github.dev1f965x.4ghz`에 남습니다.

<p align="right">(<a href="#readme-top">맨 위로</a>)</p>

## 사용법

- **일정:** 게임별로 진행 중이거나 예정된 이벤트, 엔드 콘텐츠, 방송을 남은 시간과 함께 보여 줍니다. 공지가 있는 일정은 눌러서 브라우저로 열 수 있습니다.
- **코드:** 사용할 수 있는 코드를 복사하고, 게임별 교환 페이지로 이동합니다. 사용한 코드는 표시해 둘 수 있습니다.
- **캘린더:** 일간, 주간, 기간 숙제 체크리스트가 서버 초기화 시각에 맞춰 초기화되고, 숙제를 끝낸 날을 달력으로 보여 줍니다.
- **설정:** 플레이하는 게임, 게임별 서버, 기록할 숙제, 언어(한국어, 영어), 남은 시간의 초 표시를 고릅니다.

<p align="right">(<a href="#readme-top">맨 위로</a>)</p>

## 로드맵

- [x] 일정, 코드, 숙제 캘린더, 설정, 새 버전 알림, 내려받은 데이터의 오프라인 사용(0.1.0)

기능 요청은 [GitHub 이슈](https://github.com/dev1f965x/4ghz/issues/new?template=feature_request.yml)로 남겨 주세요.

<p align="right">(<a href="#readme-top">맨 위로</a>)</p>

## 개인정보

4GHz에는 계정이 없고, 개인정보, 사용 기록, 오류 보고를 수집하지 않습니다. 사용자에 대한 정보를 어디에도 보내지 않습니다.

- **이 PC에만 저장:** 설정, 체크한 숙제, 숙제를 끝낸 날, 사용한 코드, 내려받은 데이터의 사본을 `%LOCALAPPDATA%\io.github.dev1f965x.4ghz`에 저장합니다. 경고와 오류는 그 안의 `logs` 폴더에 최대 1 MB 파일 세 개까지 남깁니다.
- **네트워크 요청:** 일정과 코드 데이터를 `dev1f965x.github.io`에서 내려받고, 새 릴리스가 있는지 `api.github.com`에서 확인합니다. 일반 다운로드이며, 다른 웹 요청처럼 GitHub는 [GitHub 개인정보처리방침](https://docs.github.com/site-policy/privacy-policies/github-general-privacy-statement)에 따라 IP 주소를 받습니다.
- **링크:** 공지, 교환 페이지, 릴리스 페이지는 브라우저에서 각 퍼블리셔 사이트나 GitHub로 열립니다.

<p align="right">(<a href="#readme-top">맨 위로</a>)</p>

## 데이터 정확성

일정과 코드는 공식 공지를 보고 직접 모은 것이라 늦거나 틀릴 수 있습니다. "예상"으로 표시한 시각은 지난 패턴을 바탕으로 추정한 것입니다. 시각이 중요할 때는 공식 공지를 확인하세요.

<p align="right">(<a href="#readme-top">맨 위로</a>)</p>

## 개발

이 앱은 Windows 11에서 개발합니다. 먼저 다음을 설치하세요.

- Visual Studio Build Tools와 “C++를 사용한 데스크톱 개발” 워크로드
- rustup으로 설치한 Rust
- 저장소가 고정한 Node.js, pnpm, cargo-deny, cargo-about 버전을 설치하는 mise
- E2E 테스트용 Microsoft Edge (Windows 11에 포함)

저장소에서 `mise install`을 한 번 실행해 고정된 도구를 설치한 뒤 `pnpm install`을 실행하세요. 명령은 [README.md](README.md#development)의 표를 따릅니다. 스모크 테스트도 [README.md](README.md#smoke-test)에 있습니다.

### 릴리스

1. 풀 리퀘스트에서 `package.json`의 버전을 정하고, `CHANGELOG.md`의 변경 사항을 출시일을 적은 그 버전의 제목 아래로 옮기고, 끝의 비교 링크를 고친 다음 머지합니다.
2. main에 머지된 커밋에 태그를 붙여 푸시합니다. 예: `git tag v0.1.0 origin/main && git push origin v0.1.0`. 태그가 버전과 다르거나, main에 없거나, 이미 릴리스가 있으면 워크플로가 멈춥니다. 태그를 다시 만들려면 `git push --delete origin v0.1.0`과 `git tag -d v0.1.0`으로 지웁니다.
3. Release 워크플로가 빌드를 검사하고, 설치 파일과 체크섬, 빌드 출처 증명을 초안 릴리스에 첨부하며, CHANGELOG 내용을 릴리스 노트로 씁니다. GitHub에서 초안을 확인하고 게시합니다.

<p align="right">(<a href="#readme-top">맨 위로</a>)</p>

## 기여

버그 제보와 기능 요청은 유형별 양식이 있는 [GitHub 이슈](https://github.com/dev1f965x/4ghz/issues/new/choose)로 남겨 주세요. 보안 문제는 [SECURITY.md](SECURITY.md)에 안내된 방법으로 비공개 제보해 주세요.

<p align="right">(<a href="#readme-top">맨 위로</a>)</p>

## 라이선스

[MIT 라이선스](LICENSE)로 배포합니다. 앱의 정보 화면에서 서드파티 고지를 볼 수 있으며, 이 고지는 `pnpm app:build`가 `public/third-party-notices.txt`에 생성합니다.

<p align="right">(<a href="#readme-top">맨 위로</a>)</p>

## 연락처

프로젝트 주소: <https://github.com/dev1f965x/4ghz>

<p align="right">(<a href="#readme-top">맨 위로</a>)</p>

## 감사의 말

* [Best-README-Template](https://github.com/othneildrew/Best-README-Template): 이 README의 구성
* [shadcn/ui](https://ui.shadcn.com)와 [Base UI](https://base-ui.com): UI 컴포넌트
* [Lucide](https://lucide.dev): 아이콘
* [Pretendard](https://github.com/orioncactus/pretendard)와 [JetBrains Mono](https://www.jetbrains.com/lp/mono/): 글꼴

<p align="right">(<a href="#readme-top">맨 위로</a>)</p>

[ci-shield]: https://img.shields.io/github/actions/workflow/status/dev1f965x/4ghz/ci.yml?branch=main&style=for-the-badge&label=CI
[ci-url]: https://github.com/dev1f965x/4ghz/actions/workflows/ci.yml
[release-shield]: https://img.shields.io/github/v/release/dev1f965x/4ghz?style=for-the-badge
[release-url]: https://github.com/dev1f965x/4ghz/releases
[issues-shield]: https://img.shields.io/github/issues/dev1f965x/4ghz?style=for-the-badge
[issues-url]: https://github.com/dev1f965x/4ghz/issues
[license-shield]: https://img.shields.io/github/license/dev1f965x/4ghz?style=for-the-badge
[license-url]: LICENSE
[tauri-shield]: https://img.shields.io/badge/Tauri_2-24C8D8?style=for-the-badge&logo=tauri&logoColor=white
[tauri-url]: https://tauri.app/
[rust-shield]: https://img.shields.io/badge/Rust-000000?style=for-the-badge&logo=rust&logoColor=white
[rust-url]: https://www.rust-lang.org/
[react-shield]: https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB
[react-url]: https://react.dev/
[typescript-shield]: https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white
[typescript-url]: https://www.typescriptlang.org/
[tailwind-shield]: https://img.shields.io/badge/Tailwind_CSS-0F172A?style=for-the-badge&logo=tailwindcss&logoColor=38BDF8
[tailwind-url]: https://tailwindcss.com/
