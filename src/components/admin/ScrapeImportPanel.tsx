"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import { SCRAPE_SOURCES, type Source } from "@/lib/sources";
import { FieldLabel, Hint } from "@/components/admin/Field";

interface ScrapeImportPanelProps {
  onUseVideo: (url: string) => void;
  onUseIframe: (url: string) => void;
}

/** Importar de outra fonte — scrape + proxy. */
export function ScrapeImportPanel({ onUseVideo, onUseIframe }: ScrapeImportPanelProps) {
  const [source, setSource] = useState<Source>("auto");
  const [sourceUrl, setSourceUrl] = useState("");
  const [scraping, setScraping] = useState(false);
  const [scrapeError, setScrapeError] = useState<string | null>(null);
  const [scrapeVideos, setScrapeVideos] = useState<string[]>([]);
  const [scrapeIframes, setScrapeIframes] = useState<string[]>([]);

  async function scrapeSource(e: React.FormEvent) {
    e.preventDefault();
    if (!sourceUrl) return;
    setScraping(true);
    setScrapeError(null);
    setScrapeVideos([]);
    setScrapeIframes([]);
    try {
      const res = await api.embedScrape(sourceUrl, source === "auto" ? undefined : source);
      setScrapeVideos(res.videos ?? []);
      setScrapeIframes(res.iframes ?? []);
      if (!((res.videos ?? []).length || (res.iframes ?? []).length)) {
        setScrapeError("Nenhum vídeo encontrado nessa URL.");
      }
    } catch (err) {
      setScrapeError(err instanceof ApiError ? err.message : "Erro ao extrair vídeos.");
    } finally {
      setScraping(false);
    }
  }

  function gerarEmbedProxy() {
    if (!sourceUrl) return;
    onUseIframe(api.embedProxyUrl(sourceUrl));
  }

  return (
    <fieldset className="border border-hairline p-4">
      <legend className="px-1 font-sans text-caption uppercase tracking-wider text-mist">
        Importar de outra fonte
      </legend>

      <label className="block">
        <FieldLabel>Fonte</FieldLabel>
        <select
          className="field"
          value={source}
          onChange={(e) => setSource(e.target.value as Source)}
        >
          {SCRAPE_SOURCES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <Hint>
          <strong className="text-mist">Scrape</strong> extrai .mp4/.m3u8
          direto da página (token vinculado ao IP do servidor — funciona
          local). <strong className="text-mist">Embed URL</strong> gera um
          iframe via proxy interno do backend (sem XFO), funciona p/ qualquer site.
        </Hint>
      </label>

      <label className="mt-3 block">
        <FieldLabel>URL do episódio</FieldLabel>
        <input
          className="field"
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
          placeholder="https://animefire.net/...  /  https://animesonlinecc.to/...  /  ..."
        />
      </label>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={scrapeSource}
          disabled={scraping || !sourceUrl}
          className="btn-ice"
        >
          {scraping ? "Extraindo..." : "Extrair vídeo"}
        </button>
        <button
          type="button"
          onClick={gerarEmbedProxy}
          disabled={!sourceUrl}
          className="btn-ghost"
        >
          Gerar embed URL (iframe)
        </button>
      </div>

      {scrapeError && (
        <p className="mt-3 border border-signal/40 bg-signal/10 p-2 text-caption text-signal">
          {scrapeError}
        </p>
      )}

      {scrapeVideos.length > 0 && (
        <div className="mt-3">
          <span className="font-display text-caption uppercase tracking-wider text-mist">
            Vídeos .mp4 encontrados
          </span>
          <ul className="mt-1.5 space-y-1">
            {scrapeVideos.map((v, i) => (
              <li key={i} className="break-all">
                <a
                  href="#"
                  className="text-ice transition-colors hover:opacity-70"
                  onClick={(e) => {
                    e.preventDefault();
                    onUseVideo(v);
                  }}
                >
                  usar esta URL
                </a>{" "}
                <code className="text-caption text-mist">{v}</code>
              </li>
            ))}
          </ul>
          <button type="button" className="btn-ghost mt-2" onClick={() => onUseVideo(scrapeVideos[0])}>
            Usar primeira URL
          </button>
        </div>
      )}

      {scrapeIframes.length > 0 && (
        <div className="mt-3">
          <span className="font-display text-caption uppercase tracking-wider text-mist">
            Iframes encontrados
          </span>
          <ul className="mt-1.5 space-y-1">
            {scrapeIframes.map((v, i) => (
              <li key={i} className="break-all">
                <a
                  href="#"
                  className="text-ice transition-colors hover:opacity-70"
                  onClick={(e) => {
                    e.preventDefault();
                    onUseIframe(v);
                  }}
                >
                  usar este iframe
                </a>{" "}
                <code className="text-caption text-mist">{v}</code>
              </li>
            ))}
          </ul>
        </div>
      )}
    </fieldset>
  );
}
