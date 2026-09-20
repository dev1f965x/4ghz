import "./BrandMark.css";

/**
 * The app's mark: three bars in the three game colors, rising like a signal.
 *
 * Drawn inline rather than loaded as a file so it inherits the palette tokens and stays
 * sharp at any window scale.
 */
export function BrandMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 40 40" role="img" aria-label="4GHz">
      <rect className="brand-mark__plate" width="40" height="40" rx="11" />
      <rect
        className="brand-mark__bar brand-mark__bar--genshin"
        x="11"
        y="22"
        width="5"
        height="9"
        rx="2.5"
      />
      <rect
        className="brand-mark__bar brand-mark__bar--starrail"
        x="18"
        y="16"
        width="5"
        height="15"
        rx="2.5"
      />
      <rect
        className="brand-mark__bar brand-mark__bar--zenless"
        x="25"
        y="9"
        width="5"
        height="22"
        rx="2.5"
      />
    </svg>
  );
}
