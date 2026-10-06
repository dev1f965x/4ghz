// The project's own pages. The opener capability allows these besides the official game sites
// (src/data/official-hosts.ts); a test keeps the two in sync.
export const repositoryUrl = "https://github.com/dev1f965x/4ghz";
export const issuesUrl = `${repositoryUrl}/issues`;

/**
 * Opener capability entries for the project's pages: the issues page and release pages. The
 * opener matches a glob against the raw URL, so "*" also admits other paths on github.com;
 * the host itself cannot change.
 */
export const projectUrlPatterns = [issuesUrl, `${repositoryUrl}/releases/tag/v*`];
