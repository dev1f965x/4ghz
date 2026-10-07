# 4GHz

[English](README.md) | 한국어

원신, 붕괴: 스타레일, 젠레스 존 제로의 일정, 코드, 숙제 캘린더를 보여 주는 비공식 Windows 앱입니다.

4GHz는 각 게임의 퍼블리셔나 권리자와 제휴하지 않았고 승인도 받지 않은 비공식 앱입니다. 원신, 붕괴: 스타레일, 젠레스 존 제로는 각 권리자의 상표입니다.

## 기능

- **일정:** 게임별로 진행 중이거나 예정된 이벤트, 엔드 콘텐츠, 방송을 남은 시간과 함께 보여 줍니다. 공지가 있는 일정은 눌러서 브라우저로 열 수 있습니다.
- **코드:** 사용할 수 있는 리딤 코드를 복사하고, 게임별 교환 페이지로 이동합니다. 교환한 코드는 표시해 둘 수 있습니다.
- **캘린더:** 일간, 주간, 기간 숙제 체크리스트가 서버 초기화 시각에 맞춰 초기화되고, 숙제를 끝낸 날을 달력으로 보여 줍니다.
- **설정:** 플레이하는 게임, 게임별 서버, 기록할 숙제, 언어(한국어, 영어), 남은 시간의 초 표시를 고릅니다.

## 설치

64비트 Windows 11이 필요합니다. Windows 10에서도 동작할 것으로 보지만 시험하지는 않았습니다.

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

설치 파일에는 빌드 출처 증명(attestation)도 있습니다. 이 저장소의 릴리스 워크플로가 태그된 커밋에서 빌드했다는 증명입니다. [GitHub CLI](https://cli.github.com/)로 확인합니다.

```powershell
gh attestation verify .\4GHz_<버전>_x64-setup.exe --repo dev1f965x/4ghz
```

### 삭제

**설정 > 앱 > 설치된 앱**에서 4GHz를 제거합니다. 제거 프로그램에서 앱 데이터 삭제를 선택하지 않으면 기록은 `%LOCALAPPDATA%\io.github.dev1f965x.4ghz`에 남습니다.

## 개인정보

4GHz에는 계정이 없고, 개인정보, 사용 기록, 오류 보고를 수집하지 않습니다. 사용자에 대한 정보를 어디에도 보내지 않습니다.

- **이 PC에만 저장:** 설정, 체크한 숙제, 숙제를 끝낸 날, 교환한 코드, 내려받은 데이터의 사본을 `%LOCALAPPDATA%\io.github.dev1f965x.4ghz`에 저장합니다. 경고와 오류는 그 안의 `logs` 폴더에 최대 1 MB 파일 세 개까지 남깁니다.
- **네트워크 요청:** 일정과 코드 데이터를 `dev1f965x.github.io`에서 내려받고, 새 릴리스가 있는지 `api.github.com`에서 확인합니다. 일반 다운로드이며, 다른 웹 요청처럼 GitHub는 [GitHub 개인정보처리방침](https://docs.github.com/site-policy/privacy-policies/github-general-privacy-statement)에 따라 IP 주소를 받습니다.
- **링크:** 공지와 교환 페이지는 브라우저에서 각 퍼블리셔 사이트로 열립니다.

## 데이터 정확성

일정과 코드는 공식 공지를 보고 직접 모은 것이라 늦거나 틀릴 수 있습니다. "예상"으로 표시한 시각은 지난 패턴을 바탕으로 추정한 것입니다. 시각이 중요할 때는 공식 공지를 확인하세요.

## 개발

이 앱은 Windows 11에서 개발합니다. 먼저 다음을 설치하세요.

- Visual Studio Build Tools와 “C++를 사용한 데스크톱 개발” 워크로드
- rustup으로 설치한 Rust
- 저장소가 고정한 Node.js, pnpm, cargo-deny, cargo-about 버전을 설치하는 mise
- E2E 테스트용 Microsoft Edge (Windows 11에 포함)

저장소에서 `mise install`을 한 번 실행해 고정된 도구를 설치한 뒤 `pnpm install`을 실행하세요. 명령은 [README.md](README.md#development)의 표를 따릅니다.

### 릴리스

1. `package.json`의 버전을 정하고, `CHANGELOG.md`의 변경 사항을 그 버전의 제목 아래로 옮깁니다.
2. 그 버전의 태그를 푸시합니다. 예: `git tag v0.1.0 && git push origin v0.1.0`
3. Release 워크플로가 빌드를 검사하고, 설치 파일과 체크섬, 빌드 출처 증명을 초안 릴리스에 첨부하며, CHANGELOG 내용을 릴리스 노트로 씁니다. GitHub에서 초안을 확인하고 게시합니다.

## 라이선스

[MIT](LICENSE)
