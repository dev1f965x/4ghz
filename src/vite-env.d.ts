/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Set only for test builds of the app; see vite.config.ts. */
  readonly VITE_DATA_URL?: string;
}

/** The app version from package.json, which tauri.conf.json also uses. */
declare const __APP_VERSION__: string;
