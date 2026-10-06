import { TriangleAlertIcon } from "lucide-react";
import type { ReactNode } from "react";

/**
 * A banner that stays until it is dismissed or resolved. Notices carry the game accent; warnings
 * use the fixed warning color and an icon, never the accent, so they never read as a notice
 * (DESIGN.md).
 */
export function Banner({
  kind,
  title,
  body,
  actions,
}: {
  kind: "notice" | "warning";
  title: string;
  body: string;
  actions?: ReactNode;
}) {
  const warning = kind === "warning";
  return (
    <div
      role="status"
      className={`flex items-start gap-3 rounded-lg border border-l-4 bg-card px-3 py-2 ${
        warning ? "border-l-warning" : "border-l-primary"
      }`}
    >
      {warning && <TriangleAlertIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-warning" />}
      <div className="grow">
        <p className="font-bold">{title}</p>
        <p className="text-sm text-muted-foreground">{body}</p>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
    </div>
  );
}
