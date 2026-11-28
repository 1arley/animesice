import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

export type PlaywrightBrowser = {
  newPage: (opts?: {
    viewport?: { width: number; height: number };
    deviceScaleFactor?: number;
    reducedMotion?: "reduce" | "no-preference";
  }) => Promise<PlaywrightPage>;
  close: () => Promise<void>;
};

export type PlaywrightPage = {
  setContent: (html: string, opts?: { waitUntil?: "load" | "domcontentloaded" | "networkidle" }) => Promise<void>;
  goto: (url: string, opts?: { waitUntil?: "load" | "domcontentloaded" | "networkidle" }) => Promise<void>;
  emulateMedia: (params: { reducedMotion?: "reduce" | "no-preference" | null }) => Promise<void>;
  waitForFunction: (fn: string | (() => unknown), arg?: unknown, opts?: { timeout?: number }) => Promise<unknown>;
  evaluate: <T, A = unknown>(fn: (arg: A) => T | Promise<T>, arg?: A) => Promise<T>;
  screenshot: (opts?: { path?: string; type?: "png" | "jpeg"; omitBackground?: boolean; fullPage?: boolean }) => Promise<Buffer>;
  on: (event: string, listener: (...args: unknown[]) => void) => void;
  close: () => Promise<void>;
};

type ChromiumLauncher = {
  executablePath?: () => string;
  launch: (opts?: Record<string, unknown>) => Promise<PlaywrightBrowser>;
};

function resolveChromium(): ChromiumLauncher {
  const candidates = [
    new URL("../../package.json", import.meta.url),
    new URL("../../../package.json", import.meta.url),
    new URL("../../../../animesice-back/package.json", import.meta.url),
  ];

  for (const pkgUrl of candidates) {
    if (!fs.existsSync(pkgUrl)) continue;
    const req = createRequire(pkgUrl);
    for (const modName of ["@playwright/test", "playwright", "playwright-core"]) {
      try {
        const mod = req(modName) as { chromium?: ChromiumLauncher };
        if (mod.chromium) return mod.chromium;
      } catch {
        // try next candidate
      }
    }
  }
  throw new Error(
    "Playwright Chromium not found. Install playwright in tools/ or keep ../node_modules/@playwright/test available.",
  );
}

export async function withChromiumPage<T>(
  fn: (page: PlaywrightPage) => Promise<T>,
  opts?: { width?: number; height?: number; scale?: number; reducedMotion?: boolean },
): Promise<T> {
  const chromium = resolveChromium();
  const pwExec = chromium.executablePath?.();
  const sysExec = fs.existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined;
  const executablePath = pwExec && fs.existsSync(pwExec) ? pwExec : sysExec;

  const browser = await chromium.launch({
    ...(executablePath ? { executablePath } : {}),
    args: [
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--enable-webgl",
      "--ignore-gpu-blocklist",
    ],
  });

  try {
    const page = await browser.newPage({
      viewport: { width: opts?.width ?? 900, height: opts?.height ?? 1200 },
      deviceScaleFactor: opts?.scale ?? 1,
      ...(opts?.reducedMotion ? { reducedMotion: "reduce" } : {}),
    });
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(String(err)));
    const result = await fn(page);
    if (errors.length > 0) {
      throw new Error(`Chromium page errors: ${errors.join("; ")}`);
    }
    return result;
  } finally {
    await browser.close();
  }
}

export function resolveSiblingPixiModule(): string | null {
  const baseDir = path.dirname(new URL(import.meta.url).pathname);
  const candidates = [
    path.resolve(baseDir, "../../../node_modules/pixi.js/dist/pixi.min.mjs"),
    path.resolve(baseDir, "../../../../animesice/node_modules/pixi.js/dist/pixi.min.mjs"),
  ];
  return candidates.find((p) => fs.existsSync(p)) ?? null;
}
