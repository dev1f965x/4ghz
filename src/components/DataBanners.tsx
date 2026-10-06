import { useTranslation } from "react-i18next";
import { useDataSync } from "@/data/store";
import { WarningBanner } from "./Banner";

/** Banners for data problems while the last valid copy is in use (PRD FR9 to FR11). */
export function DataBanners() {
  const { t } = useTranslation();
  const { data, status, problem } = useDataSync();
  // Without data, the tabs explain the situation instead (DataState).
  if (data === null) return null;
  return (
    <>
      {status === "failed" && (
        <WarningBanner title={t("banner.staleTitle")} body={t("banner.staleBody")} />
      )}
      {(problem === "retired" || problem === "unsupported") && (
        <WarningBanner title={t("banner.unavailableTitle")} body={t("banner.updateBody")} />
      )}
      {problem === "invalid" && (
        <WarningBanner title={t("banner.unavailableTitle")} body={t("banner.invalidBody")} />
      )}
    </>
  );
}
