// The project's own pages. The opener capability allows exactly these besides the official
// game sites (src/data/official-hosts.ts); a test keeps the two in sync.
export const repositoryUrl = "https://github.com/dev1f965x/4ghz";
export const issuesUrl = `${repositoryUrl}/issues`;

/** Opener capability entries for the project's pages. */
export const projectUrlPatterns = [`${repositoryUrl}/*`];
