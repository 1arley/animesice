"use client";

import { useState } from "react";

/**
 * Key counter that answers every balance change: a purchase glints the key and
 * floats "+1"; opening a box floats "−1". The animation is decorative, the
 * count text stays a single plain node for assistive tech.
 */
export function KeyVault({ count }: { count: number }) {
  const [seen, setSeen] = useState(count);
  const [pulse, setPulse] = useState({ id: 0, delta: 0 });

  // Derived state: compare during render so the animation restarts with the
  // very commit that shows the new number.
  if (count !== seen) {
    setSeen(count);
    setPulse((current) => ({ id: current.id + 1, delta: count - seen }));
  }

  const gained = pulse.delta > 0;

  return (
    <div
      key={pulse.id}
      className="key-vault"
      data-pulse={pulse.id ? (gained ? "gain" : "spend") : undefined}
    >
      <svg
        key={`icon-${pulse.id}`}
        viewBox="0 0 120 140"
        aria-hidden="true"
        fill="none"
        className="key-vault-icon"
      >
        <circle cx="60" cy="42" r="24" />
        <circle cx="60" cy="42" r="9" />
        <path d="M60 66v56h18v-14H60m0-15h18" />
      </svg>
      <span
        key={`count-${pulse.id}`}
        className="key-vault-count font-mono tabular-nums"
      >
        {count} chave{count === 1 ? "" : "s"}
      </span>
      {pulse.id > 0 && (
        <span
          key={`delta-${pulse.id}`}
          aria-hidden="true"
          className="key-vault-delta"
        >
          {gained ? "+" : "−"}
          {Math.abs(pulse.delta)}
        </span>
      )}
    </div>
  );
}
