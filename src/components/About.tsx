import { Dialog } from "@base-ui/react/dialog";
import { ExternalLinkIcon } from "lucide-react";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { ExternalLinkButton } from "@/components/ExternalLinkButton";
import { Button } from "@/components/ui/button";
import { issuesUrl } from "@/links";
import { logError } from "@/log";
import licenseText from "../../LICENSE?raw";

/** About: version, notices, privacy, licenses, and feedback. */
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
        <TextDialog
          name="license"
          label={t("about.license")}
          load={() => Promise.resolve(licenseText)}
        />
        <TextDialog name="third-party notices" label={t("about.notices")} load={loadNotices} />
        <ExternalLinkButton url={issuesUrl} variant="outline">
          {t("about.feedback")}
          <ExternalLinkIcon aria-hidden data-icon="inline-end" />
        </ExternalLinkButton>
      </div>
    </div>
  );
}

// Generated at app build time (pnpm notices) and served with the app. Tauri answers a missing
// file with index.html and status 200, so the type tells whether the notices are really there.
async function loadNotices() {
  const response = await fetch("/third-party-notices.txt");
  const type = response.headers.get("content-type") ?? "";
  if (!response.ok || !type.startsWith("text/plain")) {
    throw new Error(`third-party-notices.txt answered ${response.status} ${type}`);
  }
  return response.text();
}

/** A button that opens a long text, such as a license, in a scrollable dialog. */
function TextDialog({
  name,
  label,
  load,
}: {
  /** A stable English name for the log. */
  name: string;
  label: string;
  load: () => Promise<string>;
}) {
  const { t } = useTranslation();
  const titleId = useId();
  const [text, setText] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  return (
    <Dialog.Root
      onOpenChange={(open) => {
        if (!open || text !== null) return;
        // A retry after a failure starts from the loading text again.
        setFailed(false);
        load().then(setText, (error: unknown) => {
          logError(`Loading the ${name} failed`, error);
          setFailed(true);
        });
      }}
    >
      <Dialog.Trigger render={<Button variant="outline" />}>{label}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 isolate z-50 bg-foreground/20 dark:bg-background/70" />
        <Dialog.Popup className="fixed inset-4 z-50 mx-auto flex max-w-2xl flex-col gap-3 rounded-lg border border-input bg-popover p-4 text-popover-foreground">
          <Dialog.Title id={titleId} className="font-bold">
            {label}
          </Dialog.Title>
          {/* A named, focusable section, so the text scrolls with the keyboard and is announced. */}
          <section
            aria-labelledby={titleId}
            // biome-ignore lint/a11y/noNoninteractiveTabindex: a scrollable region must be reachable by keyboard (WCAG 2.1.1).
            tabIndex={0}
            className="min-h-0 grow overflow-auto rounded-md border bg-card p-3"
          >
            <pre className="font-mono text-xs whitespace-pre-wrap">
              {failed ? t("about.loadFailed") : (text ?? t("about.loading"))}
            </pre>
          </section>
          <div className="flex justify-end">
            <Dialog.Close render={<Button variant="outline" />}>{t("about.close")}</Dialog.Close>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
