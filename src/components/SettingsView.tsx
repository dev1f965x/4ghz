import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

/** The Settings screen; its sections arrive with GHZ-20. */
export function SettingsView() {
  const { t } = useTranslation();
  const heading = useRef<HTMLHeadingElement>(null);
  // Moving focus to the heading tells screen readers that the screen changed.
  useEffect(() => heading.current?.focus(), []);
  return (
    <section aria-labelledby="settings-heading">
      <h1 id="settings-heading" ref={heading} tabIndex={-1} className="text-lg font-bold">
        {t("shell.settings")}
      </h1>
    </section>
  );
}
