export default function BrandMark() {
  return (
    <svg
      className="brand-logo-mark"
      viewBox="0 0 48 48"
      role="img"
      aria-label="DocuMind AI logo"
    >
      <ellipse
        cx="24"
        cy="24"
        rx="21"
        ry="10"
        transform="rotate(-32 24 24)"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M16 10h11l8 8v20H16a3 3 0 0 1-3-3V13a3 3 0 0 1 3-3Z"
        fill="var(--panel-bg)"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M27 10v8h8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M19 23h10M19 27h10M19 31h7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="37" cy="13" r="2.5" fill="#8cbf14" />
    </svg>
  );
}
