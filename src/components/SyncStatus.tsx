import { RefreshCwIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { refreshData, useDataSync } from "@/data/store";
import { useNow } from "@/hooks/useNow";
import type { Locale } from "@/i18n/locale";
import { formatUpdated } from "@/time/format";

const JUST_NOW_MS = 60_000;

/** When the data was last updated, as the header and Settings show it. */
export function useSyncText() {
  const { t, i18n } = useTranslation();
  const { status, checkedAt } = useDataSync();
  const now = useNow(30_000);
  const time = checkedAt === null ? null : formatUpdated(checkedAt, now, i18n.language as Locale);

  let text: string;
  if (status === "loading") text = t("sync.loading");
  else if (time === null) text = t("sync.noData");
  else if (status === "failed") text = t("sync.failedAt", { time });
  else if (checkedAt !== null && now - checkedAt < JUST_NOW_MS) text = t("sync.justNow");
  else text = t("sync.updatedAt", { time });
  return text;
}

/** The header's sync unit: when data was last updated, and a Refresh button (also F5). */
export function SyncStatus() {
  const { t } = useTranslation();
  const { status } = useDataSync();
  const text = useSyncText();

  return (
    <div className="ml-auto flex items-center gap-2" data-sync-status={status}>
      {/* Plain text, not a live region: automatic refreshes every 30 minutes would interrupt a
          screen reader. Problems are announced by the banners. */}
      <span className="text-sm whitespace-nowrap text-muted-foreground">{text}</span>
      {/* Never disabled: a disabled button drops keyboard focus, and refresh() already shares a
          download in progress. */}
      <Button
        variant="outline"
        onClick={() => void refreshData()}
        aria-busy={status === "loading"}
        aria-keyshortcuts="F5"
      >
        <RefreshCwIcon aria-hidden data-icon="inline-start" />
        {t("sync.refresh")}
      </Button>
    </div>
  );
}
