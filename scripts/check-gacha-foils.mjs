// Garante que o espelho de GACHA_FOILS no frontend não divirja do backend.
// Divergiu em 2026-10-07: o backend somou INK e /gacha/ continuou
// anunciando 85/12/3 sem nenhum aviso.
//
// Sem o backend no disco (CI, deploy) não há o que comparar: avisa e passa.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const BACKEND = join(root, "..", "animesice-back", "src", "gacha", "gacha.constants.ts");
const FRONTEND = join(root, "src", "components", "gacha", "GachaCard.tsx");

function readFoils(path) {
  const source = readFileSync(path, "utf8");
  const array = /export const GACHA_FOILS\s*=\s*\[([\s\S]*?)\]/.exec(source);
  if (!array) throw new Error(`GACHA_FOILS não encontrado em ${path}`);
  return [...array[1].matchAll(/['"]([A-Z_]+)['"]/g)].map((m) => m[1]);
}

let backend;
try {
  backend = readFoils(BACKEND);
} catch (error) {
  if (error.code !== "ENOENT") throw error;
  console.log("Backend ausente — pulando comparação de GACHA_FOILS");
  process.exit(0);
}

const frontend = readFoils(FRONTEND);

if (frontend.join() !== backend.join()) {
  console.error("GACHA_FOILS divergiu do backend.");
  console.error(`  backend : ${backend.join(", ")}`);
  console.error(`  frontend: ${frontend.join(", ")}`);
  console.error("Sincronize src/components/gacha/GachaCard.tsx");
  process.exit(1);
}

console.log(`GACHA_FOILS em sincronia: ${frontend.join(", ")}`);