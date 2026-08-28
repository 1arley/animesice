import { EpisodeLoadingState } from "@/components/common/EpisodeLoadingState";

export default function Loading() {
  return (
    <div className="mx-auto max-w-shelf px-4 py-6">
      <EpisodeLoadingState />
    </div>
  );
}
