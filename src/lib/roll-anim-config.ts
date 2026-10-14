export const TEASE_MODES = ["random", "ordered"] as const;

export type RollAnimConfig = {
  enterDuration: number;
  crystalSpinAt: number;
  crystalSpinDuration: number;
  glowAt: number;
  glowDuration: number;
  skipAt: number;
  revealAt: number;
  /** "random" sorteia a cor; "ordered" usa a sequência antiga, determinística. */
  teaseMode: (typeof TEASE_MODES)[number];
  /** Quantos tiers o brilho pode cair entre dois flashes (só no modo random). */
  maxDrop: number;
  crystalOutDuration: number;
  ringSlots: number;
  ringDuration: number;
  ringStagger: number;
  particleSlots: number;
  particleDuration: number;
  particleReach: { x: number; y: number };
  particleGalaxy: string[];
  effectsGap: number;
  flipDuration: number;
  sweepDuration: number;
  badgeDuration: number;
};

export const DEFAULT_ROLL_ANIM_CONFIG: RollAnimConfig = {
  enterDuration: 0.15,
  crystalSpinAt: 0.2,
  crystalSpinDuration: 0.9,
  glowAt: 0.3,
  glowDuration: 1.3,
  skipAt: 0.6,
  revealAt: 1.2,
  teaseMode: "random",
  maxDrop: 2,
  crystalOutDuration: 0.25,
  ringSlots: 3,
  ringDuration: 0.55,
  ringStagger: 0.12,
  particleSlots: 24,
  particleDuration: 0.55,
  particleReach: { x: 180, y: 230 },
  particleGalaxy: ["#a78bfa", "#f472b6", "#38bdf8"],
  effectsGap: 0.18,
  flipDuration: 0.42,
  sweepDuration: 0.6,
  badgeDuration: 0.3,
};

export type ParsedRollJson =
  | { ok: true; value: Partial<RollAnimConfig> }
  | { ok: false; error: string };

/**
 * Extrai o primeiro objeto balanceado do texto, para aceitar colar o bloco
 * `const ROLL = { ... } as const;` em vez de JSON puro.
 * ponytail: não rastreia chaves nem blocos de comentário; colar config com '{'
 * dentro de string é rejeitado. Subir para scan real quando alguém colar CSS/URL.
 */
function firstObjectLiteral(text: string): string | null {
  const start = text.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  for (let i = start; i < text.length; i += 1) {
    if (text[i] === "{") depth += 1;
    else if (text[i] === "}") {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

/** Tira comentário de linha, vírgula final e coloca aspas nas chaves soltas. */
function toJsonLiteral(literal: string): string {
  return literal
    .replace(/\/\/[^\n]*/g, "")
    .replace(/,(\s*[}\]])/g, "$1")
    .replace(/([{,\s])([A-Za-z_$][A-Za-z0-9_$]*)(\s*:)/g, '$1"$2"$3');
}

/** Aceita objeto JSON ou bloco TS parcial. Rejeita chave desconhecida e tipo divergente do default. */
export function parseRollAnimJson(text: string): ParsedRollJson {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    const literal = firstObjectLiteral(text);
    if (!literal) return { ok: false, error: "JSON inválido." };
    try {
      raw = JSON.parse(toJsonLiteral(literal));
    } catch {
      return { ok: false, error: "Não consegui ler o objeto colado." };
    }
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: "Esperado um objeto JSON." };
  }
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!(key in DEFAULT_ROLL_ANIM_CONFIG)) {
      return { ok: false, error: `Chave desconhecida: ${key}` };
    }
    const sample = DEFAULT_ROLL_ANIM_CONFIG[key as keyof RollAnimConfig];
    const valid = Array.isArray(sample)
      ? Array.isArray(value) && value.every((v) => typeof v === "string")
      : sample !== null && typeof sample === "object"
        ? !!value && typeof value === "object" && !Array.isArray(value)
        : typeof sample === "string"
        // shortcut: única chave de texto da config é teaseMode; ao adicionar outra,
        // inclua na lista de opções aqui e no select do admin.
        ? (TEASE_MODES as readonly string[]).includes(value)
        : typeof value === "number" && Number.isFinite(value);
    if (!valid) return { ok: false, error: `Tipo inválido em "${key}".` };
    out[key] = value;
  }
  return { ok: true, value: out as Partial<RollAnimConfig> };
}
