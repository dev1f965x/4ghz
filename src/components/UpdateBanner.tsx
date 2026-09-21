import { UPDATE_LABELS } from "../domain/labels";
import type { UpdateState } from "../update/useUpdate";
import "./UpdateBanner.css";

interface Props {
  update: UpdateState;
  onInstall: () => void;
}

/** One line under the header while a newer release is waiting, installing, or failed. */
export function UpdateBanner({ update, onInstall }: Props) {
  if (update.status === "current") return null;

  const installing = update.status === "installing";
  const message = installing
    ? UPDATE_LABELS.installing(update.progress)
    : update.status === "failed"
      ? UPDATE_LABELS.failed
      : UPDATE_LABELS.available(update.version);
  const action = update.status === "failed" ? UPDATE_LABELS.retry : UPDATE_LABELS.install;

  return (
    <div className="update-banner" role="status">
      <p className="update-banner__message">{message}</p>
      {!installing && (
        <button type="button" className="update-banner__action" onClick={onInstall}>
          {action}
        </button>
      )}
    </div>
  );
}
