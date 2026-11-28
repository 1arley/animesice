import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { auditCosmeticSvg } from "../core/audit.ts";
import {
  ART_PLATE,
  ASSET_SPECS,
  cosmeticTypeOf,
  overlayScale,
  parseViewBox,
  svgDataUrl,
  type AssetType,
} from "../core/contracts.ts";
import { rebuildCatalogIndex, scanCosmeticBundles } from "../export/catalog.ts";
import { DEFAULT_OUTPUT_ROOT } from "../export/paths.ts";

type StudioItem = {
  id: string;
  file: string;
  relDir: string;
  kind: "svg" | "image";
  type: AssetType | "SHADER";
  collection: string;
  slug: string;
  key: string;
  name: string;
  description: string;
  rarity?: string;
  price?: number;
  tags: string[];
  byteLength: number;
  content?: string;
  dataUrl: string;
  overlay?: { width: string; height: string } | null;
  previewUrls: Array<{ name: string; url: string }>;
  assetUrls: Array<{ name: string; url: string }>;
  audit?: ReturnType<typeof auditCosmeticSvg>;
};

const MIME_MAP: Record<string, string> = {
  ".svg": "image/svg+xml; charset=utf-8",
  ".png": "image/png",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".json": "application/json; charset=utf-8",
};

function inferFlatType(fileName: string, svg: string): AssetType {
  const byKey = cosmeticTypeOf(fileName.toUpperCase());
  if (byKey) return byKey;
  const vb = parseViewBox(svg);
  if (vb.x === -60 && vb.y === -60) return "HIGHLIGHT";
  if (vb.x === -30 && vb.y === -30) return "FRAME";
  if (vb.w === 1600 && vb.h === 500) return "BANNER";
  return "BACK";
}

function collectStudioItems(rootDir: string): {
  items: StudioItem[];
  duplicateKeys: Array<{ key: string; slugs: string[] }>;
} {
  const root = path.resolve(rootDir);
  if (!fs.existsSync(root)) return { items: [], duplicateKeys: [] };

  const { entries, shaders } = scanCosmeticBundles(root);
  const items: StudioItem[] = [];
  const byKey = new Map<string, string[]>();

  for (const entry of entries) {
    const svgPath = path.join(root, entry.svgRelPath);
    const svg = fs.readFileSync(svgPath, "utf8");
    const vb = parseViewBox(svg, ASSET_SPECS[entry.type].viewBox);
    const audit = auditCosmeticSvg(svg, entry.type);

    const list = byKey.get(entry.key) ?? [];
    list.push(entry.relDir);
    byKey.set(entry.key, list);

    items.push({
      id: entry.relDir,
      file: entry.svgRelPath,
      relDir: entry.relDir,
      kind: "svg",
      type: entry.type,
      collection: entry.collection,
      slug: entry.slug,
      key: entry.key,
      name: entry.name,
      description: entry.description,
      rarity: entry.rarity,
      price: entry.price,
      tags: entry.tags ?? [],
      byteLength: entry.byteLength,
      content: svg,
      dataUrl: `/files/${entry.svgRelPath}`,
      overlay: overlayScale(vb),
      previewUrls: entry.previewRelPaths.map((p) => ({
        name: path.basename(p),
        url: `/files/${p}`,
      })),
      assetUrls: entry.assetRelPaths.map((p) => ({
        name: path.basename(p),
        url: `/files/${p}`,
      })),
      audit,
    });
  }

  for (const sh of shaders) {
    items.push({
      id: sh.relPath,
      file: sh.relPath,
      relDir: "shaders",
      kind: "image",
      type: "SHADER",
      collection: "shaders",
      slug: path.basename(sh.name, path.extname(sh.name)),
      key: `SHADER_${path.basename(sh.name, path.extname(sh.name)).toUpperCase()}`,
      name: sh.name,
      description: "Textura procedural WebGL2 GLSL.",
      tags: ["shader", "webgl2"],
      byteLength: sh.byteLength,
      dataUrl: `/files/${sh.relPath}`,
      previewUrls: [],
      assetUrls: [],
    });
  }

  // Fallback for flat directories passed via `--dir`
  if (items.length === 0) {
    for (const d of fs.readdirSync(root, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (!d.isFile()) continue;
      const ext = path.extname(d.name).toLowerCase();
      if (ext === ".svg") {
        const full = path.join(root, d.name);
        const svg = fs.readFileSync(full, "utf8");
        const type = inferFlatType(d.name, svg);
        items.push({
          id: d.name,
          file: d.name,
          relDir: ".",
          kind: "svg",
          type,
          collection: "flat",
          slug: path.basename(d.name, ".svg"),
          key: path.basename(d.name, ".svg").toUpperCase(),
          name: d.name,
          description: "",
          tags: [],
          byteLength: Buffer.byteLength(svg, "utf8"),
          content: svg,
          dataUrl: `/files/${d.name}`,
          overlay: overlayScale(parseViewBox(svg, ASSET_SPECS[type].viewBox)),
          previewUrls: [],
          assetUrls: [],
          audit: auditCosmeticSvg(svg, type),
        });
      }
    }
  }

  const duplicateKeys = Array.from(byKey.entries())
    .filter(([, slugs]) => slugs.length > 1)
    .map(([key, slugs]) => ({ key, slugs }));

  return { items, duplicateKeys };
}

function renderStudioHtml(dir: string): string {
  const { items, duplicateKeys } = collectStudioItems(dir);
  const artDataUrl = svgDataUrl(ART_PLATE);
  const serialized = JSON.stringify(items);
  const dupJson = JSON.stringify(duplicateKeys);

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>AnimesIce Art Studio — Catálogo &amp; Auditoria</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; background: #080C12; color: #F1F5F9; font-family: system-ui, -apple-system, sans-serif; }
  .layout { display: grid; grid-template-columns: 330px 1fr; min-height: 100vh; }
  aside { background: #0E141D; border-right: 1px solid #1F2B3E; padding: 16px; display: flex; flex-direction: column; gap: 12px; max-height: 100vh; overflow-y: auto; }
  main { padding: 20px 24px; display: grid; gap: 18px; align-content: start; }
  h1 { font-size: 15px; margin: 0; color: #38E8DA; letter-spacing: 0.08em; font-family: ui-monospace, monospace; }
  .sub { font-size: 11px; color: #94A3B8; margin: 2px 0 0; }
  .search-input, .select-input {
    width: 100%; background: #121A26; border: 1px solid #1F2B3E; color: #F1F5F9;
    padding: 8px 10px; font-size: 12px;
  }
  .type-tabs { display: flex; flex-wrap: wrap; gap: 5px; }
  .type-tab {
    background: #121A26; border: 1px solid #1F2B3E; color: #94A3B8; padding: 4px 8px;
    font-size: 10px; font-family: ui-monospace, monospace; cursor: pointer;
  }
  .type-tab.active { border-color: #38E8DA; color: #38E8DA; background: rgba(56,232,218,0.1); }
  .group-label {
    font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #64748B;
    font-family: ui-monospace, monospace; margin: 8px 0 4px;
  }
  .list { display: grid; gap: 6px; }
  .item-btn {
    text-align: left; background: #121A26; border: 1px solid #1F2B3E; color: #F1F5F9;
    padding: 9px 11px; cursor: pointer; font-family: ui-monospace, monospace; font-size: 11px;
  }
  .item-btn.active { border-color: #38E8DA; background: rgba(56,232,218,0.1); }
  .item-top { display: flex; justify-content: space-between; gap: 8px; font-weight: 600; }
  .item-meta { display: flex; justify-content: space-between; margin-top: 4px; font-size: 10px; color: #94A3B8; }
  .badge-ok { color: #34D399; } .badge-warn { color: #FCD34D; } .badge-err { color: #FF6B4A; }
  .toolbar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; padding: 12px 14px; background: #0E141D; border: 1px solid #1F2B3E; }
  .btn, select {
    background: #121A26; border: 1px solid #1F2B3E; color: #F1F5F9; padding: 7px 11px; font-size: 12px; cursor: pointer;
  }
  .btn.on { border-color: #38E8DA; color: #38E8DA; }
  .dup-banner { border: 1px solid #FF6B4A; background: rgba(255,107,74,0.1); color: #FCA5A5; padding: 10px 14px; font-size: 12px; }
  .stage-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(310px, 1fr)); gap: 18px; }
  .card-panel { background: #0E141D; border: 1px solid #1F2B3E; padding: 15px; }
  .card-panel h2 { margin: 0 0 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #94A3B8; font-family: ui-monospace, monospace; }
  .stage { display: flex; justify-content: center; align-items: center; min-height: 430px; background: #05070B; border: 1px dashed rgba(255,255,255,0.08); padding: 14px; }
  .gacha-card { width: 285px; aspect-ratio: 3/4; position: relative; overflow: hidden; border: 1px solid rgba(252,211,77,0.65); box-shadow: 0 0 24px rgba(252,211,77,0.2); }
  .gacha-card img.base { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  .gacha-card img.ov { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); max-width: none; z-index: 10; }
  .pill { position: absolute; z-index: 20; background: rgba(8,12,18,0.85); padding: 2px 7px; font-family: ui-monospace, monospace; font-size: 11px; }
  .tl { top: 6px; left: 6px; color: #FCD34D; } .tr { top: 6px; right: 6px; color: #38E8DA; } .br { bottom: 6px; right: 6px; color: #38E8DA; }
  .audit-list { display: grid; gap: 8px; margin: 0; padding: 0; list-style: none; font-size: 12px; }
  .audit-list li { border-left: 2px solid #1F2B3E; padding-left: 10px; }
  .audit-list li[data-level="ok"] { border-color: #34D399; }
  .audit-list li[data-level="aviso"] { border-color: #FCD34D; }
  .audit-list li[data-level="erro"] { border-color: #FF6B4A; }
  .previews-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; }
  .preview-card { background: #05070B; border: 1px solid #1F2B3E; padding: 8px; }
  .preview-card div { font-size: 10px; color: #38E8DA; font-family: ui-monospace, monospace; margin-bottom: 6px; }
  .preview-card img { width: 100%; height: auto; display: block; }
  .reduced * { animation: none !important; }
</style>
</head>
<body>
<div class="layout">
  <aside>
    <div>
      <h1>ANIMESICE STUDIO</h1>
      <p class="sub">${items.length} itens indexados em output/</p>
    </div>
    <input id="searchBox" class="search-input" placeholder="Buscar por nome, key, coleção, tag..." />
    <div id="typeTabs" class="type-tabs"></div>
    <select id="collectionSel" class="select-input"></select>
    <div id="list" class="list"></div>
  </aside>
  <main>
    <div id="dupAlert"></div>
    <div class="toolbar">
      <button id="toggleHud" class="btn on">HUD Pills</button>
      <button id="toggleReduced" class="btn">Simular reduced-motion</button>
      <select id="raritySel">
        <option>LENDARIA</option><option>GALACTICA</option><option>MITICA</option>
        <option>EPICA</option><option>RARA</option><option>INCOMUM</option><option>COMUM</option>
      </select>
      <select id="foilSel">
        <option>GOLD</option><option>PRISM</option><option>HOLO</option><option>INK</option><option>NORMAL</option>
      </select>
      <button id="copyBtn" class="btn">Copiar SVG</button>
      <button id="copyJsonBtn" class="btn">Copiar JSON Admin</button>
      <button id="refreshBtn" class="btn" onclick="location.reload()">Recarregar</button>
    </div>
    <div id="viewer"></div>
  </main>
</div>
<script>
const ITEMS = ${serialized};
const DUPLICATES = ${dupJson};
const ART = ${JSON.stringify(artDataUrl)};
let selectedId = ITEMS[0]?.id || null;
let typeFilter = "ALL";
let collectionFilter = "ALL";
let searchQuery = "";
let showHud = true;
let reduced = false;

const typeTabsEl = document.getElementById("typeTabs");
const colSelEl = document.getElementById("collectionSel");
const listEl = document.getElementById("list");
const viewerEl = document.getElementById("viewer");
const dupEl = document.getElementById("dupAlert");

if (DUPLICATES.length > 0) {
  dupEl.innerHTML = '<div class="dup-banner"><strong>Chaves duplicadas detectadas:</strong> ' +
    DUPLICATES.map(d => d.key + ' (' + d.slugs.join(', ') + ')').join(' · ') + '</div>';
}

function renderFilters() {
  const types = ["ALL", "BACK", "FRAME", "HIGHLIGHT", "SKIN", "BANNER", "SHADER"];
  typeTabsEl.innerHTML = types.map(t => {
    const count = t === "ALL" ? ITEMS.length : ITEMS.filter(i => i.type === t).length;
    if (t !== "ALL" && count === 0) return "";
    return \`<button class="type-tab \${typeFilter === t ? "active" : ""}" onclick="setType('\${t}')">\${t} (\${count})</button>\`;
  }).join("");

  const cols = Array.from(new Set(ITEMS.map(i => i.collection))).sort();
  colSelEl.innerHTML = ['<option value="ALL">Todas as coleções</option>']
    .concat(cols.map(c => \`<option value="\${c}" \${collectionFilter === c ? "selected" : ""}>\${c}</option>\`))
    .join("");
}

function filteredItems() {
  const q = searchQuery.trim().toLowerCase();
  return ITEMS.filter(it => {
    if (typeFilter !== "ALL" && it.type !== typeFilter) return false;
    if (collectionFilter !== "ALL" && it.collection !== collectionFilter) return false;
    if (!q) return true;
    return [it.name, it.key, it.slug, it.collection, ...(it.tags || [])].join(" ").toLowerCase().includes(q);
  });
}

window.setType = (t) => { typeFilter = t; renderFilters(); renderList(); };
window.selectItem = (id) => { selectedId = id; renderList(); renderViewer(); };

function renderList() {
  const list = filteredItems();
  if (list.length === 0) {
    listEl.innerHTML = '<p style="font-size:12px;color:#94A3B8">Nenhum item corresponde ao filtro.</p>';
    return;
  }
  if (!list.some(i => i.id === selectedId)) selectedId = list[0].id;

  const grouped = new Map();
  for (const it of list) {
    const g = it.type + " · " + it.collection;
    if (!grouped.has(g)) grouped.set(g, []);
    grouped.get(g).push(it);
  }

  let html = "";
  for (const [group, entries] of grouped.entries()) {
    html += \`<div class="group-label">\${group}</div>\`;
    for (const it of entries) {
      const statusCls = !it.audit ? "badge-ok" : !it.audit.ok ? "badge-err" : it.audit.warnings > 0 ? "badge-warn" : "badge-ok";
      const statusTxt = !it.audit ? "IMG" : !it.audit.ok ? "ERRO" : it.audit.warnings > 0 ? "WARN" : "OK";
      html += \`<button class="item-btn \${it.id === selectedId ? "active" : ""}" onclick="selectItem('\${it.id}')">
        <div class="item-top"><span>\${it.name}</span><span class="\${statusCls}">\${statusTxt}</span></div>
        <div class="item-meta"><span>\${it.key}</span><span>\${(it.byteLength/1024).toFixed(1)}KB</span></div>
      </button>\`;
    }
  }
  listEl.innerHTML = html;
}

function renderViewer() {
  const it = ITEMS.find(i => i.id === selectedId);
  if (!it) {
    viewerEl.innerHTML = "<p>Nenhum asset encontrado. Rode <code>npm run cosmetics:examples</code>.</p>";
    return;
  }
  const rarity = document.getElementById("raritySel").value;
  const foil = document.getElementById("foilSel").value;

  const hud = showHud ? \`<span class="pill tl">\${rarity}</span>\${foil !== "NORMAL" ? \`<span class="pill tr">\${foil}</span>\` : ""}<span class="pill br">◆◆◆ MINT</span>\` : "";
  const composite = it.type === "FRAME" || it.type === "HIGHLIGHT"
    ? \`<div class="gacha-card"><img class="base" src="\${ART}" alt=""><img class="ov" src="\${it.dataUrl}" style="width:\${it.overlay?.width || "100%"};height:\${it.overlay?.height || "100%"};" alt="">\${hud}</div>\`
    : \`<div class="gacha-card"><img class="base" src="\${it.dataUrl}" alt="">\${hud}</div>\`;

  const auditItems = (it.audit?.items || []).map(a => \`<li data-level="\${a.level}"><strong>[\${a.level.toUpperCase()}] \${a.rule}</strong> \${a.got ? "("+a.got+")" : ""}<br><span style="color:#94A3B8">\${a.why}</span></li>\`).join("");
  const previewGallery = (it.previewUrls || []).length
    ? \`<div class="card-panel" style="margin-top:18px"><h2>Previews Co-localizados (\${it.relDir}/previews)</h2><div class="previews-grid">\${it.previewUrls.map(p => \`<div class="preview-card"><div>\${p.name}</div><img src="\${p.url}" alt=""></div>\`).join("")}</div></div>\`
    : "";

  viewerEl.innerHTML = \`
    <div class="stage-grid \${reduced ? "reduced" : ""}">
      <div class="card-panel">
        <h2>Standalone · \${it.relDir}</h2>
        <div class="stage"><img src="\${it.dataUrl}" style="max-width:300px;max-height:410px;width:auto;height:auto;" alt=""></div>
      </div>
      <div class="card-panel">
        <h2>GachaCard Preview (\${it.type})</h2>
        <div class="stage">\${composite}</div>
      </div>
      <div class="card-panel">
        <h2>Metadados &amp; Auditoria (\${(it.byteLength/1024).toFixed(1)} KB / 2048 KB)</h2>
        <p style="font-size:12px;color:#94A3B8;margin-top:0">
          <strong>Key:</strong> <code>\${it.key}</code> · <strong>Coleção:</strong> \${it.collection} ·
          \${it.rarity ? "<strong>Raridade:</strong> " + it.rarity : ""} \${it.price !== undefined ? " · <strong>Preço:</strong> " + it.price : ""}
        </p>
        <ul class="audit-list">\${auditItems || "<li>Asset raster / shader</li>"}</ul>
      </div>
    </div>
    \${previewGallery}
  \`;
}

document.getElementById("searchBox").oninput = (e) => { searchQuery = e.target.value; renderList(); };
colSelEl.onchange = (e) => { collectionFilter = e.target.value; renderList(); };
document.getElementById("toggleHud").onclick = (e) => { showHud = !showHud; e.target.classList.toggle("on", showHud); renderViewer(); };
document.getElementById("toggleReduced").onclick = (e) => { reduced = !reduced; e.target.classList.toggle("on", reduced); renderViewer(); };
document.getElementById("raritySel").onchange = renderViewer;
document.getElementById("foilSel").onchange = renderViewer;
document.getElementById("copyBtn").onclick = async () => {
  const it = ITEMS.find(i => i.id === selectedId);
  if (it?.content) {
    await navigator.clipboard.writeText(it.content);
    document.getElementById("copyBtn").textContent = "Copiado!";
    setTimeout(() => { document.getElementById("copyBtn").textContent = "Copiar SVG"; }, 1400);
  }
};
document.getElementById("copyJsonBtn").onclick = async () => {
  const it = ITEMS.find(i => i.id === selectedId);
  if (it?.content) {
    const payload = {
      key: it.key,
      name: it.name,
      description: it.description,
      type: it.type,
      rarity: it.rarity || "COMMON",
      price: it.price ?? 1200,
      svg: it.content,
    };
    await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    document.getElementById("copyJsonBtn").textContent = "JSON Copiado!";
    setTimeout(() => { document.getElementById("copyJsonBtn").textContent = "Copiar JSON Admin"; }, 1400);
  }
};

renderFilters();
renderList();
renderViewer();
</script>
</body>
</html>`;
}

export function startPreviewServer(opts?: { dir?: string; port?: number }): http.Server {
  const dir = path.resolve(opts?.dir ?? DEFAULT_OUTPUT_ROOT);
  const port = opts?.port ?? 4173;

  const server = http.createServer((req, res) => {
    const reqPath = decodeURIComponent((req.url || "/").split("?")[0] || "/");
    if (reqPath === "/") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(renderStudioHtml(dir));
      return;
    }
    if (reqPath === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, dir }));
      return;
    }
    if (reqPath === "/api/catalog") {
      const catalog = rebuildCatalogIndex(dir);
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify(catalog));
      return;
    }
    if (reqPath.startsWith("/files/")) {
      const rel = reqPath.slice("/files/".length);
      const target = path.resolve(dir, rel);
      const safePrefix = dir.endsWith(path.sep) ? dir : dir + path.sep;
      if (!target.startsWith(safePrefix)) {
        res.writeHead(403);
        res.end("Forbidden");
        return;
      }
      if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      const ext = path.extname(target).toLowerCase();
      res.writeHead(200, { "Content-Type": MIME_MAP[ext] ?? "application/octet-stream" });
      fs.createReadStream(target).pipe(res);
      return;
    }
    res.writeHead(404);
    res.end("Not found");
  });

  server.listen(port, "127.0.0.1", () => {
    console.log(`AnimesIce Art Studio listening at http://127.0.0.1:${port}/ (dir: ${dir})`);
  });
  return server;
}
