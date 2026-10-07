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
 * "5일 18시간 07분 05초" until `to`, for countdowns that tick every second. Units below the
 * largest keep two digits so the text keeps its width; seconds round down, so it reads 0초 at the
 * instant itself.
 */
export function formatSeconds(t: TFunction, from: number, to: number) {
  const total = Math.max(0, Math.floor((to - from) / 1000));
  const values = [
    ["day", Math.floor(total / 86_400)],
    ["hour", Math.floor((total % 86_400) / 3600)],
    ["minute", Math.floor((total % 3600) / 60)],
    ["second", total % 60],
  ] as const;
  const first = values.findIndex(([, n], i) => n > 0 || i === values.length - 1);
  return values
    .slice(first)
    .map(([unit, n], i) =>
      t(`duration.unit.${unit}`, { n: i === 0 ? String(n) : String(n).padStart(2, "0") }),
    )
    .join(" ");
}
