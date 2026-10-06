import { useTranslation } from "react-i18next";
import type { GameId } from "@/state/schema";

const colors: Record<GameId, string> = {
  genshin: "bg-genshin text-genshin-on",
  hsr: "bg-hsr text-hsr-on",
  zzz: "bg-zzz text-zzz-on",
};

/**
 * A game's letter tile. Each game keeps its own color everywhere, and the letter is the cue that
 * does not depend on color (DESIGN.md). Decorative next to the game's name.
 */
export function GameMark({ game }: { game: GameId }) {
  const { t } = useTranslation();
  return (
    <span
      aria-hidden
      className={`game-mark inline-flex size-5 shrink-0 items-center justify-center rounded-md text-xs font-bold ${colors[game]}`}
    >
      {t(`game.letter.${game}`)}
    </span>
  );
}
