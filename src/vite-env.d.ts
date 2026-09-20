/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Points the app at another feed, for development and QA builds. */
  readonly VITE_FEED_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
