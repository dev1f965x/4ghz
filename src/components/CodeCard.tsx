import { useEffect, useState } from "react";
import { type RedeemCode, redemptionUrl } from "../domain/code";
import { CODE_LABELS, formatStart, GAME_LABELS } from "../domain/labels";
import { outside } from "../shell/outside";
import "./CodeCard.css";

interface Props {
  code: RedeemCode;
  used: boolean;
  now: Date;
  onToggleUsed: () => void;
}

/** How long "copied" stays on the button before it reads "copy" again. */
const COPIED_MS = 1500;

/**
 * One code: what it gives and until when, with copy, redeem, and a used mark.
 *
 * Redeem copies the code before opening the page, so the player has it to paste even
 * where the page does not fill it in from the address.
 */
export function CodeCard({ code, used, now, onToggleUsed }: Props) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), COPIED_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    await outside.copy(code.code);
    setCopied(true);
  };

  const redeem = async () => {
    await copy();
    await outside.openInBrowser(redemptionUrl(code));
  };

  const expiry = code.expiresAt
    ? CODE_LABELS.expires(formatStart(code.expiresAt, now))
    : CODE_LABELS.noExpiry;

  return (
    <article className="code" data-game={code.game} data-used={used}>
      <p className="code__game">{GAME_LABELS[code.game]}</p>

      <div className="code__body">
        <h3 className="code__value">{code.code}</h3>
        <p className="code__detail">
          {code.rewards} · {expiry}
        </p>
      </div>

      <div className="code__actions">
        <button type="button" className="code__action" onClick={copy} aria-live="polite">
          {copied ? CODE_LABELS.copied : CODE_LABELS.copy}
        </button>
        <button
          type="button"
          className="code__action code__action--primary"
          onClick={redeem}
          title={CODE_LABELS.redeemHint}
        >
          {CODE_LABELS.redeem}
        </button>
        <button type="button" className="code__used" aria-pressed={used} onClick={onToggleUsed}>
          {CODE_LABELS.used}
        </button>
      </div>
    </article>
  );
}
