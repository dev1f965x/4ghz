import type { GameId } from "@/state/schema";

const colors: Record<GameId, string> = {
  genshin: "bg-genshin",
  hsr: "bg-hsr",
  zzz: "bg-zzz",
};

/** A small dot in the game's color, beside the game's name, which already identifies it. */
export function GameDot({ game }: { game: GameId }) {
  return <span aria-hidden className={`size-2.5 shrink-0 rounded-full ${colors[game]}`} />;
}
