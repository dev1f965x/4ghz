// Shared surfaces for list items: each schedule entry and code is a card of its own.
export const card = "rounded-lg border bg-card";

/** The pointer reaction of a card: the border takes the accent and the fill lightens. */
export const hoverable = "transition-colors hover:border-primary hover:bg-accent/40";

export const hoverCard = `${card} ${hoverable}`;
