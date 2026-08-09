"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { AnimeCard } from "@/components/common/AnimeCard";
import type { Anime } from "@/types";

export function RecommendationsRail() {
  const { user, loading } = useAuth();
  const [recommendations, setRecommendations] = useState<Anime[]>([]);
  const [becauseYouWatched, setBecauseYouWatched] = useState<Anime[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user || loaded) return;
    Promise.all([
      api.getRecommendations(18).catch(() => []),
      api.getBecauseYouWatched(12).catch(() => []),
    ]).then(([recs, byw]) => {
      setRecommendations(Array.isArray(recs) ? recs : []);
      setBecauseYouWatched(Array.isArray(byw) ? byw : []);
      setLoaded(true);
    });
  }, [user, loaded]);

  if (loading || !user) return null;
  if (!loaded) return null;
  if (recommendations.length === 0 && becauseYouWatched.length === 0) return null;

  return (
    <>
      {becauseYouWatched.length > 0 && (
        <section className="mb-8" aria-label="Porque você assistiu">
          <h2 className="shelf-label">
            Porque você assistiu{" "}
            <span className="shelf-label-data">{becauseYouWatched.length}</span>
          </h2>
          <div className="-mx-4 overflow-x-auto px-4 pb-2 [scrollbar-width:thin]">
            <div className="flex gap-3 snap-x">
              {becauseYouWatched.map((anime) => (
                <div key={`byw-${anime.id}`} className="w-[140px] shrink-0 snap-start">
                  <AnimeCard anime={anime} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {recommendations.length > 0 && (
        <section className="mb-8" aria-label="Recomendações para você">
          <h2 className="shelf-label">
            Para você{" "}
            <span className="shelf-label-data">{recommendations.length}</span>
          </h2>
          <div className="-mx-4 overflow-x-auto px-4 pb-2 [scrollbar-width:thin]">
            <div className="flex gap-3 snap-x">
              {recommendations.map((anime) => (
                <div key={`rec-${anime.id}`} className="w-[140px] shrink-0 snap-start">
                  <AnimeCard anime={anime} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
