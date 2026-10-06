import { openUrl } from "@tauri-apps/plugin-opener";
import { useTranslation } from "react-i18next";
import { redemptionUrl } from "@/codes/model";
import { Button } from "@/components/ui/button";
import type { GameId } from "@/state/schema";

/** Opens the selected game's official redemption page in the default browser (PRD FR21). */
export function RedemptionLink({ game }: { game: GameId }) {
  const { t, i18n } = useTranslation();
  const url = redemptionUrl(game, i18n.language);
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() =>
        openUrl(url).catch((error: unknown) => {
          // The capability or a missing default browser refused it; nothing else to show yet.
          console.error(`Opening ${url} failed`, error);
        })
      }
    >
      {t("codes.openRedemption")}
      <span aria-hidden>↗</span>
    </Button>
  );
}
