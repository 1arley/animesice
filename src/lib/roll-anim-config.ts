export const TEASE_MODES = ["random", "ordered", "climb"] as const;

export type RollAnimConfig = {
  enterDuration: number;
  crystalSpinAt: number;
  crystalSpinDuration: number;
  revealAt: number;
  /** "random" sorteia a cor; "ordered" usa a sequência antiga, determinística; "climb" sobe um degrau por parada até a real. */
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

const LIMITS = {
  enterDuration: [0, 2],
  crystalSpinAt: [0, 3],
  crystalSpinDuration: [0.1, 3],
  revealAt: [0.5, 5],
  maxDrop: [0, 6],
  crystalOutDuration: [0.05, 1],
  ringSlots: [1, 3],
  ringDuration: [0.1, 2],
  ringStagger: [0, 0.5],
  particleSlots: [1, 48],
  particleDuration: [0.1, 2],
  effectsGap: [0, 1],
  flipDuration: [0.1, 2],
  sweepDuration: [0.1, 2],
  badgeDuration: [0.05, 1],
} as const;

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
    if (!Object.hasOwn(DEFAULT_ROLL_ANIM_CONFIG, key)) {
      return { ok: false, error: `Chave desconhecida: ${key}` };
    }
    const sample = DEFAULT_ROLL_ANIM_CONFIG[key as keyof RollAnimConfig];
    const valid = key === "particleGalaxy"
      ? Array.isArray(value) && value.length > 0 && value.length <= 8 && value.every((v) => typeof v === "string" && /^#[\da-fA-F]{6}$/.test(v))
      : key === "particleReach"
        ? !!value && typeof value === "object" && !Array.isArray(value)
          && Object.keys(value).length === 2
          && Object.values(value).every((v) => typeof v === "number" && Number.isFinite(v) && v > 0 && v <= 600)
          && "x" in value && "y" in value
      : Array.isArray(sample)
      ? Array.isArray(value) && value.every((v) => typeof v === "string")
      : sample !== null && typeof sample === "object"
        ? !!value && typeof value === "object" && !Array.isArray(value)
        : typeof sample === "string"
        // shortcut: única chave de texto da config é teaseMode; ao adicionar outra,
        // inclua na lista de opções aqui e no select do admin.
        ? (TEASE_MODES as readonly string[]).includes(value)
        : typeof value === "number" && Number.isFinite(value)
          && key in LIMITS
          && value >= LIMITS[key as keyof typeof LIMITS][0]
          && value <= LIMITS[key as keyof typeof LIMITS][1]
          && (!(key === "ringSlots" || key === "particleSlots" || key === "maxDrop") || Number.isInteger(value));
    if (!valid) return { ok: false, error: `Tipo inválido em "${key}".` };
    out[key] = value;
  }
  return { ok: true, value: out as Partial<RollAnimConfig> };
}

/** Config persistida pode conter chaves antigas; dados inválidos caem no padrão seguro. */
export function readRollAnimConfig(value: unknown): RollAnimConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) return DEFAULT_ROLL_ANIM_CONFIG;
  const known = Object.fromEntries(
    Object.entries(value).filter(([key]) => Object.hasOwn(DEFAULT_ROLL_ANIM_CONFIG, key)),
  );
  const parsed = parseRollAnimJson(JSON.stringify(known));
  return parsed.ok ? { ...DEFAULT_ROLL_ANIM_CONFIG, ...parsed.value } : DEFAULT_ROLL_ANIM_CONFIG;
}
