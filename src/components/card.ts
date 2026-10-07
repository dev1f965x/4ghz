// Shared surfaces for list items: each schedule entry and code is a card of its own.
export const card = "rounded-lg border bg-card";

/** A card that reacts to the pointer: the border takes the accent and the fill lightens. */
export const hoverCard = `${card} transition-colors hover:border-primary/60 hover:bg-accent/40`;
