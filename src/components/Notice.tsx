import "./Notice.css";

interface Props {
  title: string;
  detail?: string;
  action?: { label: string; onAction: () => void };
}

/** What the window shows instead of a list: nothing loaded, or something went wrong. */
export function Notice({ title, detail, action }: Props) {
  return (
    <div className="notice" role="status">
      <p className="notice__title">{title}</p>
      {detail && <p className="notice__detail">{detail}</p>}
      {action && (
        <button type="button" className="notice__action" onClick={action.onAction}>
          {action.label}
        </button>
      )}
    </div>
  );
}
