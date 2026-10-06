// Terms follow the table in CONTENT.md.
export const en = {
  game: {
    label: "Game",
    genshin: "Genshin Impact",
    hsr: "Honkai: Star Rail",
    zzz: "Zenless Zone Zero",
    // Letter marks shown next to each game's name and in the calendar.
    letter: { genshin: "G", hsr: "H", zzz: "Z" },
  },
  shell: {
    settings: "Settings",
    back: "Back",
  },
  firstRun: {
    title: "Check your server and games",
    body: "The default server is Asia.",
    open: "Open settings",
    dismiss: "Dismiss notice",
  },
  readOnly: {
    title: "Records can’t be read",
    invalidBody:
      "The records file is damaged or was made by a newer version. Checks are turned off for this session.",
    unreadableBody: "The records file can’t be opened. Checks are turned off for this session.",
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
