// Every schema imports z from here, so this setting is in place before any schema is built.
// Zod decides when a schema is built whether to compile parsers with new Function, and probes
// for that by calling it; the release CSP forbids eval, so the probe alone is a violation.
import { z } from "zod";

z.config({ jitless: true });

export { z };
