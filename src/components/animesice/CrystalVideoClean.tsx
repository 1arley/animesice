"use client";

const SRC = "/icons/crystal_animation_clean.webm";

export function CrystalVideoClean({ size = 288 }: { size?: number }) {
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div
        className="pointer-events-none absolute -inset-[55%]"
        style={{
          background:
            "radial-gradient(circle at 50% 46%, rgba(238, 232, 218, 0.9) 0%, rgba(180, 170, 150, 0.28) 38%, rgba(180, 170, 150, 0) 68%)",
          filter: "blur(22px)",
          opacity: 0.45,
        }}
        aria-hidden="true"
      />
      {/* Fundo preto do WebM some no fundo escuro do site via screen blend:
          o cristal ciano adiciona luz por cima, sem keying e sem artefatos. */}
      <video
        src={SRC}
        muted
        autoPlay
        loop
        playsInline
        preload="auto"
        aria-hidden="true"
        className="pointer-events-none relative block h-full w-full mix-blend-screen"
      />
    </div>
  );
}

export default CrystalVideoClean;