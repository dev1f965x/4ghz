import { Dialog } from "@base-ui/react/dialog";
import { openUrl } from "@tauri-apps/plugin-opener";
import { ExternalLinkIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { issuesUrl } from "@/links";
import { logError } from "@/log";
import licenseText from "../../LICENSE?raw";

/** About (PRD FR6): version, notices, privacy, licenses, and feedback. */
export function About() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-base font-bold">{t("about.version", { version: __APP_VERSION__ })}</h2>
      <p>{t("about.unofficial")}</p>
      <p className="text-sm text-muted-foreground">{t("about.trademarks")}</p>
      <h3 className="font-bold">{t("about.privacyTitle")}</h3>
      <p className="text-sm text-muted-foreground">{t("about.privacy")}</p>
      <div className="flex flex-wrap gap-2 pt-1">
        <TextDialog label={t("about.license")} load={() => Promise.resolve(licenseText)} />
        <TextDialog label={t("about.notices")} load={loadNotices} />
        <Button
          variant="outline"
          onClick={() =>
            openUrl(issuesUrl).catch((error: unknown) =>
              logError("Opening the issues page failed", error),
            )
          }
        >
          {t("about.feedback")}
          <ExternalLinkIcon aria-hidden data-icon="inline-end" />
        </Button>
      </div>
    </div>
  );
}

// Generated at app build time (pnpm notices) and served with the app.
async function loadNotices() {
  const response = await fetch("/third-party-notices.txt");
  if (!response.ok) throw new Error(`third-party-notices.txt answered ${response.status}`);
  return response.text();
}

/** A button that opens a long text, such as a license, in a scrollable dialog. */
function TextDialog({ label, load }: { label: string; load: () => Promise<string> }) {
  const { t } = useTranslation();
  const [text, setText] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  return (
    <Dialog.Root
      onOpenChange={(open) => {
        if (!open || text !== null) return;
        load().then(setText, (error: unknown) => {
          logError(`Loading "${label}" failed`, error);
          setFailed(true);
        });
      }}
    >
      <Dialog.Trigger render={<Button variant="outline" />}>{label}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 isolate z-50 bg-foreground/20 dark:bg-background/70" />
        <Dialog.Popup className="fixed inset-4 z-50 mx-auto flex max-w-2xl flex-col gap-3 rounded-lg border border-input bg-popover p-4 text-popover-foreground">
          <Dialog.Title className="font-bold">{label}</Dialog.Title>
          {/* Focusable, so the text scrolls with the keyboard. */}
          <pre
            // biome-ignore lint/a11y/noNoninteractiveTabindex: a scrollable region must be reachable by keyboard (WCAG 2.1.1).
            tabIndex={0}
            className="min-h-0 grow overflow-auto rounded-md border bg-card p-3 font-mono text-xs whitespace-pre-wrap"
          >
            {failed ? t("about.loadFailed") : (text ?? t("sync.loading"))}
          </pre>
          <div className="flex justify-end">
            <Dialog.Close render={<Button variant="outline" />}>{t("about.close")}</Dialog.Close>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
