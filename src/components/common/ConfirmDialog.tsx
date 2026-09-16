"use client";

import type { ReactNode } from "react";
import { Modal } from "@/components/common/Modal";

export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel = "Confirmar",
  busy = false,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel?: string;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      footer={
        <>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="btn-ghost disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="btn-ice disabled:opacity-50"
          >
            {busy ? "Guardando…" : confirmLabel}
          </button>
        </>
      }
    >
      {children}
    </Modal>
  );
}
