import type { Tab } from "../navigation/history";
import type { Chore, GameDay } from "./dailies";
import type { EventKind, Game } from "./event";
import type { GameFilter } from "./filter";
import type { EventPhase } from "./schedule";

/**
 * Every Korean string the interface shows, in one place.
 *
 * Keeping them here rather than inline is what lets a second language be added by
 * swapping this module, and it keeps wording consistent between the list and a
 * notification.
 */
export const GAME_LABELS: Record<Game, string> = {
  genshin: "원신",
  starrail: "스타레일",
  zenless: "젠레스",
};

export const KIND_LABELS: Record<EventKind, string> = {
  livestream: "생방송",
  version: "버전 업데이트",
  maintenance: "점검",
  ingame: "인게임 행사",
};

/** What the countdown says. "오늘" beats "0일 남음", which reads like nothing is left. */
/** Printed small after the number of days, which the card sets large. */
export const DAYS_LEFT_UNIT = "일 남음";

export function phaseLabel(phase: EventPhase): string {
  switch (phase.status) {
    case "today":
      return "오늘";
    case "running":
      return "진행 중";
    case "upcoming":
      return `${phase.daysUntil}${DAYS_LEFT_UNIT}`;
    case "over":
      return "종료";
  }
}

/**
 * The clock time of an event in the viewer's zone, as `10월 2일 20:00`.
 *
 * The year appears only when it differs from the year being viewed: the common case
 * stays short, and a January event seen in December still says which January.
 */
export function formatStart(instant: Date, now: Date): string {
  return new Intl.DateTimeFormat("ko-KR", {
    year: instant.getFullYear() === now.getFullYear() ? undefined : "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(instant);
}

/** How long ago the feed was fetched: just now, in minutes, in hours, or as a date. */
export function formatFetchedAt(fetchedAt: Date, now: Date): string {
  const minutes = Math.floor((now.getTime() - fetchedAt.getTime()) / 60_000);
  if (minutes < 1) return "방금";
  if (minutes < 60) return `${minutes}분 전`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;

  const sameYear = fetchedAt.getFullYear() === now.getFullYear();
  return new Intl.DateTimeFormat("ko-KR", {
    year: sameYear ? undefined : "numeric",
    month: "long",
    day: "numeric",
  }).format(fetchedAt);
}

export const UPDATE_LABELS = {
  available: (version: string) => `${version} 버전이 나왔어요`,
  install: "업데이트",
  installing: (progress: number | null) =>
    progress === null ? "업데이트 받는 중…" : `업데이트 받는 중… ${Math.round(progress * 100)}%`,
  failed: "업데이트하지 못했어요",
  retry: "다시 시도",
};

export const TAB_LABELS: Record<Tab, string> = {
  schedule: "일정",
  codes: "리딤 코드",
  dailies: "숙제",
};

export const FILTER_LABELS: { menu: string } & Record<GameFilter, string> = {
  menu: "게임",
  all: "전체",
  ...GAME_LABELS,
};

export const REFRESH_LABEL = "새로고침";

export const NAVIGATION_LABELS = {
  back: "뒤로",
  forward: "앞으로",
  tabs: "보기",
};

export const CODE_LABELS = {
  copy: "복사",
  copied: "복사했어요",
  redeem: "교환",
  redeemHint: "코드를 복사하고 공식 교환 페이지를 열어요",
  used: "사용함",
  noExpiry: "기한 없음",
  expires: (text: string) => `${text}까지`,
  empty: "지금 쓸 수 있는 코드가 없어요",
  emptyDetail: "새 코드가 올라오면 여기에 표시돼요",
};

export const CHORE_LABELS: Record<Chore, string> = {
  commissions: "일일 의뢰",
  resin: "레진 소모",
  training: "일일 훈련",
  power: "개척력 소모",
  activity: "일일 활약도",
  battery: "배터리 소모",
};

export const DAILIES_LABELS = {
  games: "하는 게임",
  noGames: "하는 게임을 하나 이상 골라 주세요",
  notTracked: (game: string) => `${game}은 숙제 목록에서 꺼져 있어요`,
  track: "켜기",
  today: (date: string) => `오늘 · ${date}`,
  resetHint: "매일 오전 5시에 새 하루가 시작돼요",
  streak: (days: number) => `${days}일 연속`,
  month: (year: number, month: number) => `${year}년 ${month}월`,
  previousMonth: "지난달",
  nextMonth: "다음 달",
  weekdays: ["일", "월", "화", "수", "목", "금", "토"],
  finished: (games: string[]) => (games.length ? `${games.join(", ")} 완료` : "기록 없음"),
};

/** A game day as `9월 21일 (월)`. The day is a calendar date, so it is read in UTC. */
export function formatGameDay(day: GameDay): string {
  const date = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "UTC",
    month: "long",
    day: "numeric",
  }).format(new Date(`${day}T00:00:00Z`));
  const weekday = DAILIES_LABELS.weekdays[new Date(`${day}T00:00:00Z`).getUTCDay()];
  return `${date} (${weekday})`;
}
