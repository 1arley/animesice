import { CrystalVideoClean } from "@/components/animesice/CrystalVideoClean";
import { CrystalVideoPreview } from "@/components/animesice/CrystalVideoPreview";

export const metadata = {
  title: "Teste do cristal animado",
};

export default function TestCrystalPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-10 bg-[#05080E] px-6">
      <div className="text-center">
        <p className="font-display text-2xl font-bold tracking-tight text-snow">
          Teste — cristal animado
        </p>
        <p className="mt-2 font-mono text-caption uppercase tracking-[0.14em] text-motion-glacier/80">
          comparação: nova sem fundo vs. original chaveado
        </p>
      </div>
      <div className="flex flex-col items-center gap-12 sm:flex-row sm:items-start sm:gap-16">
        <div className="flex flex-col items-center gap-3">
          <CrystalVideoClean size={288} />
          <p className="font-mono text-caption uppercase tracking-[0.14em] text-snow/70">
            Nova — crystal_animation_clean.webm
          </p>
        </div>
        <div className="flex flex-col items-center gap-3">
          <CrystalVideoPreview size={288} />
          <p className="font-mono text-caption uppercase tracking-[0.14em] text-snow/70">
            Original — chaveado no shader
          </p>
        </div>
      </div>
    </main>
  );
}