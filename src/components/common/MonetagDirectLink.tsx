"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const COOLDOWN_MS = 60_000;
const DIRECT_LINK =
  process.env.NEXT_PUBLIC_MONETAG_DIRECT_LINK ||
  "https://omg10.com/4/11645885";

export function MonetagDirectLink() {
  const pathname = usePathname();
  const lastOpenAt = useRef(0);

  useEffect(() => {
    // A new SPA page starts with one ad opportunity, as requested.
    lastOpenAt.current = 0;
  }, [pathname]);

  useEffect(() => {
    function openAd(event: MouseEvent) {
      if (
        !event.isTrusted ||
        event.button !== 0 ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const now = Date.now();
      if (now - lastOpenAt.current < COOLDOWN_MS) return;

      // Run synchronously inside the trusted click so popup blockers recognize
      // the user activation. Never cancel or alter the site's original click.
      lastOpenAt.current = now;
      window.open(DIRECT_LINK, "_blank", "noopener,noreferrer");
    }

    document.addEventListener("click", openAd, true);
    return () => document.removeEventListener("click", openAd, true);
  }, []);

  return null;
}
