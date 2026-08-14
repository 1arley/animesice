import { CrystalMotion } from "@/components/animesice/CrystalMotion";

interface CrystalLoaderProps {
  /** Label do estado de carregamento (voz do canal). */
  label?: string;
  /** Lado do cristal em px. */
  size?: number;
  className?: string;
}

/**
 * Estado de loading com a identidade de motion: o cristal já nítido,
 * respirando — glow pulsando e varredura de luz cruzando a cada ~2,6s.
 * Baixo contraste para não cansar em esperas longas.
 */
export function CrystalLoader({
  label = "Carregando sinal",
  size = 96,
  className = "",
}: CrystalLoaderProps) {
  return (
    <div
      role="status"
      className={`flex flex-col items-center justify-center gap-5 ${className}`}
    >
      <CrystalMotion mode="loop" size={size} />
      <p className="flex items-center gap-2 font-mono text-caption uppercase tracking-[0.14em] text-motion-glacier/80">
        <span
          className="inline-block h-2 w-2 animate-blink bg-motion-cyan"
          aria-hidden="true"
        />
        {label}
      </p>
    </div>
  );
}

export default CrystalLoader;
