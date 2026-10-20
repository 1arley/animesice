/**
 * Cliente AdSense — fonte única do ID de publicação e do ad unit.
 *
 * NEXT_PUBLIC_* é inlined no build (Dockerfile ARG), por isso o mesmo valor
 * vale no bundle do servidor e no do cliente.
 */
export const ADSENSE_CLIENT =
  process.env.NEXT_PUBLIC_ADSENSE_CLIENT || "ca-pub-2885915887212760";

/**
 * Ad unit usado nos slots (painel do AdSense → Anúncios → Unidades de
 * anúncio). Vazio = nenhum slot renderizado, sem caixa vazia no layout.
 * Cada posição pode sobrescrever via prop `slot` do AdSlot.
 */
export const ADSENSE_SLOT = process.env.NEXT_PUBLIC_ADSENSE_SLOT || "";

/**
 * Injeta o script do AdSense sob demanda (deduplicado).
 *
 * O `adsbygoogle.js` roda ~1s de main-thread (show_ads_impl + FundingChoices)
 * e infla o TBT no mobile. Ele so entra quando o primeiro AdSlot se aproxima
 * da viewport: pagina sem scroll de anuncio nunca paga esse custo, e o
 * carregamento inicial fica livre para o LCP e a hidratacao.
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
