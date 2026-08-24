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
    function isLinkOrButton(el: Element | null): boolean {
      let node = el;
      for (let i = 0; i < 5 && node; i++) {
        const tag = node.tagName?.toLowerCase();
        if (tag === "a" && (node as HTMLAnchorElement).href) return true;
        if (tag === "button") return true;
        if (tag === "input" && (node as HTMLInputElement).type === "submit") return true;
        node = node.parentElement;
      }
      return false;
    }

    function handleClick(e: MouseEvent) {
      const now = Date.now();
      const lastAd = parseInt(sessionStorage.getItem(STORAGE_KEY) || "0", 10);

      if (lastAd && now - lastAd < COOLDOWN_MS) {
        if (!isLinkOrButton(e.target as Element)) {
          e.stopPropagation();
          e.stopImmediatePropagation();
        }
        return;
      }

      if (!lastAd || now - lastAd >= COOLDOWN_MS) {
        sessionStorage.setItem(STORAGE_KEY, now.toString());
      }
    }

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  return null;
}
