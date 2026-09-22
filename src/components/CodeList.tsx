import { useState } from "react";
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

/**
 * The codes still worth trying, newest first, with used ones at the bottom — as of when
 * the tab opened. Rows keep their places while it is open, so marking one as used does
 * not pull it out from under the pointer.
 */
export function CodeList({ codes, used, now, onToggleUsed }: Props) {
  const shown = useSettledOrder(codesToShow(codes, used, now));
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

/** Keeps the order the list first appeared in; codes that arrive later join at the end. */
function useSettledOrder(codes: RedeemCode[]): RedeemCode[] {
  const [first] = useState(() => codes.map(codeKey));
  const byKey = new Map(codes.map((code) => [codeKey(code), code]));
  const kept = first.flatMap((key) => byKey.get(key) ?? []);
  const arrived = codes.filter((code) => !first.includes(codeKey(code)));
  return [...kept, ...arrived];
}
