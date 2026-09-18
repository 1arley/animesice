"use client";

import { FormEvent, useState } from "react";
import { api, ApiError } from "@/lib/api";

export default function ExternalWorksPage() {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [workId, setWorkId] = useState<string | null>(null);
  const [characterName, setCharacterName] = useState("");
  const [characterImage, setCharacterImage] = useState("");
  const [rarity, setRarity] = useState("COMUM");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    try {
      const work = await api.adminCreateExternalAnime(url, title || undefined, coverImage || undefined);
      setMessage(`Obra criada: ${work.title}. Agora use essa obra ao criar personagem.`);
      setWorkId(work.id);
      setUrl("");
      setTitle("");
      setCoverImage("");
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Não foi possível criar a obra.");
    }
  }

  async function submitCharacter(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    try {
      const card = await api.adminCreateGachaCard({
        name: characterName,
        image: characterImage,
        rarity,
        animeId: workId as string,
      });
      setMessage(`Personagem criado: ${card.name}. Ele ficou como rascunho para publicação.`);
      setCharacterName("");
      setCharacterImage("");
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Não foi possível criar o personagem.");
    }
  }

  return (
    <div>
      <h1 className="font-display text-display-xl text-snow">Obra externa</h1>
      <p className="mt-2 text-body-sm text-mist">Cadastre mangá do MAL ou AniList sem publicar obra no catálogo.</p>
      <form onSubmit={submit} className="admin-card mt-6 max-w-2xl space-y-4 p-5">
        <label className="block text-body-sm text-mist">Link da obra
          <input required type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://myanimelist.net/manga/123" className="admin-input mt-1 w-full" />
        </label>
        <label className="block text-body-sm text-mist">Título manual (fallback)
          <input value={title} onChange={(event) => setTitle(event.target.value)} className="admin-input mt-1 w-full" />
        </label>
        <label className="block text-body-sm text-mist">Imagem manual (fallback)
          <input type="url" value={coverImage} onChange={(event) => setCoverImage(event.target.value)} className="admin-input mt-1 w-full" />
        </label>
        <button className="admin-button" type="submit">Criar referência</button>
        {message && <p className="text-body-sm text-ice">{message}</p>}
        {error && <p className="text-body-sm text-signal">{error}</p>}
      </form>
      {workId && (
        <form onSubmit={submitCharacter} className="admin-card mt-6 max-w-2xl space-y-4 p-5">
          <h2 className="font-display text-display-lg text-snow">Criar personagem</h2>
          <label className="block text-body-sm text-mist">Nome
            <input required value={characterName} onChange={(event) => setCharacterName(event.target.value)} className="admin-input mt-1 w-full" />
          </label>
          <label className="block text-body-sm text-mist">Imagem HTTPS
            <input required type="url" value={characterImage} onChange={(event) => setCharacterImage(event.target.value)} className="admin-input mt-1 w-full" />
          </label>
          <label className="block text-body-sm text-mist">Raridade
            <select value={rarity} onChange={(event) => setRarity(event.target.value)} className="admin-input mt-1 w-full">
              {['COMUM', 'INCOMUM', 'RARA', 'EPICA', 'LENDARIA', 'MITICA', 'GALACTICA'].map((tier) => <option key={tier}>{tier}</option>)}
            </select>
          </label>
          <button className="admin-button" type="submit">Criar personagem</button>
        </form>
      )}
    </div>
  );
}
