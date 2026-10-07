import { openUrl } from "@tauri-apps/plugin-opener";
import { type ComponentProps, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { logError } from "@/log";

/**
 * Opens a URL in the default browser and remembers whether that failed, for example without a
 * default browser, so the caller can say so instead of failing silently.
 */
export function useOpenUrl() {
  const [failed, setFailed] = useState(false);
  const open = (url: string) => {
    // Cleared first, so a repeated failure is announced again.
    setFailed(false);
    void openUrl(url).then(
      () => setFailed(false),
      (error: unknown) => {
        logError(`Opening ${url} failed`, error);
        setFailed(true);
      },
    );
  };
  return { open, failed };
}

/** The message shown next to whatever failed to open a link. */
export function OpenFailed() {
  const { t } = useTranslation();
  return (
    <span role="alert" className="text-sm">
      {t("links.openFailed")}
    </span>
  );
}

/** A button that opens `url` in the default browser, with the failure message beside it. */
export function ExternalLinkButton({
  url,
  children,
  ...props
}: { url: string } & Omit<ComponentProps<typeof Button>, "onClick">) {
  const { open, failed } = useOpenUrl();
  return (
    <span className="inline-flex flex-col items-end gap-1">
      <Button {...props} onClick={() => open(url)}>
        {children}
      </Button>
      {failed && <OpenFailed />}
    </span>
  );
}
