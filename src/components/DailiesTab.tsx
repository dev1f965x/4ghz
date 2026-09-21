import {
  CHORES,
  type Chore,
  type DailyRecords,
  type GameDay,
  gameDay,
  isDone,
  streak,
} from "../domain/dailies";
import { GAMES, type Game } from "../domain/event";
import { type GameFilter, matchesFilter } from "../domain/filter";
import { CHORE_LABELS, DAILIES_LABELS, formatGameDay, GAME_LABELS } from "../domain/labels";
import { MonthCalendar } from "./MonthCalendar";
import { Notice } from "./Notice";
import "./DailiesTab.css";

interface Props {
  records: DailyRecords;
  filter: GameFilter;
  now: Date;
  onToggleChore: (day: GameDay, game: Game, chore: Chore) => void;
  onToggleGame: (game: Game) => void;
}

/**
 * Today's chores and a month of finished days, for the games the player tracks — narrowed
 * to one when the window is looking at one.
 */
export function DailiesTab({ records, filter, now, onToggleChore, onToggleGame }: Props) {
  const today = gameDay(now);
  const games = records.games.filter((game) => matchesFilter(game, filter));

  return (
    <div className="dailies">
      <fieldset className="dailies__games">
        <legend className="visually-hidden">{DAILIES_LABELS.games}</legend>
        {GAMES.map((game) => (
          <button
            key={game}
            type="button"
            className="dailies__game"
            data-game={game}
            aria-pressed={records.games.includes(game)}
            onClick={() => onToggleGame(game)}
          >
            {GAME_LABELS[game]}
          </button>
        ))}
      </fieldset>

      {filter !== "all" && games.length === 0 ? (
        <Notice
          title={DAILIES_LABELS.notTracked(GAME_LABELS[filter])}
          action={{ label: DAILIES_LABELS.track, onAction: () => onToggleGame(filter) }}
        />
      ) : games.length === 0 ? (
        <Notice title={DAILIES_LABELS.noGames} />
      ) : (
        <>
          <section className="dailies__today" aria-labelledby="dailies-today">
            <header className="dailies__heading">
              <h2 id="dailies-today">{formatGameDay(today)}</h2>
              <p>{DAILIES_LABELS.resetHint}</p>
            </header>

            <ul className="dailies__rows">
              {games.map((game) => (
                <li key={game} className="dailies__row" data-game={game}>
                  <span className="dailies__name">{GAME_LABELS[game]}</span>
                  <div className="dailies__chores">
                    {CHORES[game].map((chore) => (
                      <label key={chore} className="dailies__chore">
                        <input
                          type="checkbox"
                          checked={isDone(records, today, game, chore)}
                          onChange={() => onToggleChore(today, game, chore)}
                        />
                        {CHORE_LABELS[chore]}
                      </label>
                    ))}
                  </div>
                  <span className="dailies__streak">
                    {DAILIES_LABELS.streak(streak(records, game, today))}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <MonthCalendar records={records} games={games} today={today} />
        </>
      )}
    </div>
  );
}
