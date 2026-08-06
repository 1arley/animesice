"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import type { ChatMessage } from "@/types";
import { io, Socket } from "socket.io-client";

interface EpisodeChatProps {
  animeSlug: string;
  episodeNumber: number;
}

export function EpisodeChat({ animeSlug, episodeNumber }: EpisodeChatProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [connected, setConnected] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!showChat || !user) return;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const socket = io(`${apiUrl}/chat`, { withCredentials: true });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("joinEpisode", { animeSlug, episodeNumber });
      socket.emit("loadHistory", { animeSlug, episodeNumber });
    });

    socket.on("disconnect", () => setConnected(false));

    socket.on("newMessage", (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on("messageHistory", (msgs: ChatMessage[]) => {
      setMessages(msgs.reverse());
    });

    return () => {
      socket.emit("leaveEpisode", { animeSlug, episodeNumber });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [showChat, user, animeSlug, episodeNumber]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !socketRef.current?.connected) return;
    socketRef.current.emit("sendMessage", {
      animeSlug,
      episodeNumber,
      content: input,
    });
    setInput("");
  }

  if (!user) {
    return (
      <p className="mt-4 text-body-sm text-mist">
        <a href="/login" className="text-ice underline">Entre</a> para participar do chat ao vivo.
      </p>
    );
  }

  if (!showChat) {
    return (
      <button
        onClick={() => setShowChat(true)}
        className="btn-ghost mt-4"
      >
        💬 Abrir chat ao vivo
      </button>
    );
  }

  return (
    <div className="mt-4 flex h-80 flex-col border border-hairline bg-panel">
      <div className="flex items-center justify-between border-b border-hairline px-3 py-2">
        <span className="font-display text-body-sm font-semibold text-ice">
          Chat ao vivo
        </span>
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${connected ? "bg-ice" : "bg-signal"}`}
          />
          <button
            onClick={() => setShowChat(false)}
            className="font-display text-caption text-mist hover:text-ice"
          >
            Fechar
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 && (
          <p className="text-caption text-mist">Nenhuma mensagem ainda. Seja o primeiro!</p>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className="text-body-sm">
            <span className="font-sans font-medium text-ice">
              {msg.user.name ?? "Anônimo"}:
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
  );
}
