import { CSPProvider } from "@base-ui/react/csp-provider";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { startDataSync } from "./data/store";
import { initI18n } from "./i18n";
import "./index.css";

if (import.meta.env.MODE === "e2e") {
  // Statically false in production builds, so the mocks are never bundled there.
  const { installE2eMocks } = await import("./e2e-mocks");
  installE2eMocks();
}

// No language has been chosen in settings yet, so the Windows display language applies.
await initI18n(undefined);
startDataSync();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    {/* The release CSP blocks inline <style> elements; index.css carries the rules Base UI would inject. */}
    <CSPProvider disableStyleElements>
      <App />
    </CSPProvider>
  </React.StrictMode>,
);
