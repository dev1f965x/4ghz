// Decides what a downloaded or cached data file means for the app: the schema version first,
// then the retired flag, and only then the whole file, so an app that meets a newer or retired
// file says it needs an update instead of "invalid".
import type { z } from "zod";
import { dataFileSchema } from "./schema";

type ParsedFile = z.infer<typeof dataFileSchema>;
/** A complete, valid data file. */
export type DataFile = Exclude<ParsedFile, { retired: true }>;

export type Classified =
  | { kind: "valid"; file: DataFile }
  | { kind: "retired" }
  | { kind: "unsupported"; schemaVersion: unknown }
  | { kind: "invalid"; issues: string[] };

/** The major schema version this app reads (data/v1.json). */
const SUPPORTED_SCHEMA_VERSION = 1;

export function classify(json: unknown): Classified {
  if (typeof json !== "object" || json === null || !("schemaVersion" in json)) {
    return { kind: "invalid", issues: ["schemaVersion: missing"] };
  }
  if (json.schemaVersion !== SUPPORTED_SCHEMA_VERSION) {
    return { kind: "unsupported", schemaVersion: json.schemaVersion };
  }
  if ("retired" in json && json.retired === true) return { kind: "retired" };
  const parsed = dataFileSchema.safeParse(json);
  if (!parsed.success) {
    return {
      kind: "invalid",
      issues: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
    };
  }
  // The retired branch was handled above, so a successful parse is a full file.
  return { kind: "valid", file: parsed.data as DataFile };
}
