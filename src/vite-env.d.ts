/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Points the app at another feed, for development and QA builds. */
  readonly VITE_FEED_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** The version in package.json, written in at build time. */
declare const __APP_VERSION__: string;
