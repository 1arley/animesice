"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Avatar } from "@/components/common/Avatar";
import { api } from "@/lib/api";
import type { PublicUserProfile } from "@/types";

type UserIdentity = {
  id?: string | null;
  name?: string | null;
  userName?: string | null;
  avatar?: string | null;
  bio?: string | null;
};

export function UserProfilePreview({
  user,
  children,
  className = "",
  ariaLabel,
}: {
  user: UserIdentity;
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
}) {
  const identifier = user.userName?.trim() || user.id?.trim();
  if (!identifier) return <>{children}</>;

  return (
    <UserProfilePreviewLink
      user={user}
      identifier={identifier}
      className={className}
      ariaLabel={ariaLabel}
    >
      {children}
    </UserProfilePreviewLink>
  );
}

function UserProfilePreviewLink({
  user,
  identifier,
  children,
  className,
  ariaLabel,
}: {
  user: UserIdentity;
  identifier: string;
  children: ReactNode;
  className: string;
  ariaLabel?: string;
}) {
  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const [positioned, setPositioned] = useState(false);
  const [position, setPosition] = useState({ top: 12, left: 12 });
  const previewId = useId();
  const triggerRef = useRef<HTMLAnchorElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestInFlight = useRef(false);
  const pointerType = useRef<string | null>(null);

  const profileHref = `/usuarios/${encodeURIComponent(identifier)}`;
  const displayName =
    profile?.name?.trim() ||
    user.name?.trim() ||
    profile?.userName ||
    user.userName ||
    "Usuário";
  const displayUserName = profile?.userName ?? user.userName ?? user.id;
  const avatar =
    profile?.equippedGachaSkin?.imageUrl ?? profile?.avatar ?? user.avatar;
  const bio = profile?.bio ?? user.bio;

  const cancelClose = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = null;
  }, []);

  const closePreview = useCallback(() => {
    cancelClose();
    setOpen(false);
    setPositioned(false);
  }, [cancelClose]);

  const openPreview = useCallback(() => {
    cancelClose();
    setOpen(true);
    setPositioned(false);
    if (profile || requestInFlight.current) return;

    requestInFlight.current = true;
    setLoading(true);
    setFailed(false);
    void api
      .getPublicProfile(encodeURIComponent(identifier))
      .then(setProfile)
      .catch(() => setFailed(true))
      .finally(() => {
        requestInFlight.current = false;
        setLoading(false);
      });
  }, [cancelClose, identifier, profile]);

  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimer.current = setTimeout(() => {
      const active = document.activeElement;
      if (
        triggerRef.current?.contains(active) ||
        previewRef.current?.contains(active)
      ) {
        return;
      }
      closePreview();
    }, 180);
  }, [cancelClose, closePreview]);

  useEffect(() => {
    if (!open) return;

    function updatePosition() {
      const trigger = triggerRef.current;
      const preview = previewRef.current;
      if (!trigger || !preview) return;

      const rect = trigger.getBoundingClientRect();
      const margin = 12;
      const width = preview.offsetWidth;
      const height = preview.offsetHeight;
      const maxLeft = Math.max(margin, window.innerWidth - width - margin);
      const left = Math.min(Math.max(margin, rect.left), maxLeft);
      const below = rect.bottom + 8;
      const top =
        below + height <= window.innerHeight - margin
          ? below
          : Math.max(margin, rect.top - height - 8);

      setPosition({ top, left });
      setPositioned(true);
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [failed, loading, open, profile]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (
        !triggerRef.current?.contains(target) &&
        !previewRef.current?.contains(target)
      ) {
        closePreview();
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      const focusWasInPreview = previewRef.current?.contains(document.activeElement);
      closePreview();
      if (focusWasInPreview) triggerRef.current?.focus();
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [closePreview, open]);

  useEffect(() => () => cancelClose(), [cancelClose]);

  return (
    <>
      <Link
        ref={triggerRef}
        href={profileHref}
        className={className}
        aria-label={ariaLabel ?? `Perfil de ${displayName}`}
        aria-expanded={open}
        aria-controls={open ? previewId : undefined}
        onPointerEnter={(event) => {
          if (event.pointerType !== "touch") openPreview();
        }}
        onPointerLeave={(event) => {
          if (event.pointerType !== "touch") scheduleClose();
        }}
        onPointerDownCapture={(event) => {
          pointerType.current = event.pointerType;
          if (event.pointerType === "touch") openPreview();
        }}
        onPointerCancelCapture={() => {
          pointerType.current = null;
          scheduleClose();
        }}
        onClickCapture={(event) => {
          if (pointerType.current === "touch") {
            event.preventDefault();
            event.stopPropagation();
            openPreview();
          }
          pointerType.current = null;
        }}
        onFocus={openPreview}
        onBlur={(event) => {
          const next = event.relatedTarget as Node | null;
          if (next && previewRef.current?.contains(next)) return;
          scheduleClose();
        }}
      >
        {children}
      </Link>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={previewRef}
            id={previewId}
            role="region"
            aria-label={`Prévia do perfil de ${displayName}`}
            aria-live="polite"
            aria-busy={loading}
            onPointerEnter={cancelClose}
            onPointerLeave={(event) => {
              if (event.pointerType !== "touch") scheduleClose();
            }}
            onBlur={(event) => {
              const next = event.relatedTarget as Node | null;
              if (next && triggerRef.current?.contains(next)) return;
              scheduleClose();
            }}
            style={{
              top: position.top,
              left: position.left,
              opacity: positioned ? 1 : 0,
              transform: positioned
                ? "translateY(0) scale(1)"
                : "translateY(4px) scale(0.99)",
              pointerEvents: positioned ? "auto" : "none",
            }}
            className="fixed z-[70] max-h-[calc(100vh-1.5rem)] w-[min(20rem,calc(100vw-1.5rem))] overflow-y-auto border border-ice/25 bg-panel p-4 shadow-2xl shadow-ink/70 transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-none"
          >
            <div className="flex items-center gap-3">
              <Avatar
                name={displayName}
                src={avatar}
                size={48}
                className="border border-ice/40"
              />
              <div className="min-w-0">
                <p className="truncate font-display text-body font-semibold text-snow">
                  {displayName}
                </p>
                <p className="truncate font-mono text-caption text-ice">
                  @{displayUserName}
                </p>
              </div>
            </div>

            {bio && (
              <p className="mt-3 line-clamp-3 whitespace-pre-line text-body-sm text-mist">
                {bio}
              </p>
            )}

            {loading ? (
              <div
                role="status"
                className="mt-3 grid grid-cols-2 gap-2 font-mono text-caption text-mist"
              >
                <span>Carregando perfil…</span>
                <span className="skeleton h-3 w-16 justify-self-end" aria-hidden="true" />
              </div>
            ) : profile ? (
              <div className="mt-3 flex gap-4 font-mono text-caption text-mist">
                <span>
                  {profile._count.followers}{" "}
                  {profile._count.followers === 1 ? "seguidor" : "seguidores"}
                </span>
                <span>{profile._count.following} seguindo</span>
              </div>
            ) : failed ? (
              <p role="status" className="mt-3 text-caption text-mist-soft">
                Não foi possível carregar os dados do perfil.
              </p>
            ) : null}

            <Link
              href={profileHref}
              tabIndex={-1}
              className="btn-ice mt-4 flex min-h-11 items-center justify-center px-4 text-body-sm"
            >
              Ver perfil
            </Link>
          </div>,
          document.body,
        )}
    </>
  );
}
