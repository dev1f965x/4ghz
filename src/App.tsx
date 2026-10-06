import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { DataBanners } from "@/components/DataBanners";
import { DataState } from "@/components/DataState";
import { SyncStatus } from "@/components/SyncStatus";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { refreshData } from "@/data/store";

const games = ["genshin", "hsr", "zzz"] as const;
type Game = (typeof games)[number];
const tabs = ["schedule", "codes", "calendar"] as const;

// Shell until the app shell story (GHZ-15) lays out the real header and tabs.
export default function App() {
  const { t } = useTranslation();
  const [game, setGame] = useState<Game>("genshin");

  useEffect(() => {
    document.documentElement.dataset.game = game;
  }, [game]);

  // F5 refreshes the data instead of reloading the window, which would lose unsaved state.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "F5") return;
      event.preventDefault();
      void refreshData();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <main className="flex flex-col gap-4 p-4">
      <header className="flex items-center gap-3">
        <span className="font-mono font-bold">4ghz</span>
        <Select
          value={game}
          onValueChange={(value) => value && setGame(value)}
          items={games.map((g) => ({ value: g, label: t(`game.${g}`) }))}
        >
          <SelectTrigger aria-label={t("game.label")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {games.map((g) => (
              <SelectItem key={g} value={g}>
                {t(`game.${g}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <SyncStatus />
      </header>
      <DataBanners />
      <Tabs defaultValue="schedule">
        <TabsList variant="line">
          {tabs.map((tab) => (
            <TabsTrigger key={tab} value={tab}>
              {t(`tab.${tab}`)}
            </TabsTrigger>
          ))}
        </TabsList>
        {tabs.map((tab) => (
          <TabsContent key={tab} value={tab}>
            {/* Each tab's content arrives with its story (GHZ-16 to GHZ-19). */}
            <DataState>{null}</DataState>
          </TabsContent>
        ))}
      </Tabs>
    </main>
  );
}
