// Fails when an npm dependency uses a license outside the allow-lists (handbook conventions, section 7).
import { execSync } from "node:child_process";

// Shipped with the app.
const shipped = new Set([
  "MIT",
  "Apache-2.0",
  "MIT OR Apache-2.0",
  "Apache-2.0 OR MIT",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "ISC",
  "0BSD",
  "OFL-1.1",
]);
// Development tools only; never bundled into the app.
const devOnly = new Set([
  ...shipped,
  // lightningcss is Vite's CSS minifier; it runs at build time and is not shipped.
  "MPL-2.0",
]);

function licenses(args) {
  // A fixed command string; pnpm is a .cmd shim on Windows, so it runs through the shell.
  const out = execSync(["pnpm licenses list --json", ...args].join(" "), { encoding: "utf8" });
  return JSON.parse(out);
}

let failed = false;
for (const [scope, args, allowed] of [
  ["shipped", ["--prod"], shipped],
  ["all", [], devOnly],
]) {
  for (const [license, packages] of Object.entries(licenses(args))) {
    if (!allowed.has(license)) {
      failed = true;
      console.error(
        `${scope}: ${license} is not allowed: ${packages.map((p) => p.name).join(", ")}`,
      );
    }
  }
}
if (failed) process.exit(1);
console.log("Licenses: all allowed");
