import { GAMES, type Game } from "../domain/event";
import { GAME_LABELS, THEME_LABEL } from "../domain/labels";
import "./GamePicker.css";

interface Props {
  game: Game;
  onChoose: (game: Game) => void;
}

/** Picks the game whose colour the window wears. A native select, dressed to match. */
export function GamePicker({ game, onChoose }: Props) {
  return (
    <label className="game-picker">
      <span className="visually-hidden">{THEME_LABEL}</span>
      <select value={game} onChange={(event) => onChoose(event.target.value as Game)}>
        {GAMES.map((each) => (
          <option key={each} value={each}>
            {GAME_LABELS[each]}
          </option>
        ))}
      </select>
    </label>
  );
}
