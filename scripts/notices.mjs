// Writes public/third-party-notices.txt from the npm packages and Rust crates that ship in the app.
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// Fixed command strings, so running them through the shell (needed for pnpm.cmd on Windows) is safe.
const run = (cmd, args) =>
  execSync([cmd, ...args].join(" "), { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });

const npm = JSON.parse(run("pnpm", ["licenses", "list", "--prod", "--json"]));
const npmSections = [];
for (const [license, packages] of Object.entries(npm)) {
  for (const pkg of packages) {
    for (const [i, version] of pkg.versions.entries()) {
      const dir = pkg.paths[i];
      let text = "";
      for (const name of ["LICENSE", "LICENSE.md", "LICENSE.txt", "LICENSE-MIT"]) {
        try {
          text = readFileSync(join(dir, name), "utf8");
          break;
        } catch {
          // Try the next common license file name.
        }
      }
      if (!text) throw new Error(`No license file for ${pkg.name} ${version} (${license})`);
      npmSections.push(
        `${"=".repeat(80)}\n${pkg.name} ${version} (${license})\n\n${text.trim()}\n`,
      );
    }
  }
}

// cargo-about refuses to write to a redirected stdout under PowerShell, so it writes a file.
const rustFile = "src-tauri/target/rust-notices.txt";
run("cargo", [
  "about",
  "generate",
  "--manifest-path",
  "src-tauri/Cargo.toml",
  "--config",
  "about.toml",
  "--output-file",
  rustFile,
  "about.hbs",
]);
const rust = readFileSync(rustFile, "utf8");

writeFileSync(
  "public/third-party-notices.txt",
  `Third-party notices for 4ghz\n\nnpm packages\n\n${npmSections.join("\n")}\n${rust}`,
);
console.log("Wrote public/third-party-notices.txt");
