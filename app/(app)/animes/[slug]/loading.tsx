import { CrystalLoader } from "@/components/animesice/CrystalLoader";

export default function Loading() {
  return (
    <div className="mx-auto max-w-shelf px-4 py-6">
      <div className="skeleton mb-6" style={{ aspectRatio: "21 / 9", maxHeight: "320px" }} />

      <div className="flex flex-col gap-6 md:flex-row">
        <div className="w-36 shrink-0 sm:w-40 md:w-48 lg:w-56">
          <div className="skeleton" style={{ aspectRatio: "2 / 3" }} />
        </div>

        <div className="flex-1">
          <CrystalLoader label="Sintonizando" size={64} className="py-4" />
          <div className="skeleton mt-2 h-10 w-2/3" />
          <div className="skeleton mt-2 h-4 w-1/3" />
          <div className="skeleton mt-4 h-16 w-full" />
          <div className="skeleton mt-4 h-8 w-full" />
          <div className="skeleton mt-4 h-24 w-full" />
        </div>
      </div>
    </div>
  );
}
