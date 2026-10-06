import { TriangleAlertIcon } from "lucide-react";
import type { ReactNode } from "react";

/**
 * A warning that stays until it is resolved. Warnings use the fixed warning color and an icon,
 * never the game accent, so they never read as a notice (DESIGN.md).
 */
export function WarningBanner({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-lg border border-l-4 border-l-warning bg-card px-3 py-2"
    >
      <TriangleAlertIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-warning" />
      <div className="grow">
        <p className="font-bold">{title}</p>
        <p className="text-sm text-muted-foreground">{body}</p>
      </div>
      {action}
    </div>
  );
}
