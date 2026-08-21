export const CHUNK_ERROR_EVENT = "animesice:chunk-error";
export const CHUNK_RECOVERY_EXHAUSTED_EVENT =
  "animesice:chunk-recovery-exhausted";

declare global {
  interface Window {
    __ANIMESICE_CHUNK_RECOVERY_EXHAUSTED__?: boolean;
  }
}

export function isChunkRecoveryExhausted(): boolean {
  return (
    typeof window !== "undefined" &&
    window.__ANIMESICE_CHUNK_RECOVERY_EXHAUSTED__ === true
  );
}

export function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const message = error.message.toLowerCase();
  return (
    message.includes("loading chunk") ||
    message.includes("loading css chunk") ||
    message.includes("failed to fetch dynamically imported module") ||
    message.includes("importing a module script failed") ||
    error.name === "ChunkLoadError" ||
    error.name === "LoadingChunkError"
  );
}

export function retryChunkLoad(): void {
  sessionStorage.removeItem("animesice:chunk-recovery");
  const url = new URL(window.location.href);
  url.searchParams.set("__chunk_retry", String(Date.now()));
  window.location.replace(url.href);
}
