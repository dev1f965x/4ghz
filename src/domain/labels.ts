import type { EventKind, Game } from "./event";
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

/** How long ago the feed was fetched, as `방금`, `12분 전`, `3시간 전`, or a date. */
export function formatFetchedAt(fetchedAt: Date, now: Date): string {
  const minutes = Math.floor((now.getTime() - fetchedAt.getTime()) / 60_000);
  if (minutes < 1) return "방금";
  if (minutes < 60) return `${minutes}분 전`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;

  return new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric" }).format(fetchedAt);
}
