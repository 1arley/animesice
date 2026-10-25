"use client";

import { useState } from "react";
import Image from "next/image";
import { safeImageSrc } from "@/lib/url";
import { Modal } from "@/components/common/Modal";

/**
 * Faixa de arte dos cartões de oferta do gacha: imagem com recado de
 * indisponibilidade, clique para inspecionar (quando há prévia de carta)
 * ou para abrir a arte ampliada, com zoom de 2× na prévia.
 */
export function GachaArtworkBay({
  name,
  image,
  details,
  onInspectCard,
  className = "h-64 sm:h-72",
}: {
  name: string;
  image?: string | null;
  /** Texto exibido dentro da prévia ampliada. */
  details?: string;
  onInspectCard?: () => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(false);
  const [failed, setFailed] = useState(false);
  const src = safeImageSrc(image);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (onInspectCard) {
            onInspectCard();
            return;
          }
          setZoom(false);
          setOpen(true);
        }}
        aria-label={
          onInspectCard
            ? `Inspecionar carta ${name}`
            : `Ver detalhes de ${name}`
        }
        className="group block w-full text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ice"
      >
        <span
          className={`flex items-center justify-center overflow-hidden bg-ink ${className}`}
        >
          {src && !failed ? (
            <Image
              src={src}
              alt={name}
              width={480}
              height={640}
              sizes="(max-width: 479px) 90vw, (max-width: 1023px) 45vw, 400px"
              onError={() => setFailed(true)}
              className="h-full w-full object-contain"
            />
          ) : (
            <span className="text-body-sm text-mist">Imagem indisponível</span>
          )}
        </span>
        <span className="flex min-h-11 items-center justify-center border-b border-hairline text-body-sm text-ice group-hover:text-snow">
          {onInspectCard ? "Inspecionar carta" : "Ver arte e detalhes"}
        </span>
      </button>
      {open && (
        <Modal
          open
          size="wide"
          onClose={() => setOpen(false)}
          title={name}
          footer={
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="btn-ghost min-h-11 px-4"
            >
              Fechar prévia
            </button>
          }
        >
          <p className="mb-4 break-words text-body-sm text-mist">{details}</p>
          {src && !failed ? (
            <>
              <button
                type="button"
                aria-pressed={zoom}
                onClick={() => setZoom(!zoom)}
                className="btn-ghost mb-3 min-h-11 px-4"
              >
                {zoom ? "Ajustar à tela" : "Ampliar 2×"}
              </button>
              <div
                tabIndex={0}
                role="region"
                aria-label="Arte ampliada; use a rolagem para explorar"
                className="max-h-[60dvh] overflow-auto overscroll-contain bg-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice"
              >
                <Image
                  src={src}
                  alt={name}
                  width={960}
                  height={1280}
                  sizes={zoom ? "1600px" : "800px"}
                  className={
                    zoom
                      ? "h-auto w-[200%] max-w-none"
                      : "mx-auto h-auto max-h-[60dvh] w-full object-contain"
                  }
                />
              </div>
              {zoom && (
                <p className="mt-2 text-caption text-mist">
                  Deslize ou role para explorar a imagem ampliada.
                </p>
              )}
            </>
          ) : (
            <p className="py-10 text-center text-mist">
              Imagem indisponível para este item.
            </p>
          )}
        </Modal>
      )}
    </>
  );
}
