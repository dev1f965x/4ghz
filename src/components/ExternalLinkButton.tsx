import { openUrl } from "@tauri-apps/plugin-opener";
import { type ComponentProps, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { logError } from "@/log";

/**
 * A button that opens `url` in the default browser. If the browser cannot be opened, for example
 * without a default browser, it says so next to itself instead of failing silently.
 */
export function ExternalLinkButton({
  url,
  children,
  ...props
}: { url: string } & Omit<ComponentProps<typeof Button>, "onClick">) {
  const { t } = useTranslation();
  const [failed, setFailed] = useState(false);
  return (
    <span className="inline-flex flex-col items-end gap-1">
      <Button
        {...props}
        onClick={() => {
          // Cleared first, so a repeated failure is announced again.
          setFailed(false);
          void openUrl(url).then(
            () => setFailed(false),
            (error: unknown) => {
              logError(`Opening ${url} failed`, error);
              setFailed(true);
            },
          );
        }}
      >
        {children}
      </Button>
      {failed && (
        <span role="alert" className="text-sm">
          {t("links.openFailed")}
        </span>
      )}
    </span>
  );
}
