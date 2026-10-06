// Fails when UI strings use patterns that CONTENT.md bans. Keep this list and CONTENT.md in step.
import { readFileSync } from "node:fs";

const shared = [
  /!/,
  // Emoji only; text symbols such as ↗ (links that open the browser, CONTENT.md) are allowed.
  /\p{Emoji_Presentation}|\uFE0F/u,
  /['"]/, // Apostrophes and quotes are curly (’ “ ”).
];
const rules = {
  "src/i18n/en.ts": [
    /\b(?:seamless|effortless|successfully|simply|just(?! now)|easily|powerful|robust|leverage|unlock|please|oops|uh-oh|above|below|on the right)\b/i,
    ...shared,
  ],
  "src/i18n/ko.ts": [
    /드릴게요|실 수 있어요|도움이 되었으면|[을를] 통해|에 대한|해당|것이 가능합니다|되어집니다|에 있어서|성공적으로|정상적으로|손쉽게|간편하게|다양한|효율적으로|스마트하게|\^\^|주세요|시기 바랍니다/,
    ...shared,
  ],
};

const problems = [];
for (const [file, patterns] of Object.entries(rules)) {
  readFileSync(file, "utf8")
    .split("\n")
    .forEach((line, index) => {
      if (/^\s*\/\//.test(line)) return;
      // Only string literals are UI text; imports, types, and comments are not. Escaped quotes are
      // unescaped first, so a straight quote inside a literal is still found.
      const text = [...line.matchAll(/"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|`([^`]*)`/g)]
        .map((match) => (match[1] ?? match[2] ?? match[3]).replace(/\\(.)/g, "$1"))
        .join(" ");
      for (const pattern of patterns) {
        const found = text.match(pattern);
        if (found) problems.push(`${file}:${index + 1}  ${found[0]}`);
      }
    });
}

if (problems.length > 0) {
  console.error("Banned patterns in UI text (see CONTENT.md):");
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}
console.log("Content: no banned patterns in UI text.");
