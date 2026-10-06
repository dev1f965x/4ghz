import { CSPProvider } from "@base-ui/react/csp-provider";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { initI18n } from "./i18n";
import "./index.css";

// No language has been chosen in settings yet, so the Windows display language applies.
await initI18n(undefined);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    {/* The release CSP blocks inline <style> elements; index.css carries the rules Base UI would inject. */}
    <CSPProvider disableStyleElements>
      <App />
    </CSPProvider>
  </React.StrictMode>,
);
