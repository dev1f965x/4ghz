// Fails when an npm dependency uses a license outside the project's license policy.
import { execSync } from "node:child_process";

// Shipped with the app: permissive licenses, the same set deny.toml allows for Rust crates, plus OFL for fonts.
const shipped = new Set([
  "MIT",
  "Apache-2.0",
  "MIT OR Apache-2.0",
  "Apache-2.0 OR MIT",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "ISC",
  "Zlib",
  "0BSD",
  "CC0-1.0",
  "MIT-0",
  "Unlicense",
  "Unicode-3.0",
  "OFL-1.1",
]);

// Development tools only, never bundled into the app; each exception names its packages.
const devExceptions = {
  // lightningcss is Vite's CSS minifier; it runs at build time and is not shipped.
  "MPL-2.0": /^lightningcss(-.+)?$/,
  // The rest come only through the shadcn CLI (pnpm why), which adds component source files.
  // Python-2.0 and BlueOak-1.0.0 are permissive; caniuse-lite is browser data under CC-BY-4.0.
  "Python-2.0": /^argparse$/,
  "BlueOak-1.0.0": /^(isexe|minimatch)$/,
  "CC-BY-4.0": /^caniuse-lite$/,
  "(MIT OR CC0-1.0)": /^type-fest$/,
};

function licenses(scope) {
  // A fixed command string; pnpm is a .cmd shim on Windows, so it runs through the shell.
  const flag = scope === "shipped" ? " --prod" : "";
  return JSON.parse(execSync(`pnpm licenses list --json${flag}`, { encoding: "utf8" }));
}

let failed = false;
for (const scope of ["shipped", "all"]) {
  for (const [license, packages] of Object.entries(licenses(scope))) {
    if (shipped.has(license)) continue;
    const exception = scope === "all" ? devExceptions[license] : undefined;
    for (const pkg of packages) {
      if (exception?.test(pkg.name)) continue;
      failed = true;
      console.error(`${scope}: ${pkg.name} uses ${license}, which is not allowed`);
    }
  }
}
if (failed) process.exit(1);
console.log("Licenses: all allowed");
