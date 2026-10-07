// The new-version notice (PRD Q8, Design Doc "Update check"): once at startup the app asks the
// GitHub REST API for the latest published release and compares it with its own version. The
// app never installs anything; the notice links to the release page.
import { z } from "@/data/zod";
import { repositoryUrl } from "@/links";

const LATEST_RELEASE_API = "https://api.github.com/repos/dev1f965x/4ghz/releases/latest";

export type Release = { version: string; url: string };

const releaseSchema = z.object({ tag_name: z.string() });

type Version = [number, number, number];

/**
 * A release tag "v1.2.3" as numbers; null for anything else, such as a pre-release or a tag
 * without "v", whose page the opener capability (releases/tag/v*) would not open.
 */
export function parseVersion(text: string): Version | null {
  const match = /^v(\d+)\.(\d+)\.(\d+)$/.exec(text.trim());
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

export function isNewer(candidate: Version, current: Version): boolean {
  for (let i = 0; i < 3; i++) {
    if (candidate[i] !== current[i]) return candidate[i] > current[i];
  }
  return false;
}

/**
 * The latest release when it is newer than `currentVersion`, otherwise null. Network and API
 * failures reject; the caller logs them, and nothing is shown.
 */
export async function findUpdate(
  currentVersion: string,
  fetchJson: (url: string) => Promise<unknown | null>,
): Promise<Release | null> {
  // package.json carries the version without "v"; release tags carry it.
  const current = parseVersion(`v${currentVersion}`);
  if (current === null) throw new Error(`The app version ${currentVersion} is not x.y.z`);
  const body = await fetchJson(LATEST_RELEASE_API);
  if (body === null) return null;
  const { tag_name: tag } = releaseSchema.parse(body);
  const latest = parseVersion(tag);
  if (latest === null || !isNewer(latest, current)) return null;
  // Built from the tag, not taken from the response, so the link always stays on the
  // repository's own release pages, which the opener capability allows.
  return {
    version: latest.join("."),
    url: `${repositoryUrl}/releases/tag/${encodeURIComponent(tag)}`,
  };
}

/** The parsed answer, or null for 404, which means no release is published yet. */
export async function fetchJson(url: string): Promise<unknown | null> {
  const response = await fetch(url, {
    headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
  });
  if (response.status === 404) return null;
  // Rate limits and server errors are failures; the caller logs them.
  if (!response.ok) throw new Error(`GitHub answered ${response.status}`);
  return response.json();
}
