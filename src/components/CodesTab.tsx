import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { CheckIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { activeCodes, type CodeRow } from "@/codes/model";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useDataSync } from "@/data/store";
import { useNow } from "@/hooks/useNow";
import { formatDuration } from "@/i18n/duration";
import type { Locale } from "@/i18n/locale";
import { localText } from "@/schedule/model";
import { isRedeemed, setRedeemed, useLocalState } from "@/state/app-state";
import type { GameId } from "@/state/schema";
import type { Region } from "@/time/clock";
import { formatDateTime, timeLeft } from "@/time/format";

// The server is chosen in Settings (GHZ-20); until then every game uses the default, Asia.
const region: Region = "asia";
// How long a button reads "Copied" or "Couldn't copy" before it returns to "Copy".
const RESULT_MS = 2000;

/** The Codes tab: active codes, newest first, to copy and mark as redeemed (PRD FR19 to FR24). */
export function CodesTab({ game }: { game: GameId }) {
  const { t } = useTranslation();
  const { data } = useDataSync();
  const { state } = useLocalState();
  const now = useNow(30_000);
  const [announcement, setAnnouncement] = useState("");
  // Clearing first lets the same message be announced again: an unchanged text is not re-read.
  const announce = useCallback((text: string) => {
    setAnnouncement("");
    requestAnimationFrame(() => setAnnouncement(text));
  }, []);
  if (data === null) return null;
  const codes = activeCodes(data.games[game], region, now);

  return (
    <div className="flex flex-col gap-2">
      {/* Copy results are announced here, without moving focus. */}
      <p role="status" className="sr-only">
        {announcement}
      </p>
      {codes.length === 0 ? (
        <div className="flex flex-col items-center gap-1 rounded-lg border border-input bg-card px-4 py-8 text-center">
          <h2 className="font-bold">{t("codes.emptyTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("codes.emptyBody")}</p>
        </div>
      ) : (
        <>
          <h2 className="font-bold">{t("codes.title")}</h2>
          <ul className="flex flex-col gap-2">
            {codes.map((code) => (
              <Row
                key={code.code}
                game={game}
                row={code}
                now={now}
                redeemed={isRedeemed(state, game, code.code)}
                announce={announce}
              />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function Row({
  game,
  row,
  now,
  redeemed,
  announce,
}: {
  game: GameId;
  row: CodeRow;
  now: number;
  redeemed: boolean;
  announce: (text: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const [result, setResult] = useState<"copied" | "failed" | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const show = (next: "copied" | "failed") => {
    setResult(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setResult(null), RESULT_MS);
  };
  const copy = () => {
    writeText(row.code)
      .then(() => {
        show("copied");
        announce(t("codes.copiedAnnouncement", { code: row.code }));
      })
      .catch((error: unknown) => {
        // Another app can hold the Windows clipboard; the button and announcement say so.
        console.error(`Copying ${row.code} failed`, error);
        show("failed");
        announce(t("codes.copyFailedAnnouncement", { code: row.code }));
      });
  };

  const expiry =
    row.expires === null
      ? t("codes.expiryUnknown")
      : t("codes.expiresAt", { when: formatDateTime(row.expires, i18n.language as Locale) });
  // Within a day the time left matters more than the date (wireframe: bold, in the text color).
  const soon =
    row.expires !== null && timeLeft(now, row.expires).days === 0
      ? t("codes.left", { time: formatDuration(t, now, row.expires) })
      : null;

  let buttonText = t("codes.copy");
  let buttonLabel = t("codes.copyLabel", { code: row.code });
  if (result === "copied") {
    buttonText = t("codes.copied");
    buttonLabel = t("codes.copiedLabel", { code: row.code });
  } else if (result === "failed") {
    buttonText = t("codes.copyFailed");
    buttonLabel = t("codes.copyFailedLabel", { code: row.code });
  }

  // A redeemed code stays listed but recedes, so the next one to use stands out. The window
  // background keeps control borders at 3:1, which the muted fill would not (DESIGN.md).
  return (
    <li
      className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${redeemed ? "bg-background" : "bg-card"}`}
    >
      <div className="grow">
        <p
          className={`font-mono text-lg tracking-wide ${redeemed ? "text-muted-foreground" : ""}`}
          data-testid="code"
        >
          {row.code}
        </p>
        <p className="text-sm text-muted-foreground">
          {localText(row.rewards, i18n.language)} · {expiry}
        </p>
      </div>
      <span className="min-w-24 shrink-0 text-right text-sm font-bold tabular-nums">{soon}</span>
      {/* The name follows the visible text, so voice users can say what they see. */}
      <Button
        variant="outline"
        size="sm"
        className="min-w-20"
        aria-label={buttonLabel}
        onClick={copy}
      >
        {result === "copied" && <CheckIcon aria-hidden data-icon="inline-start" />}
        {buttonText}
      </Button>
      {/* Base UI's documented pattern: the label wraps the checkbox, so clicking the text toggles it. */}
      <label className="flex shrink-0 items-center gap-1.5 text-sm">
        <Checkbox
          checked={redeemed}
          aria-label={t("codes.redeemedLabel", { code: row.code })}
          onCheckedChange={(checked) => void setRedeemed(game, row.code, checked === true)}
        />
        {t("codes.redeemed")}
      </label>
    </li>
  );
}
