/**
 * Gera um blurDataURL SVG genérico — placeholder de carregamento para
 * next/image. Um gradiente suave na paleta do site (ink → hairline)
 * evita "flash" branco/imagem vazia enquanto a imagem real baixa.
 *
 * Não depende de processar cada imagem individualmente (diferente de
 * plaiceholder/sharp): é um data URI SVG base64 estático, leve (~300 bytes).
 */

const SVG_BLUR = (w: number, h: number) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <defs>
    <linearGradient id="bl" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#080b12" stop-opacity="0.95"/>
      <stop offset="0.5" stop-color="#1a2a40" stop-opacity="0.7"/>
      <stop offset="1" stop-color="#0a0e16" stop-opacity="0.95"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bl)"/>
  <circle cx="${w * 0.3}" cy="${h * 0.3}" r="${Math.min(w, h) * 0.12}" fill="#243350" opacity="0.2"/>
  <circle cx="${w * 0.7}" cy="${h * 0.7}" r="${Math.min(w, h) * 0.08}" fill="#2a3a4f" opacity="0.15"/>
</svg>`;

const svgToDataURL = (svg: string) => {
  const minified = svg.replace(/\n\s*/g, "");
  const encoded = Buffer.from(minified).toString("base64");
  return `data:image/svg+xml;base64,${encoded}`;
};

const post89 = svgToDataURL(SVG_BLUR(8, 12));
const land69 = svgToDataURL(SVG_BLUR(16, 9));
const square = svgToDataURL(SVG_BLUR(10, 10));
const wide = svgToDataURL(SVG_BLUR(16, 9));

export const blur = {
  portrait: post89,
  landscape: land69,
  square,
  wide,
};
