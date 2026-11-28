import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const RARITIES = [
  "COMUM",
  "INCOMUM",
  "RARA",
  "EPICA",
  "LENDARIA",
  "MITICA",
  "GALACTICA",
];

const requested = process.argv.slice(2).map((r) => r.toUpperCase());
const rarities = requested.length > 0 ? requested : RARITIES;

for (const rarity of rarities) {
  if (!RARITIES.includes(rarity)) {
    console.error(`Raridade inválida: ${rarity}. Use: ${RARITIES.join(", ")}`);
    process.exit(1);
  }
}

const remotionNodeModules = path.resolve("remotion/node_modules");
if (!fs.existsSync(remotionNodeModules)) {
  console.error(
    "Dependências do estúdio de vídeo não instaladas. Execute primeiro: npm run video:install",
  );
  process.exit(1);
}

const args = [
  "remotion/src/cli.ts",
  "render",
  "--slug",
  "gacha-crystal",
  "--publish",
];

if (requested.length > 0) {
  args.push("--variant", rarities.map((r) => r.toLowerCase()).join(","));
}

const res = spawnSync("node", args, { stdio: "inherit" });
if (res.error) throw res.error;
if (res.status !== 0) process.exit(res.status ?? 1);
