import { RefreshCwIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { refreshData, useDataSync } from "@/data/store";
import { useNow } from "@/hooks/useNow";
import type { Locale } from "@/i18n/locale";
import { formatUpdated } from "@/time/format";

const JUST_NOW_MS = 60_000;

/** The header's sync unit: when data was last updated, and a Refresh button (also F5). */
export function SyncStatus() {
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

  return (
    <div className="ml-auto flex items-center gap-2" data-sync-status={status}>
      {/* Polite, so a refresh every 30 minutes does not interrupt a screen reader. */}
      <span role="status" className="text-sm text-muted-foreground">
        {text}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => void refreshData()}
        disabled={status === "loading"}
        aria-keyshortcuts="F5"
      >
        <RefreshCwIcon aria-hidden data-icon="inline-start" />
        {t("sync.refresh")}
      </Button>
    </div>
  );
}
