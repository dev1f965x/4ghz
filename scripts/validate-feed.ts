import { readFileSync } from "node:fs";
import { Ajv2020 } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

/** The parts of a valid feed that the schema cannot check on its own. */
interface ValidFeed {
  events: { id: string }[];
  codes?: { game: string; code: string }[];
  dailies: Record<string, { id: string; from?: string; until?: string }[]>;
}

/**
 * Guards the published feed. Runs in CI before the feed is deployed, so a hand-edited
 * entry fails the pull request instead of emptying every installed app.
 */
function main(): void {
  const schema = JSON.parse(readFileSync("feed/schema.json", "utf8"));
  const feed = JSON.parse(readFileSync("feed/events.json", "utf8"));

  const ajv = new Ajv2020({ allErrors: true });
  addFormats(ajv);
  const validate = ajv.compile<ValidFeed>(schema);

  if (!validate(feed)) {
    for (const error of validate.errors ?? []) {
      console.error(`feed/events.json${error.instancePath} ${error.message}`);
    }
    process.exit(1);
  }

  const ids = new Set<string>();
  for (const event of feed.events) {
    if (ids.has(event.id)) {
      console.error(`feed/events.json duplicate id "${event.id}"`);
      process.exit(1);
    }
    ids.add(event.id);
  }

  const codes = new Set<string>();
  for (const code of feed.codes ?? []) {
    const key = `${code.game}:${code.code}`;
    if (codes.has(key)) {
      console.error(`feed/events.json duplicate code "${key}"`);
      process.exit(1);
    }
    codes.add(key);
  }

  let chores = 0;
  for (const [game, list] of Object.entries(feed.dailies)) {
    const choreIds = new Set<string>();
    for (const chore of list) {
      const where = `feed/events.json dailies.${game} "${chore.id}"`;
      if (choreIds.has(chore.id)) {
        console.error(`${where} is listed twice`);
        process.exit(1);
      }
      if (chore.from && chore.until && chore.until < chore.from) {
        console.error(`${where} ends before it starts`);
        process.exit(1);
      }
      choreIds.add(chore.id);
    }
    chores += list.length;
  }

  console.log(
    `feed/events.json is valid (${feed.events.length} events, ${codes.size} codes, ${chores} chores)`,
  );
}

main();
