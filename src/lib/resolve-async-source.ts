import { api, type StreamSource } from "@/lib/api";

const MAX_POLL_ATTEMPTS = 20;
const SSE_FAST_TIMEOUT_MS = 2_000;
const POLL_INTERVAL_BASE = 300;
const POLL_BACKOFF = 1.25;
const POLL_MAX_INTERVAL = 5_000;

export type AsyncSourceResult =
  | { type: "source"; source: StreamSource }
  | { type: "failed"; error: string }
  | { type: "exhausted" };

/**
 * Resolve an async extraction job via SSE (fast path) + polling (fallback).
 *
 * Shared by WatchClient and RoomPage — single source of truth for the
 * SSE-first-then-poll pattern with exponential backoff.
 *
 * Aborts cleanly when `signal` is triggered (component unmount / navigation).
 */
export async function resolveAsyncSource(
  slug: string,
  episodeNumber: number,
  jobId: string,
  signal?: AbortSignal,
): Promise<AsyncSourceResult> {
  if (signal?.aborted) return { type: "exhausted" };

  // --- SSE fast path ---
  let sseResolved = false;
  // Mutable container avoids TypeScript narrowing cleanupSSE to `never`
  // after the Promise constructor (which assigns it synchronously).
  const cleanup = { sse: null as (() => void) | null };

  const ssePromise = new Promise<"source" | "failed" | "timeout">((resolve) => {
    cleanup.sse = api.streamSourceSSE(slug, episodeNumber, {
      onSource: () => {
        if (sseResolved || signal?.aborted) return;
        sseResolved = true;
        resolve("source");
      },
      onFailed: () => {
        if (sseResolved || signal?.aborted) return;
        sseResolved = true;
        resolve("failed");
      },
      onTimeout: () => {
        if (!sseResolved) resolve("timeout");
      },
      onError: () => {
        if (!sseResolved) resolve("timeout");
      },
    });
  });

  const sseRace = await Promise.race([
    ssePromise,
    new Promise<"timeout">((r) => {
      const timer = setTimeout(() => r("timeout"), SSE_FAST_TIMEOUT_MS);
      signal?.addEventListener("abort", () => {
        clearTimeout(timer);
        r("timeout");
      }, { once: true });
    }),
  ]);

  if (sseRace === "source") {
    cleanup.sse?.();
    const source = await api.streamSource(slug, episodeNumber);
    return { type: "source", source };
  }
  if (sseRace === "failed") {
    cleanup.sse?.();
    return { type: "failed", error: "Extracao falhou. Tente novamente." };
  }

  // SSE didn't resolve fast — fall through to polling
  if (signal?.aborted) {
    cleanup.sse?.();
    return { type: "exhausted" };
  }

  // --- Polling fallback with exponential backoff ---
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    if (signal?.aborted) {
      cleanup.sse?.();
      return { type: "exhausted" };
    }

    const delay = Math.min(
      POLL_INTERVAL_BASE * Math.pow(POLL_BACKOFF, attempt),
      POLL_MAX_INTERVAL,
    );
    await new Promise<void>((r) => {
      const timer = setTimeout(r, delay);
      signal?.addEventListener("abort", () => {
        clearTimeout(timer);
        r();
      }, { once: true });
    });

    if (signal?.aborted) {
      cleanup.sse?.();
      return { type: "exhausted" };
    }

    try {
      const poll = await api.pollExtractionJob(slug, episodeNumber, jobId);

      if ("src" in poll) {
        cleanup.sse?.();
        return { type: "source", source: poll as StreamSource };
      }

      if ("status" in poll) {
        const st = poll as { status: string; error?: string };
        if (st.status === "failed") {
          cleanup.sse?.();
          return {
            type: "failed",
            error: st.error ?? "Extracao falhou. Tente novamente.",
          };
        }
        if (st.status === "completed") {
          cleanup.sse?.();
          const source = await api.streamSource(slug, episodeNumber);
          return { type: "source", source };
        }
      }
    } catch {
      // Network error — continue polling
    }
  }

  cleanup.sse?.();
  return { type: "exhausted" };
}
