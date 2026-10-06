// Writes data/v1.schema.json, the JSON Schema editors use for data/v1.json, from the Zod schema.
// With --check, fails when the file is out of date. Cross-field rules (unique ids, overlaps,
// allowed links) exist only in the Zod schema; CI runs them in src/data/schema.test.ts.
import { readFileSync, writeFileSync } from "node:fs";
import { z } from "zod";
import { strictDataFileSchema } from "../src/data/schema.ts";

const file = "data/v1.schema.json";
const schema = z.toJSONSchema(strictDataFileSchema, {
  io: "input",
  unrepresentable: "any",
  // The three games share one definition instead of three inlined copies.
  reused: "ref",
});
const text = `${JSON.stringify(schema, null, 2)}\n`;

if (process.argv.includes("--check")) {
  if (readFileSync(file, "utf8") !== text) {
    console.error(`${file} is out of date. Run pnpm data-schema.`);
    process.exit(1);
  }
  console.log(`${file} is up to date.`);
} else {
  writeFileSync(file, text);
  console.log(`Wrote ${file}.`);
}
