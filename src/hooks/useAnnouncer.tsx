import { useCallback, useState } from "react";

/**
 * A polite live region and a function that announces a message in it, for results that do not
 * move focus, such as a checked chore or a copied code.
 */
export function useAnnouncer() {
  const [text, setText] = useState("");
  // Clearing first lets the same message be announced again: an unchanged text is not re-read.
  const announce = useCallback((message: string) => {
    setText("");
    requestAnimationFrame(() => setText(message));
  }, []);
  const region = (
    <p role="status" className="sr-only">
      {text}
    </p>
  );
  return { announce, region };
}
