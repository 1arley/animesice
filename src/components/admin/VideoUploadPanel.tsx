"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import { FieldLabel, Hint } from "@/components/admin/Field";

interface VideoUploadPanelProps {
  slug: string;
  number: number;
  onUploaded: (videoUrl: string) => void;
}

/** Upload Supabase — área isolada por hairline. */
export function VideoUploadPanel({ slug, number, onUploaded }: VideoUploadPanelProps) {
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  async function uploadVideo(e: React.FormEvent) {
    e.preventDefault();
    if (!uploadFile) return;
    setUploading(true);
    setUploadError(null);
    setUploadSuccess(false);
    try {
      const updated = await api.adminUploadVideo(slug, number, uploadFile);
      onUploaded(updated.videoUrl ?? "");
      setUploadSuccess(true);
      setUploadFile(null);
    } catch (err) {
      setUploadError(err instanceof ApiError ? err.message : "Erro no upload do vídeo.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <fieldset className="border border-hairline p-4">
      <legend className="px-1 font-sans text-caption uppercase tracking-wider text-mist">
        Upload de vídeo (Supabase)
      </legend>
      <input
        type="file"
        accept="video/*,.m3u8,.ts"
        className="field"
        onChange={(e) => {
          setUploadFile(e.target.files?.[0] ?? null);
          setUploadError(null);
          setUploadSuccess(false);
        }}
      />
      <Hint>
        Envia .mp4/.m3u8/.ts para o Supabase Storage e preenche a URL do
        vídeo acima automaticamente.
      </Hint>
      <div className="mt-3">
        <button type="button" onClick={uploadVideo} disabled={uploading || !uploadFile} className="btn-ghost">
          {uploading ? "Enviando..." : "Enviar vídeo"}
        </button>
      </div>
      {uploadError && (
        <p className="mt-2 border border-signal/40 bg-signal/10 p-2 text-caption text-signal">
          {uploadError}
        </p>
      )}
      {uploadSuccess && (
        <p className="mt-2 text-caption text-ice">Upload concluído — URL preenchida acima.</p>
      )}
    </fieldset>
  );
}
