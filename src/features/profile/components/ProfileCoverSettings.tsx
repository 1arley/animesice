"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

const MAX_SOURCE_BYTES = 20 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 1024 * 1024;
const WIDTH = 1600;
const HEIGHT = 520;

async function cropCover(file: File, x: number, y: number): Promise<File> {
  const image = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) {
    image.close();
    throw new Error("Não foi possível recortar a imagem.");
  }

  const scale = Math.max(WIDTH / image.width, HEIGHT / image.height);
  const scaledWidth = image.width * scale;
  const scaledHeight = image.height * scale;
  context.drawImage(
    image,
    -(scaledWidth - WIDTH) * (x / 100),
    -(scaledHeight - HEIGHT) * (y / 100),
    scaledWidth,
    scaledHeight,
  );
  image.close();

  for (const quality of [0.9, 0.78, 0.66, 0.54, 0.42]) {
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality),
    );
    if (blob && blob.size <= MAX_OUTPUT_BYTES) {
      return new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), {
        type: "image/jpeg",
        lastModified: file.lastModified,
      });
    }
  }
  throw new Error("Não foi possível reduzir a capa para até 1MB.");
}

export function ProfileCoverSettings() {
  const { user, refreshUser } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [x, setX] = useState(50);
  const [y, setY] = useState(50);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  function cancelCrop() {
    setFile(null);
    setPreview((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
    if (inputRef.current) inputRef.current.value = "";
  }

  function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    setMessage("");
    setError("");
    const next = event.target.files?.[0];
    if (!next) return;
    if (!["image/jpeg", "image/png"].includes(next.type.toLowerCase())) {
      setError("Formato inválido. Envie JPG ou PNG.");
      return;
    }
    if (next.size > MAX_SOURCE_BYTES) {
      setError("Imagem muito grande. O limite é 20MB.");
      return;
    }
    setX(50);
    setY(50);
    setFile(next);
    setPreview(URL.createObjectURL(next));
  }

  async function saveCover(event: React.FormEvent) {
    event.preventDefault();
    if (!file || busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api.uploadProfileCover(await cropCover(file, x, y));
      await refreshUser();
      cancelCrop();
      setMessage("Capa atualizada.");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível salvar a capa.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function removeCover() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api.deleteProfileCover();
      await refreshUser();
      setMessage("Capa removida. O visual padrão foi restaurado.");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível remover a capa.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="border border-hairline bg-panel p-6">
      <div className="mb-4">
        <h2 className="font-display text-display-lg text-snow">
          Capa do perfil
        </h2>
        <p className="text-body-sm text-mist">
          JPG ou PNG, até 20MB. Ajuste o recorte antes de salvar.
        </p>
      </div>

      {message && (
        <p role="status" className="mb-4 text-body-sm text-ice">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="mb-4 text-body-sm text-signal">
          {error}
        </p>
      )}

      {preview ? (
        <form onSubmit={saveCover} className="space-y-4">
          <div className="relative aspect-[1600/520] overflow-hidden bg-ink">
            <Image
              src={preview}
              alt="Prévia do recorte da capa"
              fill
              unoptimized
              sizes="(max-width: 768px) 100vw, 700px"
              className="object-cover"
              style={{ objectPosition: `${x}% ${y}%` }}
            />
          </div>
          <label className="block">
            <span className="mb-1 block text-caption text-mist">
              Enquadramento horizontal
            </span>
            <input
              type="range"
              min="0"
              max="100"
              value={x}
              onChange={(event) => setX(Number(event.target.value))}
              aria-label="Enquadramento horizontal da capa"
              className="w-full accent-ice"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-caption text-mist">
              Enquadramento vertical
            </span>
            <input
              type="range"
              min="0"
              max="100"
              value={y}
              onChange={(event) => setY(Number(event.target.value))}
              aria-label="Enquadramento vertical da capa"
              className="w-full accent-ice"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={busy} className="btn-ice">
              {busy ? "Salvando..." : "Salvar capa"}
            </button>
            <button
              type="button"
              onClick={cancelCrop}
              disabled={busy}
              className="btn-ghost"
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-3">
          <div className="relative aspect-[1600/520] overflow-hidden bg-ink">
            {user?.profileCover ? (
              <Image
                src={user.profileCover}
                alt="Capa atual do perfil"
                fill
                unoptimized
                sizes="700px"
                className="object-cover"
              />
            ) : (
              <div className="profile-cover h-full" aria-label="Capa padrão" />
            )}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png"
            className="hidden"
            onChange={onFileChange}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="btn-ghost"
            >
              {user?.profileCover ? "Trocar capa" : "Enviar capa"}
            </button>
            {user?.profileCover && (
              <button
                type="button"
                onClick={removeCover}
                disabled={busy}
                className="btn-ghost"
              >
                {busy ? "Removendo..." : "Remover capa"}
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
