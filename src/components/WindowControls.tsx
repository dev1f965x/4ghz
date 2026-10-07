import { getCurrentWindow } from "@tauri-apps/api/window";
import { CopyIcon, MinusIcon, SquareIcon, XIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { logError } from "@/log";

/**
 * Minimize, maximize or restore, and close, for the custom title bar (the window has no system
 * frame). Sized and ordered like Windows' own caption buttons; reachable by keyboard as the
 * last controls in the header.
 */
export function WindowControls() {
  const { t } = useTranslation();
  const [maximized, setMaximized] = useState(false);
  useEffect(() => {
    const appWindow = getCurrentWindow();
    const update = () =>
      appWindow
        .isMaximized()
        .then(setMaximized, (error: unknown) => logError("Reading the window state failed", error));
    void update();
    // Snapping, double-clicking the title bar, and Win+Up all resize the window.
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  const run = (action: string, call: () => Promise<void>) => () =>
    call().catch((error: unknown) => logError(`${action} the window failed`, error));
  const appWindow = getCurrentWindow();
  const button =
    "inline-flex h-full w-11 items-center justify-center text-foreground hover:bg-muted focus-visible:-outline-offset-2";
  return (
    <div className="flex h-12 shrink-0 self-start">
      <button
        type="button"
        className={button}
        aria-label={t("window.minimize")}
        onClick={run("Minimizing", () => appWindow.minimize())}
      >
        <MinusIcon aria-hidden className="size-4" />
      </button>
      <button
        type="button"
        className={button}
        aria-label={maximized ? t("window.restore") : t("window.maximize")}
        onClick={run("Maximizing", () => appWindow.toggleMaximize())}
      >
        {maximized ? (
          <CopyIcon aria-hidden className="size-3.5 -scale-x-100" />
        ) : (
          <SquareIcon aria-hidden className="size-3.5" />
        )}
      </button>
      <button
        type="button"
        className={`${button} hover:bg-destructive hover:text-background`}
        aria-label={t("window.close")}
        onClick={run("Closing", () => appWindow.close())}
      >
        <XIcon aria-hidden className="size-4" />
      </button>
    </div>
  );
}
