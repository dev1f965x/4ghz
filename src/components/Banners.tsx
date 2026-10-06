import { XIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { refreshData, useDataSync } from "@/data/store";
import { updateSettings, useLocalState } from "@/state/app-state";
import { Banner } from "./Banner";

// More banners than this push the tabs out of view at the minimum window size.
const MAX_VISIBLE = 2;

/**
 * The banners area: problems first, then notices, at most two at a time. The rest show as
 * soon as one above them is resolved or dismissed.
 */
export function Banners({ onOpenSettings }: { onOpenSettings: () => void }) {
  const { t } = useTranslation();
  const { data, status, problem } = useDataSync();
  const { state, readOnly } = useLocalState();
  const banners: { key: string; node: ReactNode }[] = [];

  if (readOnly !== null) {
    banners.push({
      key: "read-only",
      node: (
        <Banner
          kind="warning"
          title={t("readOnly.title")}
          body={
            readOnly === "unreadable" ? t("readOnly.unreadableBody") : t("readOnly.invalidBody")
          }
        />
      ),
    });
  }
  // Without data, the tabs explain data problems instead (DataState).
  if (data !== null && (problem === "retired" || problem === "unsupported")) {
    banners.push({
      key: "update",
      node: (
        <Banner kind="warning" title={t("banner.unavailableTitle")} body={t("banner.updateBody")} />
      ),
    });
  }
  if (data !== null && problem === "invalid") {
    banners.push({
      key: "invalid",
      node: (
        <Banner
          kind="warning"
          title={t("banner.unavailableTitle")}
          body={t("banner.invalidBody")}
        />
      ),
    });
  }
  if (data !== null && status === "failed") {
    banners.push({
      key: "stale",
      node: (
        <Banner
          kind="warning"
          title={t("banner.staleTitle")}
          body={t("banner.staleBody")}
          actions={
            <Button variant="outline" size="sm" onClick={() => void refreshData()}>
              {t("load.retry")}
            </Button>
          }
        />
      ),
    });
  }
  if (!state.settings.firstRunNoticeDismissed) {
    banners.push({
      key: "first-run",
      node: (
        <Banner
          kind="notice"
          title={t("firstRun.title")}
          body={t("firstRun.body")}
          actions={
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Opening Settings answers the notice, so it does not come back.
                  void updateSettings({ firstRunNoticeDismissed: true });
                  onOpenSettings();
                }}
              >
                {t("firstRun.open")}
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t("firstRun.dismiss")}
                onClick={() => void updateSettings({ firstRunNoticeDismissed: true })}
              >
                <XIcon aria-hidden />
              </Button>
            </>
          }
        />
      ),
    });
  }

  if (banners.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      {banners.slice(0, MAX_VISIBLE).map((b) => (
        <div key={b.key}>{b.node}</div>
      ))}
    </div>
  );
}
