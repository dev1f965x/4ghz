import { codeKey, codesToShow, type RedeemCode } from "../domain/code";
import { CODE_LABELS } from "../domain/labels";
import { CodeCard } from "./CodeCard";
import { Notice } from "./Notice";
import "./CodeList.css";

interface Props {
  codes: readonly RedeemCode[];
  used: ReadonlySet<string>;
  now: Date;
  onToggleUsed: (key: string) => void;
}

/** The codes still worth trying, newest first, with used ones at the bottom. */
export function CodeList({ codes, used, now, onToggleUsed }: Props) {
  const shown = codesToShow(codes, used, now);
  if (shown.length === 0) {
    return <Notice title={CODE_LABELS.empty} detail={CODE_LABELS.emptyDetail} />;
  }

  return (
    <ul className="code-list">
      {shown.map((code) => {
        const key = codeKey(code);
        return (
          <li key={key}>
            <CodeCard
              code={code}
              used={used.has(key)}
              now={now}
              onToggleUsed={() => onToggleUsed(key)}
            />
          </li>
        );
      })}
    </ul>
  );
}
