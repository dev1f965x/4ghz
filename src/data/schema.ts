// The data file schema, version 1 (Design Doc, "Data file"). One definition serves two modes:
// the app strips keys it does not know, so additive changes stay compatible, and CI rejects them,
// so a file with a typo cannot be published.
// Imports carry the .ts extension so Node can load this file directly (scripts/data-schema.mjs).
import { z } from "zod";
import { type Region, type Time, toInstant } from "../time/clock.ts";

// Zod compiles object parsers with new Function when it can, and probes for that ability. The
// release CSP forbids eval, so the probe alone is a violation; jitless skips both.
z.config({ jitless: true });

const regions: readonly Region[] = ["asia", "america", "europe", "tw_hk_mo"];

// Links open only official game sites (PRD, Security).
const allowedHost = /^(?:[a-z0-9-]+\.)*(?:hoyoverse|hoyolab)\.com$/;

/** The instant on the Asia server, or null when the time is malformed or out of range. */
function asiaInstant(time: Time): number | null {
  try {
    return toInstant(time, "asia");
  } catch {
    // toInstant throws on malformed or out-of-range times; the field's own check reports them.
    return null;
  }
}

const isValid = (time: Time) => asiaInstant(time) !== null;

/** True when `end` is after `start` on every server, which matters when the two use different kinds. */
function endsAfterStart(start: Time, end: Time): boolean {
  return regions.every((region) => toInstant(end, region) > toInstant(start, region));
}

/** Why a link is not allowed, or null. Only the canonical form passes, so CI checks the URL the app opens. */
function linkProblem(value: string): string | null {
  // The url check reports unparsable strings; this one must not throw on them.
  if (!URL.canParse(value)) return null;
  const url = new URL(value);
  if (url.port !== "" || url.username !== "" || url.password !== "") {
    return "Use a link without a port or user name";
  }
  return url.href === value ? null : `Write the link as ${url.href}`;
}

function build(strict: boolean) {
  const object = <T extends z.core.$ZodLooseShape>(shape: T) =>
    strict ? z.strictObject(shape) : z.object(shape);
  const text = object({ ko: z.string().min(1), en: z.string().min(1).optional() });
  const instant = object({ kind: z.literal("instant"), at: z.string() }).refine(isValid, {
    message: "Use ISO 8601 with an offset, for example 2026-11-04T06:00:00+08:00",
  });
  const server = object({ kind: z.literal("server"), at: z.string() }).refine(isValid, {
    message: "Use YYYY-MM-DDTHH:mm on the server clock, for example 2026-11-04T04:00",
  });
  const anyTime = z.union([instant, server]);
  const isoInstant = z.string().refine((at) => isValid({ kind: "instant", at }), {
    message: "Use ISO 8601 with an offset",
  });
  const link = z.url({ protocol: /^https$/, hostname: allowedHost }).superRefine((value, ctx) => {
    const problem = linkProblem(value);
    if (problem) ctx.addIssue({ code: "custom", message: problem });
  });
  const id = z.string().regex(/^[a-z0-9][a-z0-9-]*$/, "Use lowercase letters, digits, and hyphens");

  // Allowed time kinds per entry type (Design Doc, "Allowed time kinds").
  // estimated marks a date worked out from the usual cycle before an official announcement; the Schedule tab labels it (GHZ-16).
  const entryBase = {
    id,
    title: text,
    url: link.optional(),
    estimated: z.literal(true).optional(),
  };
  const scheduleEntry = z.discriminatedUnion("type", [
    object({
      ...entryBase,
      type: z.enum(["livestream", "update", "maintenance"]),
      start: instant,
      end: instant.optional(),
    }),
    object({ ...entryBase, type: z.literal("event"), start: anyTime, end: anyTime.optional() }),
    object({ ...entryBase, type: z.literal("endgame"), start: server, end: server.optional() }),
  ]);

  const code = object({
    code: z.string().regex(/^[A-Za-z0-9]+$/, "Codes use letters and digits only"),
    rewards: text,
    addedAt: isoInstant,
    expires: anyTime.optional(),
  });

  const chore = object({
    id,
    name: text,
    cycle: z.enum(["daily", "weekly", "periodic"]),
    enabledByDefault: z.boolean(),
  });

  const period = object({ id, choreId: id, start: server, end: server });

  const game = object({
    schedule: z.array(scheduleEntry),
    codes: z.array(code),
    chores: z.array(chore),
    periods: z.array(period),
  }).superRefine((g, ctx) => {
    const issue = (path: (string | number)[], message: string) =>
      ctx.addIssue({ code: "custom", path, message });

    const unique = (key: string, values: string[], normalize = (v: string) => v) => {
      const seen = new Set<string>();
      values.forEach((value, i) => {
        if (seen.has(normalize(value))) issue([key, i], `Duplicate ${value}`);
        seen.add(normalize(value));
      });
    };
    unique(
      "schedule",
      g.schedule.map((e) => e.id),
    );
    unique(
      "codes",
      g.codes.map((c) => c.code),
      (code) => code.toUpperCase(),
    );
    unique(
      "chores",
      g.chores.map((c) => c.id),
    );
    unique(
      "periods",
      g.periods.map((p) => p.id),
    );

    // Field checks still run after a time fails its own check, so comparisons skip invalid times.
    const comparable = (...times: Time[]) => times.every(isValid);

    g.schedule.forEach((e, i) => {
      if (e.end && comparable(e.start, e.end) && !endsAfterStart(e.start, e.end)) {
        issue(["schedule", i, "end"], "End is not after start");
      }
    });

    const periodic = new Set(g.chores.filter((c) => c.cycle === "periodic").map((c) => c.id));
    g.periods.forEach((p, i) => {
      if (!periodic.has(p.choreId)) {
        issue(["periods", i, "choreId"], `${p.choreId} is not a periodic chore`);
      }
      if (comparable(p.start, p.end) && !endsAfterStart(p.start, p.end)) {
        issue(["periods", i, "end"], "End is not after start");
      }
    });
    // Periods are server times, so their order is the same on every server. Intervals are
    // [start, end): a period may start exactly when an earlier one ends.
    for (const choreId of periodic) {
      const own = g.periods
        .map((p, i) => ({ id: p.id, i, start: asiaInstant(p.start), end: asiaInstant(p.end) }))
        .filter(
          (p): p is typeof p & { start: number; end: number } => p.start !== null && p.end !== null,
        )
        .filter(({ i }) => g.periods[i].choreId === choreId)
        .sort((a, b) => a.start - b.start);
      let latest: (typeof own)[number] | undefined;
      for (const p of own) {
        if (latest && p.start < latest.end)
          issue(["periods", p.i, "start"], `Overlaps period ${latest.id}`);
        if (!latest || p.end > latest.end) latest = p;
      }
    }
  });

  // An editor hint, not data; allowed so the file can point to its JSON Schema.
  const schemaRef = { $schema: z.string().optional() };
  const full = object({
    ...schemaRef,
    schemaVersion: z.literal(1),
    updatedAt: isoInstant,
    games: object({ genshin: game, hsr: game, zzz: game }),
  });
  // A major version that is no longer maintained is replaced by this stub (Design Doc,
  // "Validation and compatibility").
  const retired = object({
    ...schemaRef,
    schemaVersion: z.literal(1),
    retired: z.literal(true),
    updatedAt: isoInstant,
  });
  return { full, retired, file: z.union([retired, full]) };
}

const app = build(false);
const ci = build(true);

/** The app's schema: unknown keys are stripped, and a file marked retired reads as retired. */
export const dataFileSchema = app.file;
/** CI's schema: unknown keys are errors. */
export const strictDataFileSchema = ci.file;

/**
 * CI's schema for one file, picked by its retired flag, so errors point at the field instead of
 * a single "invalid input" for the whole union.
 */
export function strictSchemaFor(content: unknown) {
  const retired =
    typeof content === "object" &&
    content !== null &&
    "retired" in content &&
    content.retired === true;
  return retired ? ci.retired : ci.full;
}
