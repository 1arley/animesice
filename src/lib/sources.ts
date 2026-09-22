/**
 * Fontes de scrape entendidas pelo backend em /embed/scrape?source=.
 * Vocabulário de domínio: vive aqui, não dentro de uma página admin.
 */
export type Source = "auto" | "animesonlinecc" | "meusanimes";

export const SCRAPE_SOURCES: { value: Source; label: string }[] = [
  { value: "auto", label: "Auto-detectar" },
  { value: "animesonlinecc", label: "animesonlinecc.to" },
  { value: "meusanimes", label: "meusanimes.blog" },
];
