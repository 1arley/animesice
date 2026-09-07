"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/common/Modal";
import { ADULT_CONFIRM_KEY } from "@/lib/adult";

export function AdultGate() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let ok = false;
    try {
      ok = window.localStorage.getItem(ADULT_CONFIRM_KEY) === "1";
    } catch {
      ok = false;
    }
    if (!ok) {
      setOpen(true);
      document.body.setAttribute("data-adult", "1");
    } else {
      document.body.setAttribute("data-adult-confirmed", "1");
    }
  }, []);

  function confirm() {
    try {
      window.localStorage.setItem(ADULT_CONFIRM_KEY, "1");
    } catch {
      // sem storage, o gate reaparece na próxima página adulta
    }
    document.body.removeAttribute("data-adult");
    document.body.setAttribute("data-adult-confirmed", "1");
    setOpen(false);
  }

  function leave() {
    router.push("/buscar");
  }

  return (
    <Modal
      open={open}
      onClose={leave}
      title="Conteúdo +18"
      footer={
        <>
          <button onClick={leave} className="btn-ghost">
            Voltar
          </button>
          <button onClick={confirm} className="btn-ice" autoFocus>
            Tenho 18+ anos
          </button>
        </>
      }
    >
      <p className="text-body-sm text-mist">
        Esta página contém conteúdo adulto destinado a maiores de 18 anos.
      </p>
    </Modal>
  );
}
