# 5. Use Biome for linting and formatting

Status: accepted
Date: 2026-09-20

## Context

The repository needs one opinion on formatting and a lint pass that runs on every commit
and in CI. Whatever it is, it has to be fast enough that nobody skips it.

## Options

- **ESLint and Prettier.** The combination most teams still run, with the widest rule
  ecosystem. Two tools, two configs, and a slower pass.
- **Biome.** One binary for formatting and linting, written in Rust, an order of magnitude
  faster, with a single config. Fewer third-party rules, and some ESLint plugins have no
  equivalent.

## Decision

Biome, configured in `biome.json`, run on staged files by a pre-commit hook and again in
CI.

## Consequences

Contributors need no editor plugin beyond the Biome extension, and the CI step costs
seconds. If a rule that only exists as an ESLint plugin becomes necessary, ESLint can be
added alongside for that rule rather than replacing Biome wholesale.
