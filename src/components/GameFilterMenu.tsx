import { type KeyboardEvent, useEffect, useId, useRef, useState } from "react";
import { GAME_FILTERS, type GameFilter } from "../domain/filter";
import { FILTER_LABELS } from "../domain/labels";
import "./GameFilterMenu.css";

interface Props {
  filter: GameFilter;
  onChoose: (filter: GameFilter) => void;
}

/**
 * A pill that opens a short list: all games, or one. It follows the listbox pattern —
 * arrows move, Enter picks, Escape or a click elsewhere closes, and focus returns to
 * the pill.
 */
export function GameFilterMenu({ filter, onChoose }: Props) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(GAME_FILTERS.indexOf(filter));
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    list.current?.focus();

    const closeOutside = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", closeOutside);
    return () => document.removeEventListener("mousedown", closeOutside);
  }, [open]);

  const show = () => {
    setActive(GAME_FILTERS.indexOf(filter));
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    trigger.current?.focus();
  };

  const pick = (choice: GameFilter) => {
    onChoose(choice);
    close();
  };

  const onTriggerKey = (event: KeyboardEvent) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      show();
    }
  };

  const onListKey = (event: KeyboardEvent) => {
    const last = GAME_FILTERS.length - 1;
    if (event.key === "ArrowDown") setActive((index) => Math.min(index + 1, last));
    else if (event.key === "ArrowUp") setActive((index) => Math.max(index - 1, 0));
    else if (event.key === "Home") setActive(0);
    else if (event.key === "End") setActive(last);
    else if (event.key === "Enter" || event.key === " ") pick(GAME_FILTERS[active]);
    else if (event.key === "Escape") close();
    else if (event.key === "Tab") setOpen(false);
    else return;
    if (event.key !== "Tab") event.preventDefault();
  };

  return (
    <div className="filter-menu" ref={root}>
      <button
        ref={trigger}
        type="button"
        className="filter-menu__trigger"
        data-tour="filter"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-label={`${FILTER_LABELS.menu}: ${FILTER_LABELS[filter]}`}
        onClick={() => (open ? close() : show())}
        onKeyDown={onTriggerKey}
      >
        <span className="filter-menu__swatch" data-filter={filter} />
        {FILTER_LABELS[filter]}
        <svg className="filter-menu__chevron" viewBox="0 0 10 10" aria-hidden="true">
          <path d="m2 3.5 3 3 3-3" />
        </svg>
      </button>

      {open && (
        <div
          ref={list}
          id={`${id}-list`}
          className="filter-menu__list"
          role="listbox"
          tabIndex={-1}
          aria-label={FILTER_LABELS.menu}
          aria-activedescendant={`${id}-${GAME_FILTERS[active]}`}
          onKeyDown={onListKey}
        >
          {GAME_FILTERS.map((choice, index) => (
            // biome-ignore lint/a11y/useKeyWithClickEvents: the listbox takes the keys for every option
            <div
              key={choice}
              id={`${id}-${choice}`}
              role="option"
              tabIndex={-1}
              className="filter-menu__option"
              aria-selected={choice === filter}
              data-active={index === active}
              onMouseEnter={() => setActive(index)}
              onClick={() => pick(choice)}
            >
              <span className="filter-menu__swatch" data-filter={choice} />
              {FILTER_LABELS[choice]}
              {choice === filter && (
                <svg className="filter-menu__check" viewBox="0 0 12 12" aria-hidden="true">
                  <path d="m2.5 6.5 2.5 2.5 4.5-6" />
                </svg>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
