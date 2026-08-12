"use client";

import { useEffect, useState, useRef } from "react";
import { api, ApiError, isProxyEmbed, type RoomInfo, type RoomMessageItem, type StreamSource } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Episode, Anime } from "@/types";
import { VideoPlayer } from "@/components/common/VideoPlayer";
import { EpisodeLoadingState } from "@/components/common/EpisodeLoadingState";
import { io, Socket } from "socket.io-client";

export default function RoomPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { user } = useAuth();
  const [slug, setSlug] = useState("");
  const [room, setRoom] = useState<RoomInfo | null>(null);
  const [episode, setEpisode] = useState<(Episode & { anime: Anime }) | null>(null);
  const [source, setSource] = useState<StreamSource | null>(null);
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [loadingSource, setLoadingSource] = useState(false);
  const [messages, setMessages] = useState<RoomMessageItem[]>([]);
  const [input, setInput] = useState("");
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    params.then((p) => setSlug(p.slug));
  }, [params]);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setSource(null);
    setSourceError(null);
    api
      .getRoom(slug)
      .then((r) => {
        setRoom(r);
        return Promise.all([
          api.getEpisode(r.animeSlug, r.episodeNumber),
          api.streamSource(r.animeSlug, r.episodeNumber),
        ]);
      })
      .then(([ep, src]) => {
        setEpisode(ep);
        setSource(src);
      })
      .catch((e) => {
        const msg = e instanceof ApiError ? e.message : "Sala não encontrada ou expirada.";
        if (room) {
          setSourceError(msg);
        } else {
          setError(msg);
        }
      })
      .finally(() => {
        setLoading(false);
        setLoadingSource(false);
      });
  }, [slug]);

  useEffect(() => {
    if (!slug || !user || !room) return;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    // socket.io v4: `${origin}/room` → namespace="/room", path="/socket.io/".
    const origin = apiUrl.replace(/\/api\/?$/, "");
    const socket = io(`${origin}/room`, {
      withCredentials: true,
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("joinRoom", { slug });
      socket.emit("loadHistory", { slug });
    });

    socket.on("disconnect", () => setConnected(false));

    socket.on("newMessage", (msg: RoomMessageItem) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on("messageHistory", (msgs: RoomMessageItem[]) => {
      setMessages(msgs.reverse());
    });

    socket.on("roomFull", () => {
      setError("Sala cheia.");
      socket.disconnect();
    });

    socket.on("error", (data: { message: string }) => {
      setError(data.message);
    });

    return () => {
      socket.emit("leaveRoom", { slug });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [slug, user, room]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !socketRef.current?.connected || !slug) return;
    socketRef.current.emit("sendMessage", { slug, content: input });
    setInput("");
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-shelf px-4 py-6">
        <p className="text-body-sm text-mist">
          <a href="/login" className="text-ice underline">
            Entre
          </a>{" "}
          para participar da watch party.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-shelf px-4 py-6">
        <p className="text-body-sm text-mist">Carregando sala...</p>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="mx-auto max-w-shelf px-4 py-6">
        <p className="mb-3 text-body-sm text-signal">
          {error ?? "Sala não encontrada."}
        </p>
        <a href="/" className="btn-ghost">
          Voltar ao início
        </a>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-shelf px-4 py-6">
      <p className="mb-3">
        <a
          href={`/animes/${room.animeSlug}/${room.episodeNumber}`}
          className="text-body-sm text-mist transition-colors hover:text-ice"
        >
          ← Voltar ao episódio
        </a>
      </p>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div>
          <h1 className="font-display text-display-lg text-snow">
            {episode ? episode.anime.title : "Carregando..."}
          </h1>
          <p className="mt-1 font-display text-body-sm font-medium text-ice tabular-nums">
            EP {room.episodeNumber} · Watch Party
          </p>

          <div className="mt-4">
            {episode && source && isProxyEmbed(source.src) ? (
              <VideoPlayer
                src={""}
                embedUrl={source.src}
                posterUrl={source.thumbnailUrl ?? episode.thumbnailUrl ?? undefined}
                animeSlug={room.animeSlug}
                episodeNumber={room.episodeNumber}
              />
            ) : sourceError ? (
              <p className="text-body-sm text-signal">{sourceError}</p>
            ) : loadingSource ? (
              <EpisodeLoadingState />
            ) : source ? (
              <VideoPlayer
                src={source.src}
                posterUrl={source.thumbnailUrl ?? episode?.thumbnailUrl ?? undefined}
                animeSlug={room.animeSlug}
                episodeNumber={room.episodeNumber}
              />
            ) : (
              <p className="text-body-sm text-mist">
                Vídeo não disponível para esta sala.
              </p>
            )}
          </div>
        </div>

        <div className="flex h-[480px] flex-col border border-hairline bg-panel">
          <div className="flex items-center justify-between border-b border-hairline px-3 py-2">
            <span className="font-mono text-body-sm font-medium text-ice">
              Chat da sala
            </span>
            <div className="flex items-center gap-2">
              <span
                className={`h-2 w-2 rounded-full ${connected ? "bg-ice" : "bg-signal"}`}
              />
              <span className="text-caption text-mist">
                {room.maxParticipants} max
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {messages.length === 0 && (
              <p className="text-caption text-mist">
                Nenhuma mensagem ainda. Diga olá!
              </p>
            )}
            {messages.map((msg) => (
              <div key={msg.id} className="text-body-sm">
                <span className="font-sans font-medium text-ice">
                  {msg.user.userName ?? msg.user.name ?? "Anônimo"}:
                </span>{" "}
                <span className="text-mist">{msg.content}</span>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={sendMessage} className="border-t border-hairline p-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Mensagem..."
                maxLength={500}
                className="field flex-1"
              />
              <button
                type="submit"
                disabled={!input.trim() || !connected}
                className="btn-ice"
              >
                →
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
