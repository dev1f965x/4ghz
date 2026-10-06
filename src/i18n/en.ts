// Terms follow the table in CONTENT.md.
export const en = {
  game: {
    label: "Game",
    genshin: "Genshin Impact",
    hsr: "Honkai: Star Rail",
    zzz: "Zenless Zone Zero",
  },
  tab: {
    schedule: "Schedule",
    codes: "Codes",
    calendar: "Calendar",
  },
  sync: {
    loading: "Loading",
    justNow: "Updated just now",
    updatedAt: "Updated {{time}}",
    failedAt: "Refresh failed · Updated {{time}}",
    noData: "No data",
    refresh: "Refresh",
  },
  banner: {
    staleTitle: "Data may be out of date",
    staleBody: "The last refresh failed. Check your internet connection and try again.",
    unavailableTitle: "New data isn’t available",
    updateBody: "Update the app. The last data received is shown.",
    invalidBody: "The new data file has errors. The last data received is shown.",
  },
  load: {
    failedTitle: "Data couldn’t be loaded",
    failedBody: "Check your internet connection and try again.",
    invalidBody: "The data file has errors. Try again later.",
    updateBody: "Update the app to get data.",
    retry: "Try again",
  },
};

/** Every locale has the same keys as English. */
export type Messages = typeof en;
