"use client";

import Link from "next/link";
import { useCallback, type ComponentProps } from "react";
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
 */
export function PrefetchEpisodeLink({
  animeSlug,
  episodeNumber,
  onMouseEnter,
  ...props
}: Props) {
  const handleHover = useCallback<React.MouseEventHandler<HTMLAnchorElement>>(
    (e) => {
      // Fire-and-forget — não bloqueia a navegação
      const cached = api._sourceCache.get(animeSlug, episodeNumber);
      if (!cached) {
        api.streamSourceAsync(animeSlug, episodeNumber).catch(() => {});
      }
      onMouseEnter?.(e);
    },
    [animeSlug, episodeNumber, onMouseEnter],
  );

  return <Link onMouseEnter={handleHover} {...props} />;
}
