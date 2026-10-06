// Writes public/third-party-notices.txt from the npm packages and Rust crates that ship in the app.
import { execSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Fixed command strings, so running them through the shell (needed for pnpm.cmd on Windows) is safe.
const run = (command) => execSync(command, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });

const licenseFileNames = [
  "LICENSE",
  "LICENSE.md",
  "LICENSE.txt",
  "LICENCE",
  "LICENCE.md",
  "LICENSE-MIT",
  "LICENSE-APACHE",
  "COPYING",
];

// Packages that keep their license file somewhere else, by package name.
const licensePaths = { pretendard: "dist/LICENSE.txt" };

// Packages that publish only an SPDX identifier; their upstream texts are kept in licenses/ (see licenses/README.md).
const storedLicenses = [
  {
    match: /^@tauri-apps\/plugin-/,
    files: [
      "licenses/tauri-plugins-workspace/LICENSE_MIT",
      "licenses/tauri-plugins-workspace/LICENSE_APACHE-2.0",
    ],
  },
];

// Files bundled from outside npm (see licenses/README.md).
const bundled = [
  {
    name: "JetBrains Mono 2.304 (OFL-1.1)",
    source: "https://github.com/JetBrains/JetBrainsMono/releases/tag/v2.304",
    file: "licenses/jetbrains-mono/OFL.txt",
  },
  {
    // Component source in src/components/ui and shadcn/tailwind.css come from shadcn/ui; the
    // shadcn package itself is a development dependency, so the npm list above omits it.
    name: "shadcn/ui (MIT)",
    source: "https://github.com/shadcn-ui/ui",
    file: "licenses/shadcn-ui/LICENSE.md",
  },
];

function readLicenseFile(dir, pkgName) {
  const names = licensePaths[pkgName] ? [licensePaths[pkgName]] : licenseFileNames;
  for (const name of names) {
    try {
      return readFileSync(join(dir, name), "utf8");
    } catch {
      // Try the next common license file name.
    }
  }
  return "";
}

function readStoredLicense(name) {
  const stored = storedLicenses.find((s) => s.match.test(name));
  return stored ? stored.files.map((file) => readFileSync(file, "utf8").trim()).join("\n\n") : "";
}

const npm = JSON.parse(run("pnpm licenses list --prod --json"));
const npmSections = [];
for (const [license, packages] of Object.entries(npm)) {
  for (const pkg of packages) {
    for (const [i, version] of pkg.versions.entries()) {
      const text = readLicenseFile(pkg.paths[i], pkg.name) || readStoredLicense(pkg.name);
      if (!text) throw new Error(`No license file for ${pkg.name} ${version} (${license})`);
      const source = `https://www.npmjs.com/package/${pkg.name}/v/${version}`;
      npmSections.push(
        `${"=".repeat(80)}\n${pkg.name} ${version} (${license})\nSource: ${source}\n\n${text.trim()}\n`,
      );
    }
  }
}

const bundledSections = bundled.map(
  (b) =>
    `${"=".repeat(80)}\n${b.name}\nSource: ${b.source}\n\n${readFileSync(b.file, "utf8").trim()}\n`,
);

// cargo-about refuses to write to a redirected stdout under PowerShell, so it writes a file.
const tempDir = mkdtempSync(join(tmpdir(), "notices-"));
const rustFile = join(tempDir, "rust.txt");
try {
  run(
    `cargo about generate --manifest-path src-tauri/Cargo.toml --config about.toml --output-file "${rustFile}" about.hbs`,
  );
  const rust = readFileSync(rustFile, "utf8");
  mkdirSync("public", { recursive: true });
  writeFileSync(
    "public/third-party-notices.txt",
    `Third-party notices for 4ghz\n\nnpm packages\n\n${npmSections.join("\n")}\nBundled files\n\n${bundledSections.join("\n")}\n${rust}`,
  );
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
console.log("Wrote public/third-party-notices.txt");
