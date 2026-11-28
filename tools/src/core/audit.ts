import {
  ASSET_SPECS,
  CARD_ART,
  MAX_SVG_BYTES,
  largestPlate,
  parseViewBox,
  type AssetType,
} from "./contracts.ts";

export type AuditLevel = "ok" | "aviso" | "erro";

export type AuditIssue = {
  level: AuditLevel;
  rule: string;
  why: string;
  got?: string;
};

export type AuditReport = {
  ok: boolean;
  type: AssetType;
  byteLength: number;
  errors: AuditIssue[];
  warnings: AuditIssue[];
  items: AuditIssue[];
};

const BACK_PLATE_SLACK = 0.002;
const WARN_SVG_BYTES = 250_000;

function stripDefsAndHidden(svg: string): string {
  return svg
    .replace(/<defs[\s\S]*?<\/defs>/gi, "")
    .replace(/<mask[\s\S]*?<\/mask>/gi, "")
    .replace(/<clipPath[\s\S]*?<\/clipPath>/gi, "")
    .replace(/<pattern[\s\S]*?<\/pattern>/gi, "")
    .replace(/<symbol[\s\S]*?<\/symbol>/gi, "");
}

/**
 * Full contract, security, and runtime-compatibility audit for AnimesIce SVGs.
 * Enforces parity with `auditCosmetic()` (frontend), `sanitizeCardBackSvg()` (backend),
 * and `<img src="data:image/svg+xml,...">` rendering constraints in `CosmeticSvg.tsx`.
 */
export function auditCosmeticSvg(svg: string, type: AssetType): AuditReport {
  const items: AuditIssue[] = [];
  const trimmed = svg.trim();
  const byteLength = Buffer.byteLength(svg, "utf8");
  const spec = ASSET_SPECS[type];

  // 1. Root SVG & XML sanity
  const hasRootSvg = /^<svg[\s>]/i.test(trimmed) && /<\/svg>\s*$/i.test(trimmed);
  items.push({
    level: hasRootSvg ? "ok" : "erro",
    rule: "Raiz <svg> válida",
    why: hasRootSvg
      ? "Documento SVG completo e bem formado."
      : "O arquivo precisa começar com <svg ...> e fechar com </svg> (exigido pelo backend sanitizeCardBackSvg).",
  });

  // 2. Security checks (animesice-back/src/gacha/gacha.service.ts)
  const hasScript = /<script\b/i.test(svg);
  const hasEventAttr = /\son[a-z]+\s*=\s*(['"])/i.test(svg);
  const hasJsProto = /javascript\s*:/i.test(svg);
  const secOk = !hasScript && !hasEventAttr && !hasJsProto;
  items.push({
    level: secOk ? "ok" : "erro",
    rule: "Livre de scripts e handlers inline",
    why: secOk
      ? "Sem <script>, atributos on*= ou javascript:."
      : "O backend remove/rejeita <script>, handlers on*= e URLs javascript:.",
    got: secOk
      ? undefined
      : [hasScript && "<script>", hasEventAttr && "on*=", hasJsProto && "javascript:"].filter(Boolean).join(", "),
  });

  // 3. Payload size check
  const sizeOk = byteLength <= MAX_SVG_BYTES;
  const sizeWarn = byteLength > WARN_SVG_BYTES;
  items.push({
    level: !sizeOk ? "erro" : sizeWarn ? "aviso" : "ok",
    rule: `Tamanho <= ${(MAX_SVG_BYTES / (1024 * 1024)).toFixed(0)} MB`,
    why: !sizeOk
      ? "Excede o limite de 2 MB de sanitizeCardBackSvg no backend."
      : sizeWarn
        ? "Acima de 250 KB: considere otimizar com SVGO ou simplificar partículas para carregamento instantâneo."
        : "Tamanho compacto para banco, rede e cache de data URL.",
    got: `${(byteLength / 1024).toFixed(1)} KB`,
  });

  // 4. Exact viewBox check
  const want = parseViewBox(`<svg viewBox="${spec.viewBox}"/>`, spec.viewBox);
  const vb = parseViewBox(svg, spec.viewBox);
  const hasExplicitViewBox = /viewBox\s*=/i.test(svg);
  const vbMatches =
    hasExplicitViewBox &&
    vb.x === want.x &&
    vb.y === want.y &&
    vb.w === want.w &&
    vb.h === want.h;
  items.push({
    level: vbMatches ? "ok" : "erro",
    rule: `viewBox "${spec.viewBox}"`,
    why: vbMatches
      ? `Canvas alinhado ao contrato ${type}.`
      : `viewBox atual "${hasExplicitViewBox ? `${vb.x} ${vb.y} ${vb.w} ${vb.h}` : "ausente"}". Em GachaCard a camada é escalada pelo viewBox; fora da medida ocorre corte ou desalinhamento.`,
    got: hasExplicitViewBox ? `${vb.x} ${vb.y} ${vb.w} ${vb.h}` : "ausente",
  });

  // 5. External resource check (blocked inside <img src="data:image/svg+xml,...">)
  const extHref = /\b(?:xlink:)?href\s*=\s*["']\s*https?:\/\//i.test(svg);
  const extCssImport = /@import\s+url\s*\(/i.test(svg) || /url\(\s*['"]?\s*https?:\/\//i.test(svg);
  const imgSafe = !extHref && !extCssImport;
  items.push({
    level: imgSafe ? "ok" : "erro",
    rule: "Autocontido para <img> (sem URLs externas)",
    why: imgSafe
      ? "Usa apenas referências #internas e data: URIs."
      : "CosmeticSvg renderiza SVGs dentro de <img src='data:image/svg+xml,...'>, onde requisições externas http(s):// são bloqueadas pelo browser.",
  });

  // 6. Accessibility <title>
  const hasTitle = /<title\b[^>]*>[\s\S]*?<\/title>/i.test(svg);
  items.push({
    level: hasTitle ? "ok" : "aviso",
    rule: "Título acessível (<title>)",
    why: hasTitle
      ? "SVG possui título descritivo."
      : "Adicione <title>...</title> para semântica e rastreabilidade do asset.",
  });

  // 7. Reduced motion check if animated
  const isAnimated = /@keyframes\b|<animate\b|<animateTransform\b|<animateMotion\b/i.test(svg);
  if (isAnimated) {
    const hasReduced = /prefers-reduced-motion\s*:\s*reduce/i.test(svg);
    items.push({
      level: hasReduced ? "ok" : "aviso",
      rule: "Suporte a prefers-reduced-motion",
      why: hasReduced
        ? "Animações respeitam @media (prefers-reduced-motion: reduce)."
        : "SVG animado sem regra @media (prefers-reduced-motion: reduce) para desativar movimento.",
    });
  }

  // 8. BACK-specific full plate contract (exact parity with cosmetic-svg.ts)
  if (type === "BACK" || type === "SKIN") {
    const plate = largestPlate(svg);
    if (!plate) {
      items.push({
        level: "erro",
        rule: "Plano de fundo cobrindo o canvas inteiro",
        why: "Nenhum <rect> pintado fora de <defs>. Sem ele, largestPlate() falha e o verso exibe o fundo vazio do container.",
      });
    } else {
      const gaps = {
        esquerda: plate.x - vb.x,
        direita: vb.x + vb.w - (plate.x + plate.w),
        topo: plate.y - vb.y,
        base: vb.y + vb.h - (plate.y + plate.h),
      };
      const worst = Math.max(gaps.esquerda, gaps.direita, gaps.topo, gaps.base);
      const horizontal = worst === gaps.esquerda || worst === gaps.direita;
      const frac = worst / (horizontal ? vb.w : vb.h);
      const bleeds = frac <= BACK_PLATE_SLACK;
      items.push({
        level: bleeds ? "ok" : "erro",
        rule: "Plano de fundo cobrindo o canvas inteiro",
        why: bleeds
          ? "O <rect> principal cobre todas as quatro bordas."
          : `Falta cobertura de plano de fundo nas bordas (${plate.w}x${plate.h} em ${vb.w}x${vb.h}).`,
        got: `${plate.w}x${plate.h}`,
      });

      const plateAspect = plate.w / plate.h;
      const slotAspect = want.w / want.h;
      const aspectOk = Math.abs(plateAspect - slotAspect) < 0.005;
      items.push({
        level: aspectOk ? "ok" : "erro",
        rule: `Arte desenhada em ${want.w}x${want.h} (3/4)`,
        why: aspectOk
          ? "Proporção 3/4 exata para o slot da carta."
          : `Proporção ${plateAspect.toFixed(3)}:1 diverge de ${slotAspect.toFixed(3)}:1.`,
        got: `${plateAspect.toFixed(3)}:1`,
      });
    }
  }

  // 9. FRAME-specific open art window warning
  if (type === "FRAME") {
    const body = stripDefsAndHidden(svg);
    const hasMaskOrCutout = /\bmask\s*=\s*["']url\(/i.test(body) || /\bclip-path\s*=\s*["']url\(/i.test(body);
    const fullPaintedRect = /<rect\b[^>]*width\s*=\s*["'](?:7[5-9]\d|8\d\d)["'][^>]*height\s*=\s*["'](?:10\d\d|9[5-9]\d)["']/i.test(body);
    const hasSolidFillWithoutNone = fullPaintedRect && !/fill\s*=\s*["']none["']/i.test(body) && !hasMaskOrCutout;
    if (hasSolidFillWithoutNone) {
      items.push({
        level: "aviso",
        rule: "Janela central da arte aberta na moldura",
        why: "Um <rect> grande sem fill='none' ou mask='url(...)' pode cobrir a arte da carta no centro.",
      });
    } else {
      items.push({
        level: "ok",
        rule: "Janela central da arte aberta na moldura",
        why: `Janela ${CARD_ART.w}x${CARD_ART.h} preservada para a arte da frente.`,
      });
    }
  }

  const errors = items.filter((i) => i.level === "erro");
  const warnings = items.filter((i) => i.level === "aviso");
  return {
    ok: errors.length === 0,
    type,
    byteLength,
    errors,
    warnings,
    items,
  };
}
