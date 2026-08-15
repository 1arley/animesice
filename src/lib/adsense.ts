/**
 * Cliente AdSense — fonte única do ID de publicação.
 * Usado por AdSlot (data-ad-client) e pelo loader on-demand.
 */
export const ADSENSE_CLIENT = "ca-pub-2885915887212760";

/**
 * Injeta o script do AdSense sob demanda (deduplicado).
 *
 * Antes o `adsbygoogle.js` era carregado por `next/script lazyOnload` em
 * TODA página do grupo (app) — mesmo sem anuncio visivel — executando ~1s
 * de main-thread (show_ads_impl + FundingChoices) e inflando o TBT no
 * mobile. Agora o script so entra quando o primeiro AdSlot se aproxima da
 * viewport: pagina sem slot nunca paga AdSense, e no carregamento inicial
 * (sem scroll) a thread fica livre para o LCP e a hidratacao.
 *
 * O push para `adsbygoogle` pode ocorrer antes do script terminar de
 * carregar: o AdSense processa a fila pendente do array global.
 */
let adsensePromise: Promise<void> | null = null;

export function ensureAdSenseScript(): Promise<void> {
  if (adsensePromise) return adsensePromise;
  adsensePromise = new Promise((resolve) => {
    if (typeof document === "undefined") {
      resolve();
      return;
    }
    if (document.querySelector("script[data-adsense-loader]")) {
      resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
    s.async = true;
    s.crossOrigin = "anonymous";
    s.dataset.adsenseLoader = "";
    s.onload = () => resolve();
    s.onerror = () => resolve();
    document.head.appendChild(s);
  });
  return adsensePromise;
}
