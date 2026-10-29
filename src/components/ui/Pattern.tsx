/**
 * Discreet geometric band inspired by Faso Dan Fani weaving and Tiébélé
 * mural paintings. Used only as a separator, at 6–10 % opacity.
 */
export function PatternDivider({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={`block h-3 w-full text-[var(--text)] opacity-[0.08] ${className}`}
      preserveAspectRatio="none"
    >
      <defs>
        <pattern id="fdf-band" width="24" height="12" patternUnits="userSpaceOnUse">
          <path
            d="M0 6 6 0l6 6-6 6Zm12 0 6-6 6 6-6 6Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path d="M5 6h2M17 6h2" stroke="currentColor" strokeWidth="1.5" />
        </pattern>
      </defs>
      <rect width="100%" height="12" fill="url(#fdf-band)" />
    </svg>
  );
}
