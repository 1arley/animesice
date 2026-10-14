"use client";

import { useState, type RefObject } from "react";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";

export const REASON_MIN = 10;

/**
 * Escrita sensível de config de produção: motivo obrigatório (o backend grava
 * no histórico) e confirmação antes do PATCH, porque a chave vale na hora para
 * todo mundo. Usado por /admin/gacha/config e /admin/gacha/animacao.
 */
export function ReasonField({
  id,
  value,
  onChange,
  inputRef,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  inputRef?: RefObject<HTMLInputElement | null>;
}) {
  return (
    <label className="grid gap-1 text-caption text-mist" htmlFor={id}>
      Motivo da alteração (mínimo {REASON_MIN} caracteres — fica no histórico)
      <input
        ref={inputRef}
        id={id}
        className="field"
        required
        minLength={REASON_MIN}
        placeholder="Ex.: custo do roll ajustado após o evento de domingo"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

export function SensitiveWriteDialog({
  open,
  busy,
  title,
  entryKey,
  before,
  after,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  busy: boolean;
  title: string;
  entryKey: string;
  before: string;
  after: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <ConfirmDialog
      open={open}
      title={title}
      confirmLabel="Alterar agora"
      busyLabel="Salvando…"
      busy={busy}
      onCancel={onCancel}
      onConfirm={onConfirm}
    >
      <p className="text-body-sm text-mist">
        <span className="font-mono text-caption">{entryKey}</span> vale{" "}
        <span className="font-mono text-caption">{before}</span> hoje e passa a
        valer <span className="font-mono text-caption text-ice">{after}</span>{" "}
        assim que você confirmar. Vale para todo mundo na hora.
      </p>
    </ConfirmDialog>
  );
}

/** Estado do par motivo+confirmação: as duas telas precisam da mesma política. */
export function useSensitiveWrite() {
  const [motivo, setMotivo] = useState("");
  const [confirming, setConfirming] = useState(false);
  return { motivo, setMotivo, confirming, setConfirming, motivoError: motivoError(motivo) };
}

function motivoError(motivo: string) {
  return motivo.trim().length < REASON_MIN
    ? `Motivo obrigatório (mínimo ${REASON_MIN} caracteres) — fica no histórico.`
    : "";
}