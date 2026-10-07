import { useTranslation } from "react-i18next";
import { redemptionUrl } from "@/codes/model";
import { ExternalLinkButton } from "@/components/ExternalLinkButton";
import type { GameId } from "@/state/schema";

/** Opens the selected game's official redemption page in the default browser. */
export function RedemptionLink({ game }: { game: GameId }) {
  const { t, i18n } = useTranslation();
  return (
    <ExternalLinkButton url={redemptionUrl(game, i18n.language)} variant="outline" size="sm">
      {t("codes.openRedemption")}
      <span aria-hidden>↗</span>
    </ExternalLinkButton>
  );
}
