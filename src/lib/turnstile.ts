/**
 * Loader do Turnstile (Cloudflare CAPTCHA).
 * Compartilhado entre login e register — fonte única para injetar o script
 * e tipar a API global (sem `any` espalhado nas páginas de auth).
 */

export const TURNSTILE_SITEKEY =
  process.env.NEXT_PUBLIC_TURNSTILE_SITEKEY || "0x4AAAAAAEJ2yW0QjDiK6Rmj";

/** Shape mínimo da API global do Turnstile usada pelo app. */
export interface TurnstileRenderer {
  render: (
    container: HTMLElement,
    opts: {
      sitekey: string;
      action?: string;
      callback?: (token: string) => void;
      "expired-callback"?: () => void;
    },
  ) => string;
  ready: (cb: () => void) => void;
  reset: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileRenderer;
    onTurnstileLoad?: () => void;
  }
}

export function loadTurnstile(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || window.turnstile) {
      resolve();
      return;
    }
    const id = "turnstile-api";
    if (document.getElementById(id)) {
      const interval = setInterval(() => {
        if (window.turnstile) {
          clearInterval(interval);
          resolve();
        }
      }, 50);
      return;
    }
    const script = document.createElement("script");
    script.id = id;
    script.src =
      "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad";
    script.async = false;
    window.onTurnstileLoad = () => resolve();
    script.onerror = () => reject(new Error("Falha ao carregar o captcha."));
    document.head.appendChild(script);
  });
}