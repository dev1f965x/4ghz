// Smoke test of the packaged app (Design Doc, Testing): the build starts, shows its tabs,
// reports no CSP violations, saves a checked chore, and shows it again after a restart.
//
// The test build has its own identifier (tauri.e2e.conf.json), so its records live in a
// separate folder and the test never touches the records of an installed 4ghz.
//
// The app is a test build (pnpm app:build:e2e) whose WebView2 opens a debugging port through
// src-tauri/tauri.e2e.conf.json; release builds never have it. msedgedriver attaches to that
// port. The usual tauri-driver route passes the port in WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS,
// which WebView2 150 and later ignore in elevated processes such as GitHub's Windows runners
// (actions/runner-images#14738). Uses plain WebDriver over HTTP, so it needs no client library.
import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const app = resolve("src-tauri/target/e2e/release/4ghz.exe");
if (!existsSync(app)) throw new Error(`${app} is missing; run pnpm app:build:e2e first`);
// app_local_data_dir() of the test build, named by its identifier.
const { identifier } = JSON.parse(readFileSync("src-tauri/tauri.e2e.conf.json", "utf8"));
const stateFile = join(process.env.LOCALAPPDATA, identifier, "state.json");

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

/**
 * Polls `probe` every 200 ms for up to 30 seconds while `process` runs. A cold CI runner can
 * take more than 15 seconds to start WebView2 and load the page.
 */
async function waitFor(what, process, probe) {
  let lastError;
  for (let i = 0; i < 150 && process.exitCode === null; i++) {
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

async function debugPortOpen() {
  try {
    await fetch(`http://127.0.0.1:${debugPort}/json/version`);
    return true;
  } catch {
    // A refused connection means nothing listens on the port, which is the answer.
    return false;
  }
}

/** Resolves when the process exits, or rejects after `ms` milliseconds. */
function exited(child, ms) {
  if (child.exitCode !== null || child.signalCode !== null) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`pid ${child.pid} did not exit`)), ms);
    child.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

/**
 * Closes the window as a user would, so WebView2 shuts down normally, and waits until its
 * debugging port is closed. WebView2 runs in separate processes that outlive the app briefly;
 * a restart must not attach to them.
 */
async function close(appProcess) {
  if (appProcess.pid === undefined || appProcess.exitCode !== null) return;
  execFileSync("taskkill", ["/PID", String(appProcess.pid)], { stdio: "ignore" });
  try {
    await exited(appProcess, 10_000);
  } catch {
    // The window did not close in time; end the process instead.
    appProcess.kill();
    await exited(appProcess, 10_000);
  }
  for (let i = 0; i < 75 && (await debugPortOpen()); i++) await sleep(200);
  if (await debugPortOpen())
    throw new Error(`Port ${debugPort} is still open after the app closed`);
}

/**
 * Starts the app, attaches to it, checks it, and closes it again. With `check`, it opens the
 * Calendar and checks the first daily chore; without, it expects that chore to be checked.
 */
async function run(label, { check }) {
  if (await debugPortOpen()) {
    throw new Error(`Port ${debugPort} is already in use; the test would attach to the wrong app`);
  }
  const appProcess = start(app, []);
  let failure;
  try {
    // Waits for this app's page, not just any listener on the port.
    await waitFor("The app's page", appProcess, async () => {
      const response = await fetch(`http://127.0.0.1:${debugPort}/json/list`);
      const targets = await response.json();
      // An exact origin match; a prefix would also accept a host such as tauri.localhost.example.
      const page = targets.find(
        (t) =>
          t.type === "page" &&
          URL.canParse(t.url) &&
          new URL(t.url).origin === "http://tauri.localhost",
      );
      if (!page) {
        const seen = targets.map((t) => `${t.type} ${t.url}`).join(", ");
        throw new Error(`no app page among ${targets.length} targets: ${seen}`);
      }
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
      args: [check],
      script: `
        const check = arguments[0];
        const done = arguments[arguments.length - 1];
        const wait = (ms) => new Promise((r) => setTimeout(r, ms));
        (async () => {
          for (let i = 0; i < 50 && !document.documentElement.dataset.game; i++) await wait(100);
          const violations = [];
          new ReportingObserver((reports) => {
            for (const r of reports) violations.push(r.body.blockedURL + " " + r.body.effectiveDirective);
          }, { types: ["csp-violation"], buffered: true }).observe();
          await wait(500);
          // The data file shipped with the test build (.env.app-e2e) loads within 10 seconds.
          const sync = () => document.querySelector("[data-sync-status]")?.dataset.syncStatus;
          for (let i = 0; i < 100 && sync() === "loading"; i++) await wait(100);
          const tabs = [...document.querySelectorAll('[role="tab"]')];
          // The Calendar is the third tab; the restart opens it again as the last tab used.
          if (check) tabs[2]?.click();
          const chore = () => document.querySelector('[data-group="daily"] [role="checkbox"]');
          for (let i = 0; i < 50 && !chore(); i++) await wait(100);
          if (check) {
            chore()?.click();
            // Saving goes through IPC to disk; give it time before the window closes.
            await wait(1000);
          }
          done({
            game: document.documentElement.dataset.game ?? null,
            sync: sync() ?? null,
            chore: chore()?.getAttribute("aria-checked") ?? null,
            tabs: tabs.map((t) => t.textContent),
            styleElements: document.querySelectorAll("style").length,
            violations,
          });
        })();
      `,
    });
    // In attach mode this only detaches; close() below closes the app.
    await webdriver("DELETE", `/session/${session.sessionId}`);
    console.log(`${label}: ${JSON.stringify(result)}`);
    const problems = [];
    if (result.game !== "genshin") problems.push("the app did not render");
    if (result.tabs.length !== 3) problems.push(`expected 3 tabs, found ${result.tabs.length}`);
    if (result.sync !== "ok")
      problems.push(`the data file did not load (sync status ${result.sync})`);
    if (result.violations.length > 0) {
      problems.push(`CSP violations: ${result.violations.join(", ")}`);
    }
    if (result.styleElements > 0) problems.push("inline <style> elements, which the CSP blocks");
    if (result.chore !== "true")
      problems.push(`the first daily chore is not checked (${result.chore})`);
    if (problems.length > 0) throw new Error(`${label}: ${problems.join("; ")}`);
  } catch (error) {
    failure = error;
  }
  // A restart before this finishes would be handed to the closing process (single instance).
  try {
    await close(appProcess);
  } catch (error) {
    if (!failure) failure = error;
    else console.error(`Closing the app also failed: ${error.message}`);
  }
  if (failure) throw failure;
}

const driver = start(await nativeDriver(webView2Version()), [`--port=${driverPort}`]);
try {
  await waitFor("msedgedriver", driver, () => webdriver("GET", "/status"));
  // Every run starts from a first start; the folder belongs to the test build only.
  rmSync(stateFile, { force: true });
  await run("first start", { check: true });
  const saved = JSON.parse(readFileSync(stateFile, "utf8"));
  const checks = Object.values(saved.chores?.genshin?.dailyChecks ?? {});
  if (!checks.some((day) => Object.keys(day).length > 0)) {
    throw new Error(`state.json has no checked chore: ${JSON.stringify(saved.chores?.genshin)}`);
  }
  await run("restart", { check: false });
  console.log("App smoke test passed.");
} finally {
  driver.kill();
}
