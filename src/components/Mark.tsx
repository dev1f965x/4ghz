/** The 4ghz mark: a clock signal (square wave) next to the monospaced name (Visual Direction V2). */
export function Mark() {
  return (
    <span className="inline-flex items-center gap-1.5 font-mono font-bold tracking-wide whitespace-nowrap">
      <svg aria-hidden viewBox="0 0 26 14" className="h-3.5 w-6.5 text-primary">
        <path
          d="M1 12V2h4v10h4V2h4v10h4V2h4v10h4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
      </svg>
      4ghz
    </span>
  );
}
