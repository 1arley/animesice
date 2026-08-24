"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const COOLDOWN_MS = 60_000;
const STORAGE_KEY = "monetag_last_ad";

export function MonetagGate() {
  const pathname = usePathname();

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, "0");
  }, [pathname]);

  useEffect(() => {
    const original = window.open.bind(window);

    window.open = function (
      url?: string | URL,
      target?: string,
      features?: string,
    ) {
      const now = Date.now();
      const lastAd = parseInt(sessionStorage.getItem(STORAGE_KEY) || "0", 10);

      if (lastAd && now - lastAd < COOLDOWN_MS) {
        return null;
      }

      sessionStorage.setItem(STORAGE_KEY, now.toString());
      return original(url, target, features);
    };

    return () => {
      window.open = original;
    };
  }, []);

  return null;
}
