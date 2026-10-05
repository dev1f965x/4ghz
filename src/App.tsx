import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const games = ["genshin", "hsr", "zzz"] as const;
type Game = (typeof games)[number];

// Placeholder shell until the real screens are built: the game drop-down sets the window accent.
export default function App() {
  const { t } = useTranslation();
  const [game, setGame] = useState<Game>("genshin");

  useEffect(() => {
    document.documentElement.dataset.game = game;
  }, [game]);

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
      </header>
      <Tabs defaultValue="schedule">
        <TabsList variant="line">
          <TabsTrigger value="schedule">{t("tab.schedule")}</TabsTrigger>
          <TabsTrigger value="codes">{t("tab.codes")}</TabsTrigger>
          <TabsTrigger value="calendar">{t("tab.calendar")}</TabsTrigger>
        </TabsList>
      </Tabs>
    </main>
  );
}
