"use client";

import Script from "next/script";
import { ADSENSE_CLIENT } from "@/lib/adsense";

/**
 * ThirdPartyScripts — carrega AdSense + Monetag fora do caminho crítico.
 *
 * AdSense: `strategy="lazyOnload"` — só dispara quando o browser está idle
 * (requestIdleCallback / setTimeout fallback). Antes ficava no <head> como
 * `<script async>`, bloqueando o paint. Agora vai para o final do body.
 *
 * Monetag (in-page push + demais formatos): só injeta quando a página entra
 * em viewport OU depois de 4s de idle — whichever vem primeiro. Heurística
 * universal para "não competir com o conteúdo principal" sem flash visível
 * de ad carregando.
 *
 * Preconnect hints ficam em app/layout.tsx <head>.
 */
export function ThirdPartyScripts() {
  return (
    <>
      {/* AdSense: lazyOnload = browser idle. Antes era <script async> no
          <head>, agora vai pro fim do body. */}
      <Script
        id="adsense-loader"
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
        strategy="lazyOnload"
        crossOrigin="anonymous"
      />

      {/* Monetag: deferido por IntersectionObserver — só entra quando o
          usuário rolar OU após 4s de idle. Heurística única, sem flash. */}
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
              if ('IntersectionObserver' in window) {
                var io = new IntersectionObserver(function(entries) {
                  if (entries.some(function(e) { return e.isIntersecting; })) {
                    inject();
                    io.disconnect();
                  }
                }, { rootMargin: '200px' });
                io.observe(document.body);
              }
              if ('requestIdleCallback' in window) {
                requestIdleCallback(function() { setTimeout(inject, 4000); }, { timeout: 5000 });
              } else {
                setTimeout(inject, 4000);
              }
            })();
          `,
        }}
      />

      {/* Cloudflare Web Analytics: beacon leve, lazyOnload. */}
      <Script
        id="cloudflare-beacon"
        src="https://static.cloudflareinsights.com/beacon.min.js"
        strategy="lazyOnload"
        defer
      />
    </>
  );
}
