import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { CheckIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { activeCodes, type CodeRow } from "@/codes/model";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useDataSync } from "@/data/store";
import { useAnnouncer } from "@/hooks/useAnnouncer";
import { useNow } from "@/hooks/useNow";
import { formatDuration } from "@/i18n/duration";
import type { Locale } from "@/i18n/locale";
import { logError } from "@/log";
import { localText } from "@/schedule/model";
import { isRedeemed, setRedeemed, useLocalState } from "@/state/app-state";
import type { GameId } from "@/state/schema";
import { formatDateTime, timeLeft } from "@/time/format";

// How long a button reads "Copied" or "Couldn't copy" before it returns to "Copy".
const RESULT_MS = 2000;

/** The Codes tab: active codes, newest first, to copy and mark as redeemed. */
export function CodesTab({ game }: { game: GameId }) {
  const { t } = useTranslation();
  const { data } = useDataSync();
  const { state } = useLocalState();
  const now = useNow(30_000);
  const { announce, region } = useAnnouncer();
  if (data === null) return null;
  const codes = activeCodes(data.games[game], state.settings.games[game].region, now);

  return (
    <div className="flex flex-col gap-2">
      {region}
      {codes.length === 0 ? (
        <EmptyState title={t("codes.emptyTitle")} body={t("codes.emptyBody")} />
      ) : (
        <>
          <h2 className="font-bold">{t("codes.title")}</h2>
          <ul className="divide-y overflow-hidden rounded-lg border bg-card">
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
        logError(`Copying ${row.code} failed`, error);
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
      // Wraps at large Windows text sizes, keeping the code readable instead of squeezing it.
      className={`flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2.5 ${redeemed ? "bg-background" : "bg-card"}`}
    >
      <div className="min-w-48 flex-1">
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
      <span className="ml-auto min-w-24 shrink-0 text-right text-sm font-bold tabular-nums">
        {soon}
      </span>
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
