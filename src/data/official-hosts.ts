// The only sites links may open (PRD, Security). Exact hosts, not a domain suffix: the opener
// plugin matches URLs with a glob that cannot express "any subdomain" safely, so its capability
// (src-tauri/capabilities/default.json) lists the same hosts; a test keeps the two in step.
export const officialHosts = [
  "hoyoverse.com",
  "www.hoyoverse.com",
  "genshin.hoyoverse.com",
  "hsr.hoyoverse.com",
  "zenless.hoyoverse.com",
  "hoyolab.com",
  "www.hoyolab.com",
] as const;
