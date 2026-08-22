"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { api, ApiError, isProxyEmbed, type RoomInfo, type RoomMessageItem, type StreamSource } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Episode, Anime } from "@/types";
import { SyncedVideoPlayer } from "@/components/common/SyncedVideoPlayer";
import { EpisodeLoadingState } from "@/components/common/EpisodeLoadingState";
import { io, Socket } from "socket.io-client";

interface Participant {
  userId: string;
  userName: string | null;
  name: string | null;
  avatar: string | null;
  isHost: boolean;
}

function mergeMessages(
  current: RoomMessageItem[],
  incoming: RoomMessageItem[],
): RoomMessageItem[] {
  const unique = new Map(current.map((message) => [message.id, message]));
  for (const message of incoming) unique.set(message.id, message);
  return Array.from(unique.values()).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

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
  const [realtimeError, setRealtimeError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const socketRef = useRef<Socket | null>(null);
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const shouldStickToBottomRef = useRef(true);

  const scrollChatToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const element = messagesRef.current;
    element?.scrollTo({ top: element.scrollHeight, behavior });
    shouldStickToBottomRef.current = true;
    setUnreadMessages(0);
  }, []);

  useEffect(() => {
    params.then((p) => setSlug(p.slug));
  }, [params]);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setSource(null);
    setSourceError(null);
    let gotRoom = false;
    api
      .getRoom(slug)
      .then((r) => {
        gotRoom = true;
        setRoom(r);
        setLoadingSource(true);
        return api.getEpisode(r.animeSlug, r.episodeNumber).then((ep) => {
          setEpisode(ep);
          return api.streamSource(r.animeSlug, r.episodeNumber);
        });
      })
      .then((src) => {
        setSource(src);
      })
      .catch((e) => {
        const msg = e instanceof ApiError ? e.message : "Sala não encontrada ou expirada.";
        if (gotRoom) {
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
    const origin = apiUrl.replace(/\/api\/?$/, "");
    const socket = io(`${origin}/room`, {
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
    });
    socketRef.current = socket;
    setSocket(socket);

    let historyReceived = false;

    socket.on("connect", () => {
      setConnected(true);
      setRealtimeError(null);
      socket.emit("joinRoom", { slug });
      socket.emit("loadHistory", { slug });
    });

    socket.on("disconnect", () => {
      setConnected(false);
      setJoined(false);
    });

    socket.on("connect_error", () => {
      setConnected(false);
      setRealtimeError("Conexão com a sala interrompida. Tentando reconectar...");
    });

    socket.on("joinedRoom", (data: { roomId: string; isHost: boolean }) => {
      setIsHost(data.isHost);
      setJoined(true);
      setRealtimeError(null);
    });

    socket.on("newMessage", (msg: RoomMessageItem) => {
      setMessages((prev) => mergeMessages(prev, [msg]));
      if (!shouldStickToBottomRef.current) {
        setUnreadMessages((count) => count + 1);
      }
    });

    socket.on("messageHistory", (msgs: RoomMessageItem[]) => {
      historyReceived = true;
      setMessages((prev) => mergeMessages(prev, msgs));
    });

    socket.on("participantList", (list: Participant[]) => {
      setParticipants(list);
    });

    const fallbackTimer = setTimeout(() => {
      if (!historyReceived) {
        api.getRoomMessages(slug)
          .then((msgs) => setMessages((prev) => mergeMessages(prev, msgs)))
          .catch(() => {});
      }
    }, 3000);

    socket.on("roomFull", () => {
      setError("Sala cheia.");
      socket.disconnect();
    });

    socket.on("error", (data: { message: string }) => {
      setRealtimeError(data.message);
    });
    socket.on("rateLimited", (data: { message: string }) => {
      setRealtimeError(data.message);
    });
    socket.on("duplicate", (data: { message: string }) => {
      setRealtimeError(data.message);
    });
    socket.on("suspended", (data: { message: string }) => {
      setError(data.message);
    });

    return () => {
      clearTimeout(fallbackTimer);
      socket.emit("leaveRoom", { slug });
      socket.disconnect();
      socketRef.current = null;
      setSocket(null);
    };
  }, [slug, user, room]);

  useEffect(() => {
    if (shouldStickToBottomRef.current) {
      const element = messagesRef.current;
      element?.scrollTo({ top: element.scrollHeight, behavior: "auto" });
    }
  }, [messages]);

  function handleChatScroll() {
    const element = messagesRef.current;
    if (!element) return;
    const isNearBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 48;
    shouldStickToBottomRef.current = isNearBottom;
    if (isNearBottom) setUnreadMessages(0);
  }

  function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !socketRef.current?.connected || !slug) return;
    setRealtimeError(null);
    socketRef.current.emit("sendMessage", { slug, content: input });
    setInput("");
  }

  async function handleDeleteRoom() {
    if (!slug) return;
    setDeleting(true);
    try {
      await api.deleteRoom(slug);
      window.location.href = "/";
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erro ao deletar sala.");
      setConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
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
          Voltar ao inicio
        </a>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-shelf px-4 py-6">
      <div className="mb-3 flex items-center justify-between">
        <a
          href={`/animes/${room.animeSlug}/${room.episodeNumber}`}
          className="text-body-sm text-mist transition-colors hover:text-ice"
        >
          ← Voltar ao episódio
        </a>
        {isHost && (confirmDelete ? (
          <div className="flex gap-2">
            <button
              onClick={handleDeleteRoom}
              disabled={deleting}
              className="btn-danger btn-sm"
            >
              {deleting ? "Deletando..." : "Confirmar?"}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="btn-ghost btn-sm"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="btn-ghost btn-sm text-signal"
          >
            Deletar sala
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div>
          <h1 className="font-display text-display-lg text-snow">
            {episode ? episode.anime.title : "Carregando..."}
          </h1>
          <p className="mt-1 font-display text-body-sm font-medium text-ice tabular-nums">
            EP {room.episodeNumber} · Watch Party {isHost && "· Host"}
          </p>

          {realtimeError && (
            <p role="status" className="mt-2 text-caption text-signal">
              {realtimeError}
            </p>
          )}
          {joined && participants.length > 0 && !participants.some((p) => p.isHost) && (
            <p role="status" className="mt-2 text-caption text-mist">
              O host saiu. A reprodução ficará pausada até ele voltar.
            </p>
          )}

          <div className="mt-4">
            {episode && source && isProxyEmbed(source.src) ? (
              <SyncedVideoPlayer
                src={""}
                embedUrl={source.src}
                posterUrl={source.thumbnailUrl ?? episode.thumbnailUrl ?? undefined}
                animeSlug={room.animeSlug}
                episodeNumber={room.episodeNumber}
                socket={socket}
                roomSlug={slug}
                isHost={isHost}
              />
            ) : sourceError ? (
              <p className="text-body-sm text-signal">{sourceError}</p>
            ) : loadingSource ? (
              <EpisodeLoadingState />
            ) : source ? (
              <SyncedVideoPlayer
                src={source.src}
                posterUrl={source.thumbnailUrl ?? episode?.thumbnailUrl ?? undefined}
                animeSlug={room.animeSlug}
                episodeNumber={room.episodeNumber}
                socket={socket}
                roomSlug={slug}
                isHost={isHost}
              />
            ) : (
              <p className="text-body-sm text-mist">
                Vídeo não disponível para esta sala.
              </p>
            )}
          </div>

          {!isHost && source && !isProxyEmbed(source.src) && (
            <p className="mt-2 text-caption text-mist">
              O host controla a reprodução. Seu player sincroniza automaticamente.
            </p>
          )}
        </div>

        <div className="flex h-[600px] flex-col border border-hairline bg-panel">
          <div className="flex items-center justify-between border-b border-hairline px-3 py-2">
            <span className="font-mono text-body-sm font-medium text-ice">
              Chat da sala
            </span>
            <div className="flex items-center gap-2">
              <span
                className={`h-2 w-2 rounded-full ${connected ? "bg-ice" : "bg-signal"}`}
              />
              <span className="text-caption text-mist">
                {participants.length}/{room.maxParticipants} online
              </span>
            </div>
          </div>

          {participants.length > 0 && (
            <div className="flex flex-wrap gap-1 border-b border-hairline px-3 py-2">
              {participants.map((p) => (
                <span
                  key={p.userId}
                  className="inline-flex items-center gap-1 rounded bg-hairline/30 px-1.5 py-0.5 text-caption"
                >
                  {p.avatar && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.avatar}
                      alt=""
                      className="h-4 w-4 rounded-full"
                    />
                  )}
                  <span className={p.isHost ? "text-ice font-medium" : "text-mist"}>
                    {p.userName ?? p.name ?? "Anônimo"}
                  </span>
                  {p.isHost && <span className="text-ice">★</span>}
                </span>
              ))}
            </div>
          )}

          <div className="relative min-h-0 flex-1">
            <div
              ref={messagesRef}
              onScroll={handleChatScroll}
              className="h-full overflow-y-auto p-3 space-y-2"
            >
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
            </div>
            {unreadMessages > 0 && (
              <button
                type="button"
                onClick={() => scrollChatToBottom()}
                className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-ice px-3 py-1 text-caption font-medium text-ink shadow-lg"
              >
                {unreadMessages} {unreadMessages === 1 ? "nova mensagem" : "novas mensagens"} ↓
              </button>
            )}
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
