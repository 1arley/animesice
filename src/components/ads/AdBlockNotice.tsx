"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * AdBlockNotice — soft wall: avisa quando um bloqueador de anúncios está
 * ativo, mas NUNCA bloqueia o acesso.
 *
 * Comportamento:
 *   - Detecta adblock por EVIDÊNCIA DUPLA: a sonda de rede (imagem em domínio
 *     de anúncio) E o script do AdSense precisam falhar juntos para mostrar o
 *     aviso. Qualquer sinal positivo — sonda carregou, script do AdSense
 *     executou ou um slot foi processado — significa "sem bloqueio" e encerra
 *     a detecção. A sonda sozinha nunca acusa: falha dela também cobre
 *     navegadores com proteção de rastreamento (Firefox estrito, Safari ITP,
 *     Brave Shields) e falhas de rede/região — nenhum desses é adblock.
 *   - Mostra um banner fixo na base, não-interativo no restante da página
 *     (sem overlay, sem travar scroll) — o usuário continua usando o site
 *     normalmente.
 *   - Duas saídas, ambas mantêm o site utilizável:
 *       · "Continuar mesmo assim" → dispensa por 30 dias (localStorage).
 *       · "Como desativar" → expande instruções em linha.
 *   - Preferência lembrada: só volta a aparecer após 30 dias OU se o
 *     bloqueador for removido (o aviso some em tempo real).
 *
 * Sem scripts de terceiros além do probe: a sonda usa apenas um `<img>`
 * para o gen_204 do AdSense (mesmo domínio já usado pelo site). O script do
 * AdSense não é carregado aqui — apenas observado, se o site o tiver.
 */

const STORAGE_KEY = "animesice:adblock-notice";
const REMIND_AFTER_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias
const POLL_MS = 200;
const DECISION_TIMEOUT_MS = 10000;
const PROBE_URL = "https://pagead2.googlesyndication.com/pagead/gen_204";
const ADSENSE_SCRIPT_SELECTOR = 'script[src*="adsbygoogle.js"]';

interface StoredNotice {
  dismissedAt: number;
}

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

function readStored(): StoredNotice | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredNotice;
    if (typeof parsed.dismissedAt !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeStored(dismissedAt: number) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ dismissedAt }));
  } catch {
    /* storage indisponível (modo privado, quota) — segue sem lembrar. */
  }
}

/**
 * Detecta se há adblocker ativo.
 *
 * Conservador contra falsos positivos: NUNCA acusa com base na sonda sozinha.
 * O aviso só é confirmado quando duas evidências independentes falham:
 *   1. a sonda de rede (`gen_204` do AdSense) é barrada; E
 *   2. o script do AdSense (`adsbygoogle.js`) é barrado pela rede.
 *
 * Qualquer sinal positivo encerra a detecção como "sem bloqueio":
 *   - a sonda carrega;
 *   - o script do AdSense executa (`window.adsbygoogle` vira array);
 *   - um slot já foi processado (`data-adsbygoogle-status="done"`).
 *
 * Isso elimina os falsos positivos antigos: falha transitória de rede, DNS,
 * proteção de rastreamento do navegador (Firefox estrito, Safari ITP, Brave
 * Shields) e a corrida com o script lazyOnload — nada disso mostra o aviso.
 * O custo é um possível falso negativo (adblock exótico que só bloqueia os
 * iframes de anúncio) — aceitável: melhor não avisar do que acusar errado.
 */
function detectAdBlock(): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;
    let probeFailed = false;
    let scriptBlocked = false;
    let scriptSeen = false;

    const timers: number[] = [];
    let pollId: number | null = null;
    let observer: MutationObserver | null = null;
    let probe: HTMLImageElement | null = null;

    const teardown = () => {
      if (pollId !== null) window.clearInterval(pollId);
      for (const id of timers) window.clearTimeout(id);
      observer?.disconnect();
      probe?.remove();
    };

    const finish = (blocked: boolean) => {
      if (settled) return;
      settled = true;
      teardown();
      resolve(blocked);
    };

    const confirmBlocked = () => {
      if (probeFailed && scriptBlocked) finish(true);
    };

    // Sonda de rede: falha é um SINAL, não a decisão.
    probe = document.createElement("img");
    probe.addEventListener("load", () => finish(false), { once: true });
    probe.addEventListener(
      "error",
      () => {
        probeFailed = true;
        confirmBlocked();
      },
      { once: true },
    );
    probe.src = PROBE_URL;
    probe.style.cssText =
      "width:1px;height:1px;position:absolute;left:-9999px;top:-9999px;visibility:hidden";
    document.body.appendChild(probe);

    // Poling: script do AdSense executou ou slot foi processado =>
    // definitivamente não-bloqueado.
    const poll = () => {
      if (Array.isArray(window.adsbygoogle)) return finish(false);
      if (document.querySelector('ins.adsbygoogle[data-adsbygoogle-status="done"]')) {
        return finish(false);
      }
    };
    pollId = window.setInterval(poll, POLL_MS);

    // Observa o <script> do AdSense: se o arquivo for barrado (adblock), o
    // elemento dispara `error` — segunda evidência de bloqueio.
    const observeScript = () => {
      if (scriptSeen) return;
      const script: HTMLScriptElement | null = document.querySelector(
        ADSENSE_SCRIPT_SELECTOR,
      );
      if (!script) return;
      scriptSeen = true;
      script.addEventListener(
        "error",
        () => {
          scriptBlocked = true;
          confirmBlocked();
        },
        { once: true },
      );
    };
    observeScript();
    observer = new MutationObserver(observeScript);
    observer.observe(document.body, { childList: true, subtree: true });

    // Decisão de segurança: caso nada tenha se definido até aqui, só acusa
    // com as DUAS evidências. Em aberto = não-bloqueado.
    timers.push(
      window.setTimeout(() => finish(probeFailed && scriptBlocked), DECISION_TIMEOUT_MS),
    );
  });
}

export function AdBlockNotice() {
  const [blocked, setBlocked] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const stored = readStored();
    if (stored && Date.now() - stored.dismissedAt < REMIND_AFTER_MS) return;

    let cancelled = false;
    detectAdBlock().then((isBlocked) => {
      if (!cancelled) setBlocked(isBlocked);
    });
    return () => {
      cancelled = true;
    };
  }, [mounted]);

  const dismiss = useCallback(() => {
    writeStored(Date.now());
    setBlocked(false);
    setShowHelp(false);
  }, []);

  if (!mounted || !blocked) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 bottom-14 z-40 border-t border-hairline bg-panel px-4 pt-3 safe-bottom sm:bottom-0"
    >
      <div className="mx-auto flex max-w-shelf flex-wrap items-center gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1">
          <p className="font-display text-body-sm font-medium uppercase tracking-wider text-ice">
            Você está bloqueando os anúncios
          </p>
          <p className="mt-0.5 text-body-sm text-mist">
            O AnimesIce é gratuito e se mantém pelos anúncios. Sem eles, o
            sinal enfraquece. Você pode continuar navegando normalmente — só
            pedimos que considere liberar o site.
          </p>

          {showHelp && (
            <div className="mt-2 border-l-2 border-ice/40 pl-3 text-caption text-mist">
              <p className="mb-1 font-medium text-snow">Como liberar o site:</p>
              <ul className="list-inside list-disc space-y-0.5">
                <li>
                  <strong className="text-snow">uBlock Origin</strong> — ícone
                  na barra → desative para este site.
                </li>
                <li>
                  <strong className="text-snow">AdBlock</strong> — ícone →
                  &quot;Não executar nesta página&quot;.
                </li>
                <li>
                  <strong className="text-snow">AdGuard / Brave</strong> —{" "}
                  pause a proteção para animesice.io.
                </li>
              </ul>
              <p className="mt-1">
                Depois é só atualizar a página — o aviso some sozinho.
              </p>
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setShowHelp((v) => !v)}
            className="btn-ghost text-caption"
          >
            {showHelp ? "Ocultar instruções" : "Como desativar"}
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="border border-hairline bg-slate px-3 py-1.5 font-mono text-caption font-medium uppercase tracking-wider text-snow transition-colors hover:border-ice hover:text-ice"
          >
            Continuar mesmo assim
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdBlockNotice;
