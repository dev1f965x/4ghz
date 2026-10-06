// Smoke test of the packaged app through tauri-driver (Design Doc, Testing): the release build
// starts, shows its tabs, reports no CSP violations, and starts again after it is closed.
// Run after pnpm app:build. Uses plain WebDriver over HTTP, so it needs no client library.
import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const app = resolve("src-tauri/target/release/4ghz.exe");
if (!existsSync(app)) throw new Error(`${app} is missing; run pnpm app:build first`);

/** msedgedriver must match the installed WebView2 runtime exactly. */
function webView2Version() {
  const key =
    "HKLM\\SOFTWARE\\WOW6432Node\\Microsoft\\EdgeUpdate\\Clients\\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}";
  const output = execFileSync("reg", ["query", key, "/v", "pv"], { encoding: "utf8" });
  const match = output.match(/pv\s+REG_SZ\s+([\d.]+)/);
  if (!match) throw new Error(`WebView2 version not found in ${key}`);
  return match[1];
}

async function nativeDriver(version) {
  const dir = resolve("node_modules/.cache/msedgedriver", version);
  const exe = join(dir, "msedgedriver.exe");
  if (existsSync(exe)) return exe;
  mkdirSync(dir, { recursive: true });
  const url = `https://msedgedriver.microsoft.com/${version}/edgedriver_win64.zip`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Downloading ${url} failed: HTTP ${response.status}`);
  const zip = join(dir, "edgedriver.zip");
  writeFileSync(zip, Buffer.from(await response.arrayBuffer()));
  // tar ships with Windows 10 and later and reads zip files.
  execFileSync("tar", ["-xf", zip, "-C", dir]);
  return exe;
}

const port = 4444;
const base = `http://127.0.0.1:${port}`;

async function webdriver(method, path, body) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await response.json();
  if (!response.ok) throw new Error(`${method} ${path}: ${JSON.stringify(json.value)}`);
  return json.value;
}

async function waitForDriver() {
  for (let i = 0; i < 50; i++) {
    try {
      await webdriver("GET", "/status");
      return;
    } catch {
      // The driver is still starting; the loop gives up after 10 seconds.
      await new Promise((r) => setTimeout(r, 200));
    }
  }
  throw new Error("tauri-driver did not start");
}

/** Starts the app, checks it, and closes it again. */
async function run(label) {
  const session = await webdriver("POST", "/session", {
    capabilities: { alwaysMatch: { "tauri:options": { application: app } } },
  });
  const id = session.sessionId;
  try {
    const script = (source, args = []) =>
      webdriver("POST", `/session/${id}/execute/async`, { script: source, args });
    // ReportingObserver with buffered: true also returns violations from before this script ran.
    const result = await script(`
      const done = arguments[arguments.length - 1];
      const wait = (ms) => new Promise((r) => setTimeout(r, ms));
      (async () => {
        for (let i = 0; i < 50 && !document.documentElement.dataset.game; i++) await wait(100);
        const violations = [];
        new ReportingObserver((reports) => {
          for (const r of reports) violations.push(r.body.blockedURL + " " + r.body.effectiveDirective);
        }, { types: ["csp-violation"], buffered: true }).observe();
        await wait(500);
        done({
          game: document.documentElement.dataset.game ?? null,
          tabs: [...document.querySelectorAll('[role="tab"]')].map((t) => t.textContent),
          styleElements: document.querySelectorAll("style").length,
          violations,
        });
      })();
    `);
    console.log(`${label}: ${JSON.stringify(result)}`);
    const problems = [];
    if (result.game !== "genshin") problems.push("the app did not render");
    if (result.tabs.length !== 3) problems.push(`expected 3 tabs, found ${result.tabs.length}`);
    if (result.violations.length > 0)
      problems.push(`CSP violations: ${result.violations.join(", ")}`);
    if (result.styleElements > 0) problems.push("inline <style> elements, which the CSP blocks");
    if (problems.length > 0) throw new Error(`${label}: ${problems.join("; ")}`);
  } finally {
    await webdriver("DELETE", `/session/${id}`);
  }
}

const driverPath = await nativeDriver(webView2Version());
const driver = spawn("tauri-driver", ["--port", String(port), "--native-driver", driverPath], {
  stdio: ["ignore", "inherit", "inherit"],
});
try {
  await waitForDriver();
  await run("first start");
  await run("restart");
  console.log("App smoke test passed.");
} finally {
  driver.kill();
}
