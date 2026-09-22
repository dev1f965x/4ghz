import type { Tab } from "../navigation/tabs";
import type { GameDay } from "./dailies";
import type { EventKind, Game } from "./event";
import type { GameFilter } from "./filter";
import type { EventPhase, TimeLeft } from "./schedule";

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
export function phaseLabel(phase: EventPhase): string {
  switch (phase.status) {
    case "today":
      return "오늘";
    case "running":
      return "진행 중";
    case "upcoming":
      return `${phase.daysUntil}일 남음`;
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

/** When an event with an end runs: `9월 16일 11:00 – 9월 29일 11:00`, or `9월 27일 06:00 – 10:00`. */
export function formatPeriod(start: Date, end: Date, now: Date): string {
  const sameDay = start.toDateString() === end.toDateString();
  const until = sameDay ? formatTime(end) : formatStart(end, now);
  return `${formatStart(start, now)} – ${until}`;
}

function formatTime(instant: Date): string {
  return new Intl.DateTimeFormat("ko-KR", {
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
  downloading: (version: string) => `${version} 버전을 받고 있어요`,
  installing: "받는 중",
  progress: (progress: number | null) =>
    progress === null ? "…" : ` ${Math.round(progress * 100)}%`,
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

export const FETCH_LABELS = {
  refreshing: "새로고침 중…",
  fetched: (when: string) => `${when} 확인`,
};

export const TAB_BAR_LABEL = "보기";

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

/** 은 after a final consonant, 는 after a vowel: 원신은, 젠레스는. */
export function topicParticle(word: string): "은" | "는" {
  const last = word.charCodeAt(word.length - 1) - 0xac00;
  const hasFinalConsonant = last >= 0 && last < 11172 && last % 28 !== 0;
  return hasFinalConsonant ? "은" : "는";
}

export const DAILIES_LABELS = {
  games: "챙길 게임",
  noGames: "챙길 게임을 하나 이상 골라 주세요",
  notTracked: (game: string) => `${game}${topicParticle(game)} 챙길 게임에서 꺼져 있어요`,
  track: "켜기",
  today: (date: string) => `오늘 · ${date}`,
  resetHint: "매일 오전 5시에 새 하루가 시작돼요",
  streak: (days: number) => `${days}일 연속`,
  month: (year: number, month: number) => `${year}년 ${month}월`,
  previousMonth: "지난달",
  nextMonth: "다음 달",
  weekdays: ["일", "월", "화", "수", "목", "금", "토"],
  perfect: "모두 완료한 날",
  legendSome: "게임별 완료",
  legendAll: "모두 완료",
  legendOne: "완료",
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

export const COUNTDOWN_LABELS = {
  day: "일",
  untilStart: "시작까지",
  untilEnd: "끝나기까지",
};

/** The part of a countdown under a day, as `03:14:22`. */
export function formatClock({ hours, minutes, seconds }: TimeLeft): string {
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
}
