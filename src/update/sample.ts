import type { UpdateSource } from "./ports";

/**
 * Development builds have nothing to install over them, so they are current — unless the
 * page is opened with `?update=<version>`, which pretends that release is waiting, so the
 * notice can be seen and photographed. Installing it stalls part way. Vite drops this
 * from release builds.
 */
export const sampleUpdateSource: UpdateSource = {
  async check() {
    const version = new URLSearchParams(window.location.search).get("update");
    if (!version) return null;

    return {
      version,
      install: (onProgress) => {
        onProgress(0.4);
        return new Promise(() => {});
      },
    };
  },
};
