import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type GameId, gameIds } from "@/state/schema";
import { GameMark } from "./GameMark";

export function GameSelect({ game, onChange }: { game: GameId; onChange: (game: GameId) => void }) {
  const { t } = useTranslation();
  const label = (g: GameId) => (
    <span className="flex items-center gap-2">
      <GameMark game={g} />
      {t(`game.${g}`)}
    </span>
  );
  return (
    <Select
      value={game}
      onValueChange={(value) => value && onChange(value)}
      items={gameIds.map((g) => ({ value: g, label: t(`game.${g}`) }))}
    >
      <SelectTrigger aria-label={t("game.label")} className="min-w-48">
        <SelectValue>{(value: GameId) => label(value)}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {gameIds.map((g) => (
          <SelectItem key={g} value={g}>
            {label(g)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
