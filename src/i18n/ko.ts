import type { Messages } from "./en";

// Terms follow the table in CONTENT.md.
export const ko: Messages = {
  game: {
    label: "게임",
    genshin: "원신",
    hsr: "붕괴: 스타레일",
    zzz: "젠레스 존 제로",
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
  load: {
    failedTitle: "데이터를 불러오지 못했습니다",
    failedBody: "인터넷 연결을 확인하고 다시 시도하세요.",
    invalidBody: "데이터 파일에 오류가 있습니다. 나중에 다시 시도하세요.",
    updateBody: "데이터를 받으려면 앱을 업데이트하세요.",
    retry: "다시 시도",
  },
};
