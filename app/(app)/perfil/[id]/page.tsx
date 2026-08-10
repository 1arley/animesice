"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { PublicUserProfile } from "@/types";

export default function PublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    params.then(({ id }) => api.getPublicProfile(id).then(setProfile).catch(() => setError(true)));
  }, [params]);

  if (error) return <div className="mx-auto max-w-shelf px-4 py-8 text-mist">Perfil não encontrado.</div>;
  if (!profile) return <div className="mx-auto max-w-shelf px-4 py-8 text-mist">Carregando...</div>;

  return (
    <div className="mx-auto max-w-shelf px-4 py-8">
      <section className="max-w-2xl border border-hairline bg-panel p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden bg-hairline font-mono text-display-lg text-mist">
            {profile.avatar ? <img src={profile.avatar} alt="" className="h-full w-full object-cover" /> : (profile.userName ?? profile.name ?? "?")[0]?.toUpperCase()}
          </div>
          <div>
            <h1 className="font-display text-display-lg text-ice">{profile.userName ?? profile.name ?? "Usuário"}</h1>
            {profile.userName && profile.name && (
              <p className="text-body-sm text-mist">{profile.name}</p>
            )}
            <p className="text-body-sm text-mist">Membro desde {new Date(profile.createdAt).toLocaleDateString("pt-BR")}</p>
          </div>
        </div>
        {profile.bio && <p className="mt-5 whitespace-pre-line text-body text-mist">{profile.bio}</p>}
        <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-hairline pt-4 sm:grid-cols-4">
          <Stat label="Comentários" value={profile._count.comments} />
          <Stat label="Avaliações" value={profile._count.ratings} />
          <Stat label="Favoritos" value={profile._count.favorites} />
          <Stat label="Episódios" value={profile._count.watchHistories} />
        </dl>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div><dt className="font-mono text-caption uppercase text-mist">{label}</dt><dd className="font-display text-body font-semibold text-ice">{value}</dd></div>;
}
