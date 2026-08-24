import { HomeHero } from "@/components/common/HomeHero";
import type { Anime } from "@/types";

type HeroProps = { animes: Anime[] };

/**
 * Mantém o mesmo hero no HTML inicial e na hidratação. A versão anterior
 * renderizava um layout estático com copy diferente e o substituía pelo
 * carrossel assim que o chunk carregava, causando layout shift e flicker.
 */
export function DeferredHomeHero({ animes }: HeroProps) {
  return animes.length > 0 ? <HomeHero animes={animes} /> : null;
}
