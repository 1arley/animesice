import { CrystalLoader } from "@/components/animesice/CrystalLoader";

export default function Loading() {
  return (
    <div className="mx-auto max-w-shelf px-4 py-6">
      <div className="skeleton mb-2 h-4 w-24" />

      <h1 className="shelf-label">
        Calendário <span className="shelf-label-data">...</span>
      </h1>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-8 w-20" />
        ))}
      </div>

      <CrystalLoader label="Sintonizando" size={48} className="py-8" />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="border border-hairline bg-panel">
            <div className="skeleton h-10 w-full" />
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="flex items-center gap-2 border-t border-hairline px-3 py-2">
                <div className="skeleton h-12 w-8 shrink-0" />
                <div className="skeleton h-4 w-3/4" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
