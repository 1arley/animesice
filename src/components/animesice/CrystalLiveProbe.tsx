"use client";

/**
 * Sonda visual do cristal vivo, usada em /test-crystal.
 *
 * Existe para responder uma pergunta que o gacha não responde sozinho: a chave
 * de alpha remove o preto do asset? O selo entra no núcleo? A dissolução
 * fragmenta em vez de esmorecer? Roda os três beats em loop, sem API.
 */
import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { CrystalLive, type CristalControle } from "./CrystalLive";

const CICLO = 4.2;

export function CrystalLiveProbe({ size = 288 }: { size?: number }) {
  const controle = useRef<CristalControle>({ selo: 0, dissolver: 0 });

  useEffect(() => {
    const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.6 });
    tl.set(controle.current, { selo: 0, dissolver: 0 }, 0)
      .to(controle.current, { selo: 1, duration: 1.1, ease: "power1.inOut" }, 0.6)
      .to(controle.current, { selo: 0.12, duration: 0.6, ease: "power2.out" }, 2.1)
      .to(controle.current, { dissolver: 1, duration: 1.0, ease: "power2.in" }, 2.7)
      .set(controle.current, { dissolver: 0 }, CICLO);
    return () => {
      tl.kill();
    };
  }, []);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div
        className="pointer-events-none absolute -inset-[55%]"
        style={{
          background:
            "radial-gradient(circle at 50% 46%, rgba(0,229,255,.9) 0%, rgba(0,145,234,.28) 38%, rgba(0,145,234,0) 68%)",
          filter: "blur(22px)",
          opacity: 0.45,
        }}
        aria-hidden="true"
      />
      <CrystalLive
        controle={controle}
        cor={[1, 0.78, 0.36]}
        className="relative block h-full w-full"
      />
    </div>
  );
}

export default CrystalLiveProbe;