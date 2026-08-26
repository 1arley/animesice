import { CrystalLoader } from "@/components/animesice/CrystalLoader";

export default function Loading() {
  return (
    <div className="mx-auto max-w-shelf px-4 py-6">
      <div className="skeleton mb-4 h-8 w-32" />

      <div className="flex flex-col gap-6 md:flex-row">
        <aside className="w-full shrink-0 md:w-56">
          <div className="space-y-4">
            <div className="skeleton h-10 w-full" />
            <div className="skeleton h-4 w-16" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton h-4 w-full" />
            ))}
            <div className="skeleton h-10 w-full" />
            <div className="skeleton h-10 w-full" />
            <div className="skeleton h-10 w-full" />
            <div className="skeleton h-10 w-full" />
            <div className="skeleton h-10 w-full" />
          </div>
        </aside>

        <div className="flex-1">
          <CrystalLoader label="Sintonizando" size={48} className="py-8" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i}>
                <div className="skeleton" style={{ aspectRatio: "2 / 3" }} />
                <div className="skeleton mt-2 h-4 w-3/4" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
