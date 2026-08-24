import { EpisodeLoadingState } from "@/components/common/EpisodeLoadingState";

export default function Loading() {
  return (
    <div className="mx-auto max-w-shelf px-4 py-6">
      <div className="skeleton mb-4" style={{ aspectRatio: "16 / 9" }} />
      <div className="skeleton mb-2 h-6 w-1/2" />
      <div className="skeleton h-4 w-1/4" />
      <EpisodeLoadingState />
    </div>
  );
}
