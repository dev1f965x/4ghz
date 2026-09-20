import { readFileSync } from "node:fs";

/**
 * Tauri refuses to build when a plugin's Rust crate and its npm package are on different
 * minor releases, and it only says so once a bundle is already being built. This runs in
 * seconds, so the pull request fails instead of the release.
 */
interface Package {
  name: string;
  version: string;
}

function main(): void {
  const crates = readCrates();
  const packages = readPackages();

  const mismatched = [...packages].filter(([name, version]) => {
    const crate = crates.get(name);
    return crate !== undefined && minor(crate) !== minor(version);
  });

  for (const [name, version] of mismatched) {
    console.error(
      `tauri-plugin-${name} (${crates.get(name)}) : @tauri-apps/plugin-${name} (${version})`,
    );
  }

  if (mismatched.length > 0) {
    console.error("Rust crates and npm packages must share a minor release.");
    process.exit(1);
  }

  console.log(`${packages.size} Tauri plugins match their crates`);
}

/** Plugin name to the version Cargo resolved, read from the lock rather than the range. */
function readCrates(): Map<string, string> {
  const lock = readFileSync("src-tauri/Cargo.lock", "utf8");
  const entries = lock.matchAll(/name = "tauri-plugin-([a-z-]+)"\nversion = "([^"]+)"/g);

  return new Map([...entries].map(([, name, version]) => [name, version]));
}

/** Plugin name to the version npm installed. */
function readPackages(): Map<string, string> {
  const lock = JSON.parse(readFileSync("package-lock.json", "utf8"));
  const installed = Object.entries(lock.packages as Record<string, Package>);

  return new Map(
    installed
      .filter(([path]) => path.startsWith("node_modules/@tauri-apps/plugin-"))
      .map(([path, entry]) => [path.replace("node_modules/@tauri-apps/plugin-", ""), entry.version]),
  );
}

/** Major and minor only; Tauri allows the patch levels to drift. */
function minor(version: string): string {
  return version.split(".").slice(0, 2).join(".");
}

main();
