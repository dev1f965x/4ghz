import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { CheckIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { activeCodes, type CodeRow } from "@/codes/model";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useDataSync } from "@/data/store";
import { useNow } from "@/hooks/useNow";
import type { Locale } from "@/i18n/locale";
import { localText } from "@/schedule/model";
import { setRedeemed, useLocalState } from "@/state/app-state";
import type { GameId } from "@/state/schema";
import type { Region } from "@/time/clock";
import { formatDateTime, timeLeft } from "@/time/format";

// The server is chosen in Settings (GHZ-20); until then every game uses the default, Asia.
const region: Region = "asia";
const DAY_MS = 24 * 60 * 60 * 1000;
// How long a button reads "Copied" before it returns to "Copy".
const COPIED_MS = 2000;

/** The Codes tab: active codes, newest first, to copy and mark as redeemed (PRD FR19 to FR24). */
export function CodesTab({ game }: { game: GameId }) {
  const { t } = useTranslation();
  const { data } = useDataSync();
  const { state } = useLocalState();
  const now = useNow(30_000);
  const [announcement, setAnnouncement] = useState("");
  if (data === null) return null;
  const codes = activeCodes(data.games[game], region, now);
  const redeemed = new Set(state.redeemedCodes[game]);

  return (
    <div className="flex flex-col gap-2">
      {/* Copy results are announced here, once, without moving focus. */}
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
                redeemed={redeemed.has(code.code)}
                onCopied={() => setAnnouncement(t("codes.copiedAnnouncement", { code: code.code }))}
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
  onCopied,
}: {
  game: GameId;
  row: CodeRow;
  now: number;
  redeemed: boolean;
  onCopied: () => void;
}) {
  const { t, i18n } = useTranslation();
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = () => {
    writeText(row.code)
      .then(() => {
        setCopied(true);
        onCopied();
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setCopied(false), COPIED_MS);
      })
      .catch((error: unknown) => {
        // Nothing was copied, so the button keeps saying Copy; the log explains why.
        console.error(`Copying ${row.code} failed`, error);
      });
  };

  const expiry =
    row.expires === null
      ? t("codes.expiryUnknown")
      : t("codes.expiresAt", { when: formatDateTime(row.expires, i18n.language as Locale) });
  let soon: string | null = null;
  if (row.expires !== null && row.expires - now < DAY_MS) {
    const { hours, minutes } = timeLeft(now, row.expires);
    const time =
      hours > 0
        ? t("duration.hours", { h: hours, m: minutes })
        : t("duration.minutes", { m: minutes });
    soon = t("codes.left", { time });
  }

  // A redeemed code stays listed but recedes, so the next one to use stands out.
  return (
    <li
      className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${redeemed ? "bg-muted" : "bg-card"}`}
    >
      <div className="grow">
        <p className="font-mono text-lg tracking-wide">{row.code}</p>
        <p className="text-sm text-muted-foreground">
          {localText(row.rewards, i18n.language)} · {expiry}
        </p>
      </div>
      <span className="min-w-24 shrink-0 text-right text-sm text-accent-foreground tabular-nums">
        {soon}
      </span>
      <Button
        variant="outline"
        size="sm"
        className="min-w-20"
        aria-label={t("codes.copyLabel", { code: row.code })}
        onClick={copy}
      >
        {copied && <CheckIcon aria-hidden data-icon="inline-start" />}
        {copied ? t("codes.copied") : t("codes.copy")}
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
