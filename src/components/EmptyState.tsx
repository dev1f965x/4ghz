import { Button } from "@/components/ui/button";

/** A centered message for a tab with nothing to show, with an optional action. */
export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-input bg-card px-4 py-8 text-center">
      <h2 className="font-bold">{title}</h2>
      <p className="text-sm text-muted-foreground">{body}</p>
      {action && (
        <Button variant="outline" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
