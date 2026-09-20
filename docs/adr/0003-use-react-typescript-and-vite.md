# 3. Use React, TypeScript, and Vite for the interface

Status: accepted
Date: 2026-09-20

## Context

The interface is a list that regroups as time passes, plus a settings surface. It needs
a component model, typed data coming from the feed, and a fast edit-reload loop inside
the Tauri shell.

## Options

- **Plain TypeScript with the DOM.** No framework weight, but list diffing and state
  updates get hand-written and drift.
- **Svelte or Solid.** Smaller output and less ceremony, and both work with Tauri. Fewer
  hiring-relevant hours and a smaller ecosystem for testing tools.
- **React with Vite.** The default in the industry, the largest testing ecosystem, and
  the template Tauri ships.

## Decision

React with TypeScript, bundled by Vite.

## Consequences

The bundle is larger than a compiled framework would produce, which barely matters for a
local window. Typed props and typed feed data catch schema drift at build time, and the
testing tools below are the ones this stack is built for.
