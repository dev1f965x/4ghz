import { CSPProvider } from "@base-ui/react/csp-provider";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { startDataSync } from "./data/store";
import { initI18n } from "./i18n";
import { getLocalState, loadLocalState } from "./state/app-state";
import { startUpdateCheck } from "./update/store";
import "./index.css";

if (import.meta.env.MODE === "e2e") {
  // Statically false in production builds, so the mocks are never bundled there.
  const { installE2eMocks } = await import("./e2e-mocks");
  installE2eMocks();
}

// The data cache does not depend on local state, so it is read while state.json loads; this
// keeps cached data within the startup target.
startDataSync();
startUpdateCheck();
// The stored language, if the user chose one, applies from the first render.
await loadLocalState();
await initI18n(getLocalState().settings.locale);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    {/* The release CSP blocks inline <style> elements; index.css carries the rules Base UI would inject. */}
    <CSPProvider disableStyleElements>
      <App />
    </CSPProvider>
  </React.StrictMode>,
);
