import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { DEFAULT_OUTPUT_ROOT } from "../core/paths.ts";
import { rebuildCatalogIndex } from "../export/catalog.ts";

const MIME_MAP: Record<string, string> = {
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".json": "application/json; charset=utf-8",
};

function renderStudioHtml(): string {
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>AnimesIce Video Studio</title>
<style>
  :root {
    --ink: #080C12;
    --panel: #0E141D;
    --subtle: #121A26;
    --line: #1F2B3E;
    --ice: #38E8DA;
    --snow: #F1F5F9;
    --mist: #94A3B8;
    --ok: #34D399;
    --warn: #FBBF24;
    --err: #FB7185;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: var(--ink);
    color: var(--snow);
    font-family: "Plus Jakarta Sans", system-ui, sans-serif;
    min-height: 100vh;
    display: grid;
    grid-template-rows: auto 1fr;
  }
  header {
    border-bottom: 1px solid var(--line);
    background: var(--panel);
    padding: 14px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }
  .brand {
    font-weight: 700;
    letter-spacing: 0.08em;
    font-size: 14px;
    color: var(--ice);
    text-transform: uppercase;
  }
  .controls {
    display: flex;
    gap: 10px;
    align-items: center;
    flex-wrap: wrap;
  }
  input, select, button {
    background: var(--subtle);
    color: var(--snow);
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 8px 12px;
    font-size: 13px;
  }
  button { cursor: pointer; }
  button:hover { border-color: var(--ice); }
  main {
    display: grid;
    grid-template-columns: 320px 1fr;
    min-height: 0;
  }
  aside {
    border-right: 1px solid var(--line);
    padding: 16px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .bundle-card {
    padding: 12px;
    border-radius: 10px;
    border: 1px solid var(--line);
    background: var(--panel);
    cursor: pointer;
    text-align: left;
  }
  .bundle-card.active { border-color: var(--ice); background: var(--subtle); }
  .bundle-card .title { font-weight: 600; font-size: 14px; }
  .bundle-card .meta { color: var(--mist); font-size: 12px; margin-top: 4px; }
  .badge {
    display: inline-block;
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 999px;
    border: 1px solid var(--line);
    margin-right: 6px;
  }
  .badge.ok { color: var(--ok); border-color: rgba(52,211,153,0.4); }
  .badge.err { color: var(--err); border-color: rgba(251,113,133,0.4); }
  section.viewer {
    padding: 24px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 18px;
  }
  .stage-box {
    background: #05070B;
    border: 1px solid var(--line);
    border-radius: 14px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
  }
  video, img.preview-img {
    max-width: 100%;
    max-height: 460px;
    border-radius: 10px;
    border: 1px solid var(--line);
    background: #000;
  }
  .variant-pills { display: flex; gap: 8px; flex-wrap: wrap; }
  .pill {
    padding: 6px 12px;
    border-radius: 999px;
    border: 1px solid var(--line);
    background: var(--panel);
    color: var(--snow);
    font-size: 12px;
    cursor: pointer;
  }
  .pill.active { border-color: var(--ice); color: var(--ice); }
  .banner-warn {
    padding: 10px 14px;
    border-radius: 8px;
    border: 1px solid var(--err);
    background: rgba(251,113,133,0.1);
    color: var(--err);
    font-size: 13px;
  }
  pre {
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 10px;
    padding: 12px;
    overflow-x: auto;
    font-size: 12px;
    color: var(--mist);
  }
</style>
</head>
<body>
  <header>
    <div class="brand">ANIMESICE VIDEO STUDIO</div>
    <div class="controls">
      <input id="search" type="search" placeholder="Buscar slug, id ou tag..." />
      <select id="catFilter">
        <option value="ALL">Todas categorias</option>
        <option value="GACHA">GACHA</option>
        <option value="UI">UI</option>
        <option value="PROMO">PROMO</option>
        <option value="SHOWCASE">SHOWCASE</option>
      </select>
      <button id="refreshBtn" type="button">Atualizar</button>
    </div>
  </header>
  <main>
    <aside id="list"></aside>
    <section class="viewer" id="viewer">
      <p style="color: var(--mist)">Carregando catálogo...</p>
    </section>
  </main>
<script>
const listEl = document.getElementById("list");
const viewerEl = document.getElementById("viewer");
const searchEl = document.getElementById("search");
const catEl = document.getElementById("catFilter");
const refreshBtn = document.getElementById("refreshBtn");

let catalog = { entries: [], duplicateIds: [] };
let selectedRel = null;
let selectedFileIdx = 0;

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

async function load() {
  const res = await fetch("/api/catalog");
  catalog = await res.json();
  if (!selectedRel && catalog.entries.length > 0) {
    selectedRel = catalog.entries[0].relDir;
  }
  renderList();
  renderViewer();
}

function filtered() {
  const q = searchEl.value.trim().toLowerCase();
  const cat = catEl.value;
  return catalog.entries.filter((e) => {
    if (cat !== "ALL" && e.category !== cat) return false;
    if (!q) return true;
    return [e.id, e.slug, e.title, e.collection, ...(e.tags || [])].some((v) => String(v).toLowerCase().includes(q));
  });
}

function renderList() {
  const items = filtered();
  if (items.length === 0) {
    listEl.innerHTML = '<p style="color: var(--mist); font-size: 13px;">Nenhum vídeo encontrado. Rode <code>npm run video:render</code>.</p>';
    return;
  }
  listEl.innerHTML = items.map((e) => {
    const active = e.relDir === selectedRel ? "active" : "";
    const status = e.audit?.ok ? '<span class="badge ok">OK</span>' : '<span class="badge err">ERR</span>';
    return '<button class="bundle-card ' + active + '" data-rel="' + esc(e.relDir) + '">' +
      '<div class="title">' + status + esc(e.title) + '</div>' +
      '<div class="meta">' + esc(e.category) + ' · ' + esc(e.collection) + '/' + esc(e.slug) + ' · ' + e.files.length + ' arquivo(s)</div>' +
      '</button>';
  }).join("");
  listEl.querySelectorAll(".bundle-card").forEach((btn) => {
    btn.addEventListener("click", () => {
      selectedRel = btn.getAttribute("data-rel");
      selectedFileIdx = 0;
      renderList();
      renderViewer();
    });
  });
}

function renderViewer() {
  const entry = catalog.entries.find((e) => e.relDir === selectedRel);
  let dupBanner = "";
  if (catalog.duplicateIds && catalog.duplicateIds.length > 0) {
    dupBanner = '<div class="banner-warn">IDs duplicados detectados: ' +
      catalog.duplicateIds.map((d) => esc(d.id) + " (" + d.locations.map(esc).join(", ") + ")").join("; ") +
      "</div>";
  }
  if (!entry) {
    viewerEl.innerHTML = dupBanner + '<p style="color: var(--mist)">Nenhum vídeo renderizado em output/. Rode <code>npm run video:render -- --slug gacha-crystal --variant comum --contact-sheet</code>.</p>';
    return;
  }
  const files = entry.files || [];
  const file = files[selectedFileIdx] || files[0];
  const pills = files.map((f, idx) =>
    '<button class="pill ' + (idx === selectedFileIdx ? "active" : "") + '" data-idx="' + idx + '">' + esc(f.variantKey || f.compositionId) + "</button>"
  ).join("");

  const videoHtml = file
    ? '<video controls autoplay loop muted playsinline poster="' + (file.posterRelPath ? "/files/" + esc(file.posterRelPath) : "") + '" src="/files/' + esc(file.videoRelPath) + '"></video>'
    : '<p style="color: var(--mist)">Sem arquivo de vídeo neste bundle.</p>';

  const sheetPath = (entry.previewRelPaths || []).find((p) => p.endsWith("contact-sheet.png"));
  const sheetHtml = sheetPath
    ? '<div class="stage-box"><strong>Contact Sheet</strong><img class="preview-img" src="/files/' + esc(sheetPath) + '" alt="Contact sheet" /></div>'
    : "";

  const metricsHtml = file
    ? JSON.stringify({
        compositionId: file.compositionId,
        resolution: (file.width || entry.width) + "x" + (file.height || entry.height),
        fps: file.fps || entry.fps,
        durationSec: file.durationSec || entry.durationSec,
        codec: file.codec,
        pixFmt: file.pixFmt,
        sizeKB: Number((file.byteLength / 1024).toFixed(1)),
        auditOk: file.auditOk,
      }, null, 2)
    : "{}";

  const jsxSnippet = file && entry.publishDir
    ? '<video src="/' + entry.publishDir + '/' + file.stem + '.mp4" poster="/' + entry.publishDir + '/' + file.stem + '.webp" autoPlay loop muted playsInline />'
    : 'npm run video:render -- --slug ' + entry.slug + ' --contact-sheet';

  viewerEl.innerHTML = dupBanner +
    '<div><h2 style="margin:0">' + esc(entry.title) + '</h2><p style="color:var(--mist); margin:6px 0 0">' + esc(entry.description) + '</p></div>' +
    '<div class="variant-pills">' + pills + '</div>' +
    '<div class="stage-box">' + videoHtml + '</div>' +
    sheetHtml +
    '<div><strong>Métricas & Auditoria</strong><pre>' + esc(metricsHtml) + '</pre></div>' +
    '<div><strong>Uso / Comando</strong><pre>' + esc(jsxSnippet) + '</pre></div>';

  viewerEl.querySelectorAll(".pill").forEach((btn) => {
    btn.addEventListener("click", () => {
      selectedFileIdx = Number(btn.getAttribute("data-idx") || "0");
      renderViewer();
    });
  });
}

searchEl.addEventListener("input", renderList);
catEl.addEventListener("change", renderList);
refreshBtn.addEventListener("click", load);
load();
</script>
</body>
</html>`;
}

export function startPreviewServer(opts?: { dir?: string; port?: number }): http.Server {
  const root = path.resolve(opts?.dir ?? DEFAULT_OUTPUT_ROOT);
  const port = opts?.port ?? 4174;

  const server = http.createServer((req, res) => {
    const rawPath = (req.url ?? "/").split("?")[0] ?? "/";
    let pathname = "/";
    try {
      pathname = decodeURIComponent(rawPath);
    } catch {
      res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Bad request");
      return;
    }

    if (pathname === "/" || pathname === "/index.html") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(renderStudioHtml());
      return;
    }

    if (pathname === "/api/catalog") {
      const catalog = rebuildCatalogIndex(root);
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify(catalog));
      return;
    }

    if (pathname.startsWith("/files/")) {
      const rel = pathname.slice("/files/".length);
      const target = path.resolve(root, rel);
      if (target !== root && !target.startsWith(root + path.sep)) {
        res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Forbidden");
        return;
      }
      if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Not found");
        return;
      }

      const ext = path.extname(target).toLowerCase();
      const mime = MIME_MAP[ext] ?? "application/octet-stream";
      const stat = fs.statSync(target);
      const total = stat.size;
      const range = req.headers.range;

      if (range) {
        const m = /^bytes=(\d*)-(\d*)$/.exec(range);
        if (!m) {
          res.writeHead(416, { "Content-Range": `bytes */${total}` });
          res.end();
          return;
        }
        const start = m[1] ? Number(m[1]) : 0;
        const end = m[2] ? Math.min(total - 1, Number(m[2])) : total - 1;
        if (start > end || start >= total) {
          res.writeHead(416, { "Content-Range": `bytes */${total}` });
          res.end();
          return;
        }
        res.writeHead(206, {
          "Content-Range": `bytes ${start}-${end}/${total}`,
          "Accept-Ranges": "bytes",
          "Content-Length": String(end - start + 1),
          "Content-Type": mime,
        });
        fs.createReadStream(target, { start, end }).pipe(res);
        return;
      }

      res.writeHead(200, {
        "Content-Length": String(total),
        "Accept-Ranges": "bytes",
        "Content-Type": mime,
      });
      fs.createReadStream(target).pipe(res);
      return;
    }

    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
  });

  server.listen(port, "127.0.0.1");
  return server;
}
