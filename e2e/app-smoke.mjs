// Smoke test of the packaged app (Design Doc, Testing): the build starts, shows its tabs,
// reports no CSP violations, and starts again after it is closed.
//
// The app is a test build (pnpm app:build:e2e) whose WebView2 opens a debugging port through
// src-tauri/tauri.e2e.conf.json; release builds never have it. msedgedriver attaches to that
// port. The usual tauri-driver route passes the port in WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS,
// which WebView2 150 and later ignore in elevated processes such as GitHub's Windows runners
// (actions/runner-images#14738). Uses plain WebDriver over HTTP, so it needs no client library.
import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const app = resolve("src-tauri/target/e2e/release/4ghz.exe");
if (!existsSync(app)) throw new Error(`${app} is missing; run pnpm app:build:e2e first`);

const debugPort = 9222;
const driverPort = 4444;
const driverBase = `http://127.0.0.1:${driverPort}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * msedgedriver must match the installed WebView2 runtime exactly. The runtime registers per
 * machine or per user; an empty or 0.0.0.0 version means it is not installed there.
 */
function webView2Version() {
  const client = "Microsoft\\EdgeUpdate\\Clients\\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}";
  const keys = [`HKLM\\SOFTWARE\\WOW6432Node\\${client}`, `HKCU\\Software\\${client}`];
  for (const key of keys) {
    let output;
    try {
      output = execFileSync("reg", ["query", key, "/v", "pv"], { encoding: "utf8", stdio: "pipe" });
    } catch {
      // reg exits non-zero when the key is missing; try the next location.
      continue;
    }
    const version = output.match(/pv\s+REG_SZ\s+([\d.]+)/)?.[1];
    if (version && version !== "0.0.0.0") return version;
  }
  throw new Error(`WebView2 runtime version not found in ${keys.join(" or ")}`);
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
  // Windows' own tar reads zip files; a GNU tar earlier on PATH (Git Bash) cannot.
  execFileSync(join(process.env.SystemRoot, "System32", "tar.exe"), ["-xf", zip, "-C", dir]);
  return exe;
}

async function webdriver(method, path, body) {
  const response = await fetch(`${driverBase}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await response.json();
  if (!response.ok) throw new Error(`${method} ${path}: ${JSON.stringify(json.value)}`);
  return json.value;
}

/** Polls `probe` every 200 ms for up to 15 seconds while `process` runs. */
async function waitFor(what, process, probe) {
  let lastError;
  for (let i = 0; i < 75 && process.exitCode === null; i++) {
    try {
      await probe();
      return;
    } catch (error) {
      // Refused connections are expected while it starts; the last one is reported.
      lastError = error;
      await sleep(200);
    }
  }
  throw new Error(`${what} did not start (exit code ${process.exitCode})`, { cause: lastError });
}

function start(command, args) {
  const child = spawn(command, args, { stdio: ["ignore", "inherit", "inherit"] });
  child.on("error", (error) => console.error(`${command} could not start: ${error.message}`));
  return child;
}

/** Starts the app, attaches to it, checks it, and closes it again. */
async function run(label) {
  const appProcess = start(app, []);
  let failure;
  try {
    await waitFor("The app's debugging port", appProcess, async () => {
      const response = await fetch(`http://127.0.0.1:${debugPort}/json/version`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
    });
    const session = await webdriver("POST", "/session", {
      capabilities: {
        alwaysMatch: {
          browserName: "webview2",
          "ms:edgeOptions": { debuggerAddress: `127.0.0.1:${debugPort}` },
        },
      },
    });
    // ReportingObserver with buffered: true also returns violations from before this script ran.
    const result = await webdriver("POST", `/session/${session.sessionId}/execute/async`, {
      args: [],
      script: `
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
      `,
    });
    // Detaches without closing the app; the app is closed below like a user would.
    await webdriver("DELETE", `/session/${session.sessionId}`);
    console.log(`${label}: ${JSON.stringify(result)}`);
    const problems = [];
    if (result.game !== "genshin") problems.push("the app did not render");
    if (result.tabs.length !== 3) problems.push(`expected 3 tabs, found ${result.tabs.length}`);
    if (result.violations.length > 0) {
      problems.push(`CSP violations: ${result.violations.join(", ")}`);
    }
    if (result.styleElements > 0) problems.push("inline <style> elements, which the CSP blocks");
    if (problems.length > 0) throw new Error(`${label}: ${problems.join("; ")}`);
  } catch (error) {
    failure = error;
  }
  appProcess.kill();
  // The single-instance plugin would hand a restart to a process that is still closing.
  while (appProcess.exitCode === null && appProcess.signalCode === null) await sleep(100);
  if (failure) throw failure;
}

const driver = start(await nativeDriver(webView2Version()), [`--port=${driverPort}`]);
try {
  await waitFor("msedgedriver", driver, () => webdriver("GET", "/status"));
  await run("first start");
  await run("restart");
  console.log("App smoke test passed.");
} finally {
  driver.kill();
}
