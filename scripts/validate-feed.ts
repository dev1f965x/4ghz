import { readFileSync } from "node:fs";
import { Ajv2020 } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

/**
 * Guards the published feed. Runs in CI before the feed is deployed, so a hand-edited
 * entry fails the pull request instead of emptying every installed app.
 */
function main(): void {
  const schema = JSON.parse(readFileSync("feed/schema.json", "utf8"));
  const feed = JSON.parse(readFileSync("feed/events.json", "utf8"));

  const ajv = new Ajv2020({ allErrors: true });
  addFormats(ajv);
  const validate = ajv.compile(schema);

  if (!validate(feed)) {
    for (const error of validate.errors ?? []) {
      console.error(`feed/events.json${error.instancePath} ${error.message}`);
    }
    process.exit(1);
  }

  const ids = new Set<string>();
  for (const event of feed.events as { id: string }[]) {
    if (ids.has(event.id)) {
      console.error(`feed/events.json duplicate id "${event.id}"`);
      process.exit(1);
    }
    ids.add(event.id);
  }

  const codes = new Set<string>();
  for (const code of (feed.codes ?? []) as { game: string; code: string }[]) {
    const key = `${code.game}:${code.code}`;
    if (codes.has(key)) {
      console.error(`feed/events.json duplicate code "${key}"`);
      process.exit(1);
    }
    codes.add(key);
  }

  console.log(`feed/events.json is valid (${feed.events.length} events, ${codes.size} codes)`);
}

main();
