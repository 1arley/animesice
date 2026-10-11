export const PAGINATION_CLASSES = {
  nav: "mt-8 flex flex-wrap items-center justify-center gap-1.5",
  arrow:
    "flex h-11 min-w-11 items-center justify-center border border-hairline bg-panel px-3 font-mono text-body-sm text-snow transition-colors hover:bg-ink/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ice/70",
  page:
    "flex h-11 min-w-11 items-center justify-center border px-3 font-mono text-body-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ice/70",
  currentPage:
    "border-ice/70 bg-ice/10 text-snow shadow-[inset_0_-2px_0_rgba(56,189,248,0.8)]",
  otherPage: "border-hairline bg-panel text-mist hover:bg-ink/60 hover:text-snow",
  ellipsis:
    "flex h-11 w-8 select-none items-center justify-center font-mono text-body-sm text-mist",
} as const;
