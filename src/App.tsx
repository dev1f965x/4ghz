import { ArrowLeftIcon, SettingsIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Banners } from "@/components/Banners";
import { Checklist } from "@/components/Checklist";
import { CodesTab } from "@/components/CodesTab";
import { DataState } from "@/components/DataState";
import { GameSelect } from "@/components/GameSelect";
import { Mark } from "@/components/Mark";
import { RedemptionLink } from "@/components/RedemptionLink";
import { ScheduleTab } from "@/components/ScheduleTab";
import { SettingsView } from "@/components/SettingsView";
import { SyncStatus } from "@/components/SyncStatus";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { refreshData, useDataSync } from "@/data/store";
import { useNow } from "@/hooks/useNow";
import { advanceAllChores, updateSettings, useLocalState } from "@/state/app-state";
import { type TabId, tabIds } from "@/state/schema";

export default function App() {
  const { t } = useTranslation();
  const { state } = useLocalState();
  const { lastGame: game, lastTab: tab } = state.settings;
  const [view, setView] = useState<"main" | "settings">("main");
  const settingsButton = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef(false);

  useEffect(() => {
    document.documentElement.dataset.game = game;
  }, [game]);

  // Resets and missed days apply on start, every 30 seconds, and when the window regains focus
  // after sleep or a clock change (PRD FR29).
  const { data } = useDataSync();
  const now = useNow(30_000);
  useEffect(() => {
    if (data === null) return;
    advanceAllChores(data, now);
    const onFocus = () => advanceAllChores(data, Date.now());
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [data, now]);
  const openSettings = useCallback(() => setView("settings"), []);
  const closeSettings = useCallback(() => {
    returnFocus.current = true;
    setView("main");
  }, []);

  // Back and Esc return focus to the Settings button, where the user left the main screen.
  useEffect(() => {
    if (view === "main" && returnFocus.current) {
      returnFocus.current = false;
      settingsButton.current?.focus();
    }
  }, [view]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "F5") {
        // Refreshes the data instead of reloading the window, which would lose unsaved state.
        event.preventDefault();
        void refreshData();
      } else if (
        event.key === "," &&
        event.ctrlKey &&
        !event.altKey &&
        !event.shiftKey &&
        !event.metaKey
      ) {
        event.preventDefault();
        openSettings();
      } else if (event.key === "Escape" && view === "settings" && !event.defaultPrevented) {
        // Base UI popups handle their own Escape first and mark the event as handled.
        closeSettings();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [view, openSettings, closeSettings]);

  const inSettings = view === "settings";
  return (
    <div className="flex min-h-svh flex-col">
      {/* A panel with a hairline under it, as in the visual direction. */}
      <header className="flex items-center gap-3 border-b bg-card px-4 py-2">
        <Mark />
        {inSettings ? (
          <Button variant="outline" onClick={closeSettings}>
            <ArrowLeftIcon aria-hidden data-icon="inline-start" />
            {t("shell.back")}
          </Button>
        ) : (
          <GameSelect game={game} onChange={(g) => void updateSettings({ lastGame: g })} />
        )}
        <SyncStatus />
        {/* A toggle: pressed while Settings is open, with the accent tint of a pressed button. */}
        <Button
          ref={settingsButton}
          variant="outline"
          aria-pressed={inSettings}
          aria-keyshortcuts="Control+,"
          className="aria-pressed:border-primary aria-pressed:bg-accent aria-pressed:text-accent-foreground"
          onClick={inSettings ? closeSettings : openSettings}
        >
          <SettingsIcon aria-hidden data-icon="inline-start" />
          {t("shell.settings")}
        </Button>
      </header>
      <div className="flex grow flex-col gap-3 p-4">
        <Banners onOpenSettings={inSettings ? undefined : openSettings} />
        <main className="flex grow flex-col">
          {inSettings ? (
            <SettingsView />
          ) : (
            <Tabs
              value={tab}
              onValueChange={(value: TabId) => {
                if (tabIds.includes(value)) void updateSettings({ lastTab: value });
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <TabsList variant="line">
                  {tabIds.map((id) => (
                    <TabsTrigger key={id} value={id}>
                      {t(`tab.${id}`)}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {/* As in the wireframes, the Codes tab offers the game's redemption page here. */}
                {tab === "codes" && <RedemptionLink game={game} />}
              </div>
              {tabIds.map((id) => (
                <TabsContent key={id} value={id}>
                  {/* The Calendar's content arrives with its stories (GHZ-18, GHZ-19). */}
                  <DataState>
                    {id === "schedule" && <ScheduleTab game={game} />}
                    {id === "codes" && <CodesTab game={game} />}
                    {id === "calendar" && <Checklist game={game} onOpenSettings={openSettings} />}
                  </DataState>
                </TabsContent>
              ))}
            </Tabs>
          )}
        </main>
      </div>
    </div>
  );
}
