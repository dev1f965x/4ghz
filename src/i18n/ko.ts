import type { Messages } from "./en";

// Terms follow the table in CONTENT.md.
export const ko: Messages = {
  game: {
    label: "게임",
    genshin: "원신",
    hsr: "붕괴: 스타레일",
    zzz: "젠레스 존 제로",
    letter: { genshin: "원", hsr: "스", zzz: "젠" },
  },
  shell: {
    settings: "설정",
    back: "돌아가기",
  },
  firstRun: {
    title: "서버와 게임을 확인하세요",
    body: "기본 서버는 아시아입니다.",
    open: "설정 열기",
    dismiss: "알림 닫기",
  },
  readOnly: {
    title: "기록을 읽을 수 없습니다",
    invalidBody:
      "기록 파일이 손상됐거나 더 새 버전에서 만들어졌습니다. 이번 실행에서는 체크를 끕니다.",
    unreadableBody: "기록 파일을 열 수 없습니다. 이번 실행에서는 체크를 끕니다.",
  },
  tab: {
    schedule: "일정",
    codes: "코드",
    calendar: "캘린더",
  },
  sync: {
    loading: "불러오는 중",
    justNow: "방금 업데이트됨",
    updatedAt: "{{time}}에 업데이트됨",
    failedAt: "새로 고침 실패 · {{time}}에 업데이트됨",
    noData: "데이터 없음",
    refresh: "새로 고침",
  },
  banner: {
    staleTitle: "데이터가 오래됐을 수 있습니다",
    staleBody: "마지막 새로 고침에 실패했습니다. 인터넷 연결을 확인하고 다시 시도하세요.",
    unavailableTitle: "새 데이터를 받을 수 없습니다",
    updateBody: "앱을 업데이트하세요. 마지막으로 받은 데이터를 보여 줍니다.",
    invalidBody: "새 데이터 파일에 오류가 있습니다. 마지막으로 받은 데이터를 보여 줍니다.",
  },
  schedule: {
    ongoing: "진행 중",
    upcoming: "예정",
    timeLeft: "남은 시간 {{time}}",
    startsIn: "시작까지 {{time}}",
    openAnnouncement: "공지 열기",
    estimated: "예상",
    emptyTitle: "예정된 일정이 없습니다",
    emptyBody: "데이터는 {{date}}에 업데이트됐습니다.",
    type: {
      livestream: "방송",
      update: "업데이트",
      maintenance: "점검",
      event: "이벤트",
      endgame: "엔드 콘텐츠",
    },
  },
  codes: {
    title: "사용 가능한 코드",
    copy: "복사",
    copied: "복사됨",
    copyLabel: "“{{code}}” 복사",
    copiedAnnouncement: "복사됨: “{{code}}”.",
    redeemed: "사용함",
    redeemedLabel: "사용함: “{{code}}”",
    expiresAt: "{{when}}에 만료",
    expiryUnknown: "만료 시각 미정",
    left: "{{time}} 남음",
    openRedemption: "교환 페이지 열기",
    emptyTitle: "사용 가능한 코드가 없습니다",
    emptyBody: "새 코드가 나오면 여기에 표시됩니다.",
  },
  duration: {
    days: "{{d}}일 {{h}}시간",
    hours: "{{h}}시간 {{m}}분",
    minutes: "{{m}}분",
  },
  load: {
    failedTitle: "데이터를 불러오지 못했습니다",
    failedBody: "인터넷 연결을 확인하고 다시 시도하세요.",
    invalidBody: "데이터 파일에 오류가 있습니다. 나중에 다시 시도하세요.",
    updateBody: "데이터를 받으려면 앱을 업데이트하세요.",
    retry: "다시 시도",
  },
};
