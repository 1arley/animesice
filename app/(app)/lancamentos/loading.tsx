import { CrystalLoader } from "@/components/animesice/CrystalLoader";

export default function Loading() {
  return (
    <div className="mx-auto max-w-shelf px-4 py-6">
      <CrystalLoader label="Em lançamento" className="py-6" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="skeleton" style={{ aspectRatio: "2 / 3" }} />
        ))}
      </div>
    </div>
  );
}
