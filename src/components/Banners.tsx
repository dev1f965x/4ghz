import { openUrl } from "@tauri-apps/plugin-opener";
import { XIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { OpenFolderButton } from "@/components/SettingsView";
import { Button } from "@/components/ui/button";
import { refreshData, useDataSync } from "@/data/store";
import { logError } from "@/log";
import { updateSettings, useLocalState } from "@/state/app-state";
import { useAvailableUpdate } from "@/update/store";
import { Banner } from "./Banner";

// More banners than this push the tabs out of view at the minimum window size.
const MAX_VISIBLE = 2;

/**
 * The banners area: problems first, then notices, at most two at a time. The rest show as
 * soon as one above them is resolved or dismissed.
 */
export function Banners({ onOpenSettings }: { onOpenSettings?: () => void }) {
  const { t } = useTranslation();
  const { data, status, problem } = useDataSync();
  const { state, readOnly, saveFailed } = useLocalState();
  const update = useAvailableUpdate();
  const banners: { key: string; node: ReactNode }[] = [];

  if (saveFailed) {
    banners.push({
      key: "save-failed",
      node: <Banner kind="warning" title={t("saveFailed.title")} body={t("saveFailed.body")} />,
    });
  }

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
          actions={<OpenFolderButton />}
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
  // Inside Settings the notice has nothing to point to, so it waits until the user leaves.
  if (onOpenSettings && !state.settings.firstRunNoticeDismissed) {
    banners.push({
      key: "first-run",
      node: (
        <Banner
          kind="notice"
          title={t("firstRun.title")}
          body={t("firstRun.body")}
          actions={
            <>
              <Button variant="outline" size="sm" onClick={onOpenSettings}>
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
  // After the first-run notice: setting up the app comes first, and this notice waits until
  // it is dismissed.
  if (update !== null && update.version !== state.settings.dismissedUpdateVersion) {
    banners.push({
      key: "update-available",
      node: (
        <Banner
          kind="notice"
          title={t("update.title")}
          body={t("update.body", { version: update.version })}
          actions={
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  openUrl(update.url).catch((error: unknown) =>
                    logError("Opening the release page failed", error),
                  )
                }
              >
                {t("update.open")}
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t("update.dismiss")}
                onClick={() => void updateSettings({ dismissedUpdateVersion: update.version })}
              >
                <XIcon aria-hidden />
              </Button>
            </>
          }
        />
      ),
    });
  }

  // One live region that is always present, so a banner that appears later is announced once,
  // and the banners present at startup are not read out as interruptions.
  return (
    <div role="status" className="flex flex-col gap-2 empty:hidden">
      {banners.slice(0, MAX_VISIBLE).map((b) => (
        <div key={b.key}>{b.node}</div>
      ))}
    </div>
  );
}
