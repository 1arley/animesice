"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const COOLDOWN_MS = 60_000;
const PAGE_ENTRY_GRACE_MS = 10_000;
const DIRECT_LINK =
  process.env.NEXT_PUBLIC_MONETAG_DIRECT_LINK ||
  "https://omg10.com/4/11645885";

const SESSION_KEY = "animesice:ad-state";

type AdSession = {
  lastOpenAt: number;
  seenPages: string[];
};

function readSession(): AdSession {
  if (typeof window === "undefined") {
    return { lastOpenAt: 0, seenPages: [] };
  }
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) return { lastOpenAt: 0, seenPages: [] };
    const parsed = JSON.parse(raw) as Partial<AdSession>;
    return {
      lastOpenAt: typeof parsed.lastOpenAt === "number" ? parsed.lastOpenAt : 0,
      seenPages: Array.isArray(parsed.seenPages) ? parsed.seenPages : [],
    };
  } catch {
    return { lastOpenAt: 0, seenPages: [] };
  }
}

function writeSession(state: AdSession) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(state));
  } catch {
    // ignore quota/disabled storage
  }
}

export function MonetagDirectLink() {
  const pathname = usePathname();

  useEffect(() => {
    const pageEnteredAt = Date.now();

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

      const session = readSession();
      const now = Date.now();

      if (pathname && session.seenPages.includes(pathname)) return;
      if (now - pageEnteredAt < PAGE_ENTRY_GRACE_MS) return;
      const elapsed = now - session.lastOpenAt;
      if (elapsed < COOLDOWN_MS) return;

      session.lastOpenAt = now;
      session.seenPages = pathname ? [...session.seenPages, pathname] : session.seenPages;
      writeSession(session);

      // Run synchronously inside the trusted click so popup blockers recognize
      // the user activation. Never cancel or alter the site's original click.
      window.open(DIRECT_LINK, "_blank", "noopener,noreferrer");
    }

    document.addEventListener("click", openAd, true);
    return () => document.removeEventListener("click", openAd, true);
  }, [pathname]);

  return null;
}
