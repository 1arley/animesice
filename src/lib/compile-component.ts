/**
 * Compila um componente TSX colado e devolve o que ele exporta.
 * Usado por /admin/gacha/animacao para rodar o ARQUIVO INTEIRO da animação
 * colado pelo dev, sem deploy: compila no browser e monta o componente.
 *
 * ponytail: o mapa de imports é injetado pelo chamador (roll-anim-source.ts).
 * Import fora do mapa = erro claro na hora. Subir para esbuild-wasm (resolve a
 * árvore inteira) quando outro arquivo precisar ser colado aqui.
 */

export type ModuleMap = Record<string, unknown>;

/** Sucrase emite `require()`; o `_interopRequireDefault` espera `__esModule`. */
function interop(ns: Record<string, unknown>): Record<string, unknown> {
  if ("__esModule" in ns) return ns;
  const own = (ns as { default?: unknown }).default;
  return { __esModule: true, ...ns, default: own ?? ns };
}

export async function compileComponent(
  source: string,
  modules: ModuleMap,
  filePath = "Component.tsx",
): Promise<Record<string, unknown>> {
  const { transform } = await import("sucrase");
  const { code } = transform(source, {
    filePath,
    transforms: ["typescript", "jsx", "imports"],
    jsxRuntime: "automatic",
    production: true,
  });

  const shimRequire = (id: string): Record<string, unknown> => {
    const ns = modules[id];
    if (!ns) {
      throw new Error(
        `Import não disponível no preview: "${id}".Disponíveis: ${Object.keys(modules).join(", ")}`,
      );
    }
    return interop(ns as Record<string, unknown>);
  };

  const mod = { exports: {} as Record<string, unknown> };
  // new Function é o ponto do recurso (preview de código colado).
  new Function("require", "module", "exports", code)(shimRequire, mod, mod.exports);
  return mod.exports;
}

/** Extrai um export nomeado já interopado, com erro legível se não existir. */
export function pickExport(exports: Record<string, unknown>, name: string): unknown {
  if (!(name in exports)) {
    throw new Error(`O arquivo colado não exporta "${name}".`);
  }
  return exports[name];
}