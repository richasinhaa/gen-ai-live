/// Mark: a live dot inside a bracket — "live sessions, built by people who code".
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <rect x="1" y="1" width="30" height="30" rx="8" fill="#171a23" stroke="#242835" />
      <path
        d="M12.2 9.5 8.4 16l3.8 6.5M19.8 9.5l3.8 6.5-3.8 6.5"
        stroke="#9aa1b1"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="16" r="3.1" fill="#ffb020" />
    </svg>
  );
}
