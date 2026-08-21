import { readFileSync } from "node:fs";

const html = readFileSync(".next/server/app/index.html", "utf8");
const scripts = [...html.matchAll(/<script(?: [^>]*)?>([\s\S]*?)<\/script>/g)].map(
  (match) => match[1],
);
const recoveryScript = scripts.find((script) =>
  script.includes("ANIMESICE_CHUNK_RECOVERY_EXHAUSTED"),
);

if (!recoveryScript) {
  throw new Error("Chunk recovery script was not emitted in the document head");
}

// Parsing the emitted HTML catches escaping bugs that TypeScript cannot see.
new Function(recoveryScript);

if (!recoveryScript.includes("indexOf('/_next/static/')")) {
  throw new Error("Chunk recovery script does not detect Next static assets");
}

console.log("Chunk recovery script is present and syntactically valid");
