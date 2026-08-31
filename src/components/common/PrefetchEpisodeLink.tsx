"use client";

import Link from "next/link";
import { useCallback, useRef, type ComponentProps } from "react";
import { api } from "@/lib/api";

type Props = ComponentProps<typeof Link> & {
  animeSlug: string;
  episodeNumber: number;
};

/**
 * Link que dispara extração assíncrona do episódio no hover,
 * aquecendo o pipeline de vídeo antes do usuário navegar.
 * Cacheia o resultado em sessionStorage — se o usuário já visitou
 * o episódio, o próximo acesso é instantâneo.
 *
 * O Set de dedup é component-scoped (useRef) para não crescer
 * infinitamente durante sessões longas — ao navegar fora e voltar,
 * o hover funciona novamente.
 */
export function PrefetchEpisodeLink({
  animeSlug,
  episodeNumber,
  onMouseEnter,
  ...props
}: Props) {
  const prefetched = useRef(new Set<string>());

  const handleHover = useCallback<React.MouseEventHandler<HTMLAnchorElement>>(
    (e) => {
      const key = `${animeSlug}:${episodeNumber}`;
      if (!prefetched.current.has(key)) {
        prefetched.current.add(key);
        const cached = api._sourceCache.get(animeSlug, episodeNumber);
        if (!cached) {
          api.streamSourceAsync(animeSlug, episodeNumber).catch(() => {});
        }
      }
      onMouseEnter?.(e);
    },
    [animeSlug, episodeNumber, onMouseEnter],
  );

  return <Link onMouseEnter={handleHover} {...props} />;
}
