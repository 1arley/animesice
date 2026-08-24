"use client";

import { useEffect } from "react";
import { MonetagGate } from "./MonetagGate";

const MONETAG_DISABLED = process.env.NEXT_PUBLIC_DISABLE_MONETAG === "1";

export function ThirdPartyScripts() {
  useEffect(() => {
    if (MONETAG_DISABLED) return;

    let injected = false;
    function inject() {
      if (injected) return;
      injected = true;

      const s = document.createElement("script");
      s.dataset.zone = "11528359";
      s.src = "https://al5sm.com/tag.min.js";
      (document.body || document.documentElement).appendChild(s);
    }

    const gate = () => {
      window.removeEventListener("scroll", gate);
      window.removeEventListener("pointerdown", gate);
      window.removeEventListener("keydown", gate);
      setTimeout(inject, 300);
    };

    window.addEventListener("scroll", gate, { passive: true });
    window.addEventListener("pointerdown", gate, { passive: true });
    window.addEventListener("keydown", gate, { passive: true });

    return () => {
      window.removeEventListener("scroll", gate);
      window.removeEventListener("pointerdown", gate);
      window.removeEventListener("keydown", gate);
    };
  }, []);

  return (
    <>
      {!MONETAG_DISABLED && <MonetagGate />}
    </>
  );
}
