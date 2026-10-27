// check-event-theme: valida o evento sazonal (Guerra Sangrenta).
// Erros aqui falham o predev — nada de evento com data vencida ou match
// quebrado entrando na main.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = readFileSync(join(root, "src", "lib", "event-theme.ts"), "utf8");

const endMatch = /BLOOD_WAR_END\s*=\s*new Date\((.+?)\)/.exec(source);
if (!endMatch) {
  console.error("BLOOD_WAR_END não encontrado em src/lib/event-theme.ts");
  process.exit(1);
}
const end = new Date(eval(endMatch[1]));
if (!(end.getTime() >= Date.now())) {
  console.error(`Evento Guerra Sangrenta vencido em ${end.toISOString()}. Atualize ou remova.`);
  process.exit(1);
}

if (!source.includes('t.toLowerCase().includes("bleach")')) {
  console.error("Match de Bleach ausente em event-theme.ts");
  process.exit(1);
}

console.log(`Evento Guerra Sangrenta ativo até ${end.toISOString()}`);
