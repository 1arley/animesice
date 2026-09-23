"use client";

import { useEffect } from "react";

const enabled = process.env.NEXT_PUBLIC_ENABLE_MONETAG === "1";

export function MonetagVignette() {
  useEffect(() => {
    if (!enabled || document.getElementById("monetag-vignette")) return;

    let loaded = false;
    const load = () => {
      if (loaded) return;
      loaded = true;
      window.removeEventListener("scroll", load);
      window.removeEventListener("keydown", load);

      window.setTimeout(() => {
        const script = document.createElement("script");
        script.id = "monetag-vignette";
        script.dataset.zone = "11871321";
        script.src = "https://n6wxm.com/vignette.min.js";
        script.async = true;
        document.body.appendChild(script);
      }, 300);
    };

    window.addEventListener("scroll", load, { passive: true, once: true });
    window.addEventListener("keydown", load, { once: true });

    return () => {
      window.removeEventListener("scroll", load);
      window.removeEventListener("keydown", load);
    };
  }, []);

  return null;
}
