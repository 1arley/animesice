/**
 * Stars — estrelas de leitura (avaliação exibida, sem interação).
 * Nota 1–10 → 5 estrelas (arredonda para cima a partir de .5).
 */

function Star({ filled }: { filled: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 16 16"
      aria-hidden="true"
      className={filled ? "text-ice" : "text-hairline"}
    >
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

export function Stars({ score }: { score: number }) {
  const filled = Math.round(score / 2);
  return (
    <span
      className="inline-flex items-center gap-0.5"
      role="img"
      aria-label={`Nota ${score} de 10`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} filled={n <= filled} />
      ))}
    </span>
  );
}
