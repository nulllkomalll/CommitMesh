export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <rect width="32" height="32" rx="8" fill="#0070E0" />
      <g stroke="#fff" strokeWidth="1.8" strokeLinecap="round" fill="none">
        <path d="M9 21 16 10M16 10l7 11M9 21h14" />
      </g>
      <circle cx="9" cy="21" r="3" fill="#003087" stroke="#fff" strokeWidth="1.4" />
      <circle cx="23" cy="21" r="3" fill="#003087" stroke="#fff" strokeWidth="1.4" />
      <circle cx="16" cy="10" r="3" fill="#FFC439" />
    </svg>
  );
}

export function Logo() {
  return (
    <div className="logo">
      <LogoMark />
      <span className="logo__word">
        Commit<strong>Mesh</strong>
      </span>
    </div>
  );
}
