"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * AdBlockNotice — soft wall: avisa quando um bloqueador de anúncios está
 * ativo, mas NUNCA bloqueia o acesso.
 *
 * Comportamento:
 *   - Detecta adblock via sonda de rede (imagem em domínio de anúncio) e
 *     presença do script do AdSense. Se o probe falhar, assume bloqueio.
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
 * para o gen_204 do AdSense (mesmo domínio já usado pelo site).
 */

const STORAGE_KEY = "animesice:adblock-notice";
const REMIND_AFTER_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias
const PROBE_TIMEOUT_MS = 4000;
const ADSENSE_SCRIPT_TIMEOUT_MS = 3500;

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
 * Estratégia conservadora contra falsos positivos: só confirma bloqueio
 * quando o probe de rede falha (requisição ao domínio do AdSense é barrada).
 * Se o probe carrega OU o script do AdSense executou, considera sem adblock.
 * Timeout cobre o caso de rede lenta → assume sem bloqueio (falso negativo
 * é aceitável; falso positivo não).
 */
function detectAdBlock(): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (detected: boolean) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      window.clearInterval(scriptTick);
      resolve(detected);
    };

    // Sonda de rede: 1x1 gif do AdSense. Adblockers barram pagead2.
    const probe = document.createElement("img");
    probe.src = "https://pagead2.googlesyndication.com/pagead/gen_204";
    probe.style.cssText =
      "width:1px;height:1px;position:absolute;left:-9999px;top:-9999px;visibility:hidden";
    probe.onload = () => finish(false);
    probe.onerror = () => finish(true);
    document.body.appendChild(probe);

    // Sinal secundário: script do AdSense já executou = não-bloqueado.
    const scriptTick = window.setInterval(() => {
      if (Array.isArray(window.adsbygoogle)) finish(false);
    }, 250);
    window.setTimeout(() => window.clearInterval(scriptTick), ADSENSE_SCRIPT_TIMEOUT_MS);

    // Timeout cobre rede lenta — assume sem bloqueio (falso negativo ok).
    const timeout = window.setTimeout(() => finish(false), PROBE_TIMEOUT_MS);
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
      className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-panel/95 px-4 py-3 backdrop-blur-sm"
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
