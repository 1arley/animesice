export function HeartIcon({ filled, className = "" }: { filled: boolean; className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" className={className} aria-hidden="true">
      <path
        d="M8 13.5S1.5 9.7 1.5 5.5A3.3 3.3 0 0 1 8 4a3.3 3.3 0 0 1 6.5 1.5C14.5 9.7 8 13.5 8 13.5Z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function StarIcon({ filled, className = "" }: { filled: boolean; className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" className={className} aria-hidden="true">
      <path
        d="M8 1.5l1.9 3.9 4.3.6-3.1 3 .7 4.3L8 11.4l-3.8 2 .7-4.3-3.1-3 4.3-.6Z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
