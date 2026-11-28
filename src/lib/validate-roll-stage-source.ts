import { transform } from "sucrase";

/** Imports que o preview injeta; qualquer outro é recusado antes de gravar. */
const CONTRACT_IMPORTS = new Set(["three", "@/lib/roll-anim-config"]);

/**
 * Valida a fonte salva sem executá-la, com o mesmo pipeline do preview
 * (`sucrase`): sintaxe, imports do contrato e a classe `RollStageEngine` com
 * `play()`/`destroy()`. O que passa aqui é exatamente o que o painel roda —
 * imports dinâmicos viram `require()` e caem na mesma lista.
 */
export function validateRollStageSource(source: string, filePath = "roll-stage-engine.js"): void {
  let code: string;
  try {
    ({ code } = transform(source, {
      filePath,
      transforms: ["typescript", "jsx", "imports"],
      jsxRuntime: "automatic",
      production: true,
    }));
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Não consegui compilar a fonte.");
  }

  for (const [, id] of code.matchAll(/\brequire\(\s*["']([^"']+)["']\s*\)/g)) {
    if (!CONTRACT_IMPORTS.has(id)) throw new Error(`Import não disponível no preview: "${id}".`);
  }

  const start = code.search(/\bclass\s+RollStageEngine\b/);
  const exportedAt = code.indexOf("exports.RollStageEngine = RollStageEngine", start);
  if (start < 0 || exportedAt < 0) throw new Error('A fonte precisa exportar a classe "RollStageEngine".');

  const engine = code.slice(start, exportedAt);
  for (const method of ["play", "destroy"]) {
    if (!new RegExp(`(?:^|[\\s;{}])(?:async\\s+)?${method}\\s*\\(`).test(engine)) {
      throw new Error('"RollStageEngine" precisa implementar play() e destroy().');
    }
  }
}
