"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Avatar } from "@/components/common/Avatar";
import { Modal } from "@/components/common/Modal";
import { formatDate } from "@/lib/time";
import { blur } from "@/lib/blur";
import type { PublicUserProfile, ReportReason } from "@/types";

const REPORT_REASONS: Array<{ value: ReportReason; label: string }> = [
  { value: "SPAM", label: "SPAM" },
  { value: "HARASSMENT", label: "ASSÉDIO" },
  { value: "NSFW", label: "NSFW" },
  { value: "SPOILER", label: "SPOILER" },
  { value: "ILLEGAL", label: "ILLEGAL" },
  { value: "OTHER", label: "OUTRO" },
];

/**
 * ProfileHero — a identidade da pessoa, não um cartão de banco de dados.
 *
 * Cover: usa `.profile-cover` (gradiente derivado da identidade do site,
 * "sinal da madrugada") por padrão. Aceita `coverImage` opcional para um
 * cover personalizado no futuro — sem inventar URLs hoje.
 */
export function ProfileHero({
  profile,
  coverImage,
}: {
  profile: PublicUserProfile;
  coverImage?: string | null;
}) {
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [shared, setShared] = useState(false);
  const [reportReason, setReportReason] = useState<ReportReason>("SPAM");
  const [reportNotes, setReportNotes] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportMsg, setReportMsg] = useState<{
    kind: "ok" | "err";
    text: string;
  } | null>(null);
  const [following, setFollowing] = useState<boolean | null>(null);
  const [followBusy, setFollowBusy] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const isOwnProfile = !!user && user.id === profile.id;
  const showFollowButton = !!user && !isOwnProfile;

  // Estado inicial do follow — só quando faz sentido (logado, outro perfil).
  useEffect(() => {
    if (!showFollowButton) return;
    let cancelled = false;
    api
      .checkFollow(profile.id)
      .then((res) => {
        if (!cancelled) setFollowing(res.following);
      })
      .catch(() => {
        if (!cancelled) setFollowing(false);
      });
    return () => {
      cancelled = true;
    };
  }, [showFollowButton, profile.id]);

  async function handleToggleFollow() {
    if (!user || followBusy) return;
    setFollowBusy(true);
    const before = following;
    setFollowing(!following);
    try {
      const res = await api.toggleFollow(profile.id);
      setFollowing(res.following);
    } catch {
      setFollowing(before);
    } finally {
      setFollowBusy(false);
    }
  }

  const displayName = profile.name?.trim() || profile.userName || "Usuário";
  const memberSince = formatDate(profile.createdAt);
  const malUrl = profile.myAnimeList
    ? `https://myanimelist.net/profile/${encodeURIComponent(profile.myAnimeList)}`
    : null;

  // Fecha o menu ao clicar fora / ESC.
  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  async function handleShare() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    } catch {
      /* clipboard indisponível — ignora silenciosamente */
    }
    setMenuOpen(false);
  }

  async function handleReportSubmit() {
    if (!user) {
      setReportMsg({
        kind: "err",
        text: "Você precisa estar logado para denunciar.",
      });
      return;
    }
    setReportSubmitting(true);
    setReportMsg(null);
    try {
      await api.createReport({
        targetType: "USER",
        targetId: profile.id,
        reason: reportReason,
        notes: reportNotes || undefined,
      });
      setReportMsg({ kind: "ok", text: "Denúncia enviada. Obrigado." });
      setReportOpen(false);
      setReportNotes("");
      setReportReason("SPAM");
    } catch (e) {
      setReportMsg({
        kind: "err",
        text: e instanceof ApiError ? e.message : "Erro ao enviar denúncia.",
      });
    } finally {
      setReportSubmitting(false);
    }
  }

  return (
    <header className="relative">
      {/* Cover — integrada ao perfil, não um card com borda. */}
      <div className="profile-cover h-44 sm:h-56 md:h-64">
        {coverImage ? (
          <Image
            src={coverImage}
            alt=""
            fill
            priority
            sizes="100vw"
            placeholder="blur"
            blurDataURL={blur.landscape}
            className="object-cover"
            quality={80}
          />
        ) : null}
      </div>

      {/* Ações secundárias — menu discreto no canto do cover. */}
      <div ref={menuRef} className="absolute right-4 top-4 sm:right-6">
        <button
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Mais ações"
          aria-expanded={menuOpen}
          className="flex h-11 w-11 items-center justify-center border border-hairline bg-ink/70 text-mist backdrop-blur-sm transition-colors hover:border-ice/60 hover:text-ice"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <circle cx="3" cy="8" r="1.4" fill="currentColor" />
            <circle cx="8" cy="8" r="1.4" fill="currentColor" />
            <circle cx="13" cy="8" r="1.4" fill="currentColor" />
          </svg>
        </button>

        {menuOpen && (
          <div className="absolute right-0 z-50 mt-2 w-60 border border-hairline bg-panel shadow-lg shadow-ink/60">
            <button
              onClick={handleShare}
              className="flex w-full items-center gap-3 px-4 py-3 text-left font-mono text-body-sm text-mist transition-colors hover:bg-slate hover:text-snow"
            >
              <ShareIcon />
              {shared ? "Link copiado!" : "Compartilhar perfil"}
            </button>
            <div className="h-px bg-hairline" />
            <button
              onClick={() => {
                setMenuOpen(false);
                setReportMsg(null);
                setReportOpen(true);
              }}
              className="flex w-full items-center gap-3 px-4 py-3 text-left font-mono text-body-sm text-mist transition-colors hover:bg-slate hover:text-signal"
            >
              <FlagIcon />
              Denunciar usuário
            </button>
          </div>
        )}
      </div>

      {/* Identidade — avatar grande, nome, bio, vínculos. */}
      <div className="mx-auto max-w-shelf px-4">
        <div className="-mt-12 flex items-end gap-4 sm:-mt-14 sm:gap-5">
          <div className="rounded-full ring-4 ring-ink">
            <Avatar
              name={displayName}
              src={profile.avatar}
              size={104}
              className="border border-hairline"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-8">
          <div className="min-w-0">
            <h1 className="font-display text-display-2xl text-snow">
              {displayName}
            </h1>
            <p className="mt-1 font-mono text-body-sm text-ice">
              @{profile.userName ?? profile.id}
            </p>

            {profile.bio && (
              <p className="mt-3 max-w-2xl whitespace-pre-line text-body text-mist">
                {profile.bio}
              </p>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-caption uppercase tracking-wider text-mist">
              <span className="inline-flex items-center gap-1.5">
                <CalendarIcon />
                membro desde {memberSince}
              </span>
              {malUrl && (
                <a
                  href={malUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-ice transition-colors hover:text-snow"
                >
                  <ExternalIcon />
                  MyAnimeList
                </a>
              )}
            </div>
          </div>

          {showFollowButton && (
            <button
              type="button"
              onClick={handleToggleFollow}
              disabled={followBusy || following === null}
              aria-pressed={following === true}
              className={`btn-ghost shrink-0 self-start ${
                following ? "border-ice/60 text-ice" : ""
              }`}
            >
              {followBusy
                ? "…"
                : following
                  ? "Seguindo ✓"
                  : "Seguir"}
            </button>
          )}
        </div>
      </div>

      {/* Denúncia — no menu, não competindo com a identidade. */}
      <Modal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        title="Denunciar usuário"
      >
        {!user ? (
          <p className="text-body-sm text-mist">
            Você precisa{" "}
            <Link href="/login" className="text-ice underline">
              entrar
            </Link>{" "}
            para denunciar.
          </p>
        ) : (
          <div>
            <label className="mb-3 block">
              <span className="text-caption text-mist">Motivo</span>
              <select
                className="field mt-1"
                value={reportReason}
                onChange={(e) => {
                  const reason = REPORT_REASONS.find(
                    (r) => r.value === e.target.value,
                  );
                  if (reason) setReportReason(reason.value);
                }}
              >
                {REPORT_REASONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-caption text-mist">
                Observações (opcional)
              </span>
              <textarea
                value={reportNotes}
                onChange={(e) => setReportNotes(e.target.value)}
                className="field mt-1 w-full resize-none"
                rows={4}
              />
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setReportOpen(false)}
                className="btn-ghost"
              >
                Cancelar
              </button>
              <button
                onClick={handleReportSubmit}
                disabled={reportSubmitting}
                className="btn-ice"
              >
                {reportSubmitting ? "Enviando..." : "Enviar denúncia"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </header>
  );
}

function ShareIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M8 2l4 4-4 4V7.2C4.5 7.4 2.8 9 2.2 12c-.4-2.2.3-4.4 3.3-5.2L8 4.9V2Z"
        fill="currentColor"
      />
    </svg>
  );
}

function FlagIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M2.5 14V2h9l-1.4 3 1.4 3h-9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true">
      <rect
        x="1.5"
        y="2.5"
        width="13"
        height="12"
        rx="1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <path d="M1.5 6h13" stroke="currentColor" strokeWidth="1.3" />
      <path d="M5 1v3M11 1v3" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

function ExternalIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M6 2H2v12h12v-4M10 2h4v4M14 2L7 9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
