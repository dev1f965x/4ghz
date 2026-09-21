import { useCallback, useEffect, useState } from "react";
import type { UsedCodesMemory } from "./usedCodes";

/** Which codes are marked as used, remembered across restarts. */
export function useUsedCodes(memory: UsedCodesMemory) {
  const [used, setUsed] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    void memory.load().then((keys) => {
      if (!cancelled) setUsed(new Set(keys));
    });
    return () => {
      cancelled = true;
    };
  }, [memory]);

  const toggle = useCallback(
    (key: string) => {
      const next = new Set(used);
      if (!next.delete(key)) next.add(key);
      setUsed(next);
      void memory.save([...next]);
    },
    [used, memory],
  );

  return { used, toggle };
}
