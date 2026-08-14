"use client";

import Script from "next/script";
import { ADSENSE_CLIENT } from "@/lib/adsense";

const MONETAG_ENABLED = process.env.NEXT_PUBLIC_ENABLE_MONETAG === "1";

export function ThirdPartyScripts() {
  return (
    <>
      <Script
        id="adsense-loader"
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
        strategy="lazyOnload"
        crossOrigin="anonymous"
      />

      {MONETAG_ENABLED && (
        <Script
          id="monetag-loader"
          strategy="lazyOnload"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var fired = false;
                function inject() {
                  if (fired) return;
                  fired = true;
                  var s = document.createElement('script');
                  s.dataset.zone = '11528359';
                  s.src = 'https://al5sm.com/tag.min.js';
                  (document.body || document.documentElement).appendChild(s);
                }
                var anchor = document.querySelector('footer') || document.body;
                if ('IntersectionObserver' in window) {
                  var io = new IntersectionObserver(function(entries) {
                    if (entries.some(function(e) { return e.isIntersecting; })) {
                      inject();
                      io.disconnect();
                    }
                  }, { rootMargin: '200px' });
                  io.observe(anchor);
                }
                if ('requestIdleCallback' in window) {
                  requestIdleCallback(function() { setTimeout(inject, 6000); }, { timeout: 7000 });
                } else {
                  setTimeout(inject, 6000);
                }
              })();
            `,
          }}
        />
      )}

      <Script
        id="cloudflare-beacon"
        src="https://static.cloudflareinsights.com/beacon.min.js"
        strategy="lazyOnload"
        defer
      />
    </>
  );
}
