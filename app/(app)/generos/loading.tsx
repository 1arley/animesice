import { CrystalLoader } from "@/components/animesice/CrystalLoader";

export default function Loading() {
  return (
    <div className="mx-auto max-w-shelf px-4 py-6">
      <CrystalLoader label="Gêneros" className="py-6" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {Array.from({ length: 18 }).map((_, i) => (
          <div
            key={i}
            className="skeleton h-24 rounded border border-hairline"
          />
        ))}
      </div>
    </div>
  );
}
