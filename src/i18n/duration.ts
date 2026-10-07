import type { TFunction } from "i18next";
import { timeLeft } from "@/time/format";

/** "3일 4시간", "4시간 5분", or "5분" until `to`, shared by every countdown. */
export function formatDuration(t: TFunction, from: number, to: number) {
  const { days: d, hours: h, minutes: m } = timeLeft(from, to);
  if (d > 0) return t("duration.days", { d, h });
  if (h > 0) return t("duration.hours", { h, m });
  return t("duration.minutes", { m });
}

/**
 * "9일 18:42:07" or "18:42:07" until `to`, for countdowns that tick every second. Seconds are
 * rounded down, so it reads 00:00:00 at the instant itself.
 */
export function formatClock(t: TFunction, from: number, to: number) {
  const total = Math.max(0, Math.floor((to - from) / 1000));
  const days = Math.floor(total / 86_400);
  const pad = (n: number) => String(n).padStart(2, "0");
  const clock = `${pad(Math.floor((total % 86_400) / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;
  return days > 0 ? t("duration.daysClock", { d: days, clock }) : clock;
}
