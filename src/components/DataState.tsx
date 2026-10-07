import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { refreshData, useDataSync } from "@/data/store";

/** Shows the tab's content once data is available, and why it is not otherwise. */
export function DataState({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { data, status, problem } = useDataSync();
  if (data !== null) return children;
  if (status === "loading") {
    return <p className="py-8 text-center text-muted-foreground">{t("sync.loading")}</p>;
  }
  const update = problem === "retired" || problem === "unsupported";
  const title = update ? t("banner.unavailableTitle") : t("load.failedTitle");
  let body = t("load.failedBody");
  if (update) body = t("load.updateBody");
  else if (problem === "invalid") body = t("load.invalidBody");
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-input bg-card px-4 py-8 text-center">
      <h2 className="font-bold">{title}</h2>
      <p className="text-sm text-muted-foreground">{body}</p>
      {!update && (
        <Button variant="outline" onClick={() => void refreshData()}>
          {t("load.retry")}
        </Button>
      )}
    </div>
  );
}
