export type SceneSpec = {
  id: string;
  durationSec?: number;
  durationInFrames?: number;
  overlapFrames?: number;
};

export type PlannedScene = {
  id: string;
  from: number;
  to: number;
  durationInFrames: number;
  startSec: number;
  endSec: number;
};

export type TimelinePlan<TId extends string = string> = {
  fps: number;
  totalFrames: number;
  totalDurationSec: number;
  scenes: Record<TId, PlannedScene>;
  ordered: readonly PlannedScene[];
};

export function createTimeline<const T extends readonly SceneSpec[]>(
  fps: number,
  scenes: T,
): TimelinePlan<T[number]["id"]> {
  if (!Number.isFinite(fps) || fps <= 0) {
    throw new Error(`Invalid fps for timeline: ${fps}`);
  }
  let cursor = 0;
  let maxEnd = 0;
  const ordered: PlannedScene[] = [];
  const byId: Record<string, PlannedScene> = {};

  for (const scene of scenes) {
    const dur =
      scene.durationInFrames ??
      Math.max(1, Math.round((scene.durationSec ?? 1) * fps));
    const overlap = Math.max(0, Math.min(cursor, scene.overlapFrames ?? 0));
    const from = Math.max(0, cursor - overlap);
    const to = from + dur;
    const planned: PlannedScene = {
      id: scene.id,
      from,
      to,
      durationInFrames: dur,
      startSec: Number((from / fps).toFixed(4)),
      endSec: Number((to / fps).toFixed(4)),
    };
    ordered.push(planned);
    byId[scene.id] = planned;
    cursor = to;
    if (to > maxEnd) maxEnd = to;
  }

  return {
    fps,
    totalFrames: maxEnd,
    totalDurationSec: Number((maxEnd / fps).toFixed(4)),
    scenes: byId as Record<T[number]["id"], PlannedScene>,
    ordered,
  };
}
