import type { TFunction } from "i18next";
import { timeLeft } from "@/time/format";

/** "3일 4시간", "4시간 5분", or "5분" until `to`, shared by every countdown. */
export function formatDuration(t: TFunction, from: number, to: number) {
  const { days: d, hours: h, minutes: m } = timeLeft(from, to);
  if (d > 0) return t("duration.days", { d, h });
  if (h > 0) return t("duration.hours", { h, m });
  return t("duration.minutes", { m });
}
