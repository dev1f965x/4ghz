import { dailies } from "../../feed/events.json";
import type { Chores } from "../domain/dailies";
import { parseDailies } from "../domain/feed";

/**
 * The chores the published feed listed when this build was made. The dailies tab uses them
 * until a fetched feed says otherwise, and whenever a feed publishes none. CI validates the
 * file before any build, so a parse failure here is a broken build, not a player's problem.
 */
export const BUILT_IN_CHORES: Chores = (() => {
  const parsed = parseDailies(dailies);
  if (!parsed.ok || !parsed.dailies) {
    throw new Error(`feed/events.json: ${parsed.ok ? "dailies is missing" : parsed.detail}`);
  }
  return parsed.dailies;
})();
