import { Composition, Folder } from "remotion";
import type { z } from "zod";
import type { ResolvedVideoSpec } from "./core/contracts.ts";
import { REGISTERED_VIDEOS, type RegisteredVideoEntry } from "./registry.generated.ts";

function groupByFolder(entries: readonly RegisteredVideoEntry[]) {
  const map = new Map<string, RegisteredVideoEntry[]>();
  for (const entry of entries) {
    const def = entry.definition;
    const folderName = `${def.category.toLowerCase()}-${def.collection}`;
    const list = map.get(folderName) ?? [];
    list.push(entry);
    map.set(folderName, list);
  }
  return [...map.entries()];
}

function renderComposition(
  id: string,
  entry: RegisteredVideoEntry,
  def: ResolvedVideoSpec<Record<string, unknown>>,
  defaultProps: Record<string, unknown>,
) {
  if (entry.schema) {
    return (
      <Composition
        key={id}
        id={id}
        component={entry.component}
        durationInFrames={def.durationInFrames}
        fps={def.fps}
        width={def.width}
        height={def.height}
        schema={entry.schema as z.AnyZodObject}
        defaultProps={defaultProps}
      />
    );
  }
  return (
    <Composition
      key={id}
      id={id}
      component={entry.component}
      durationInFrames={def.durationInFrames}
      fps={def.fps}
      width={def.width}
      height={def.height}
      defaultProps={defaultProps}
    />
  );
}

export function RemotionRoot() {
  const groups = groupByFolder(REGISTERED_VIDEOS);

  return (
    <>
      {groups.map(([folderName, entries]) => (
        <Folder key={folderName} name={folderName}>
          {entries.map((entry) => {
            const def = entry.definition;
            return (
              <Folder key={def.id} name={def.slug}>
                {def.variants.map((variant) =>
                  renderComposition(variant.compositionId, entry, def, variant.props),
                )}
                {def.registerBaseComposition
                  ? renderComposition(def.id, entry, def, def.defaultProps)
                  : null}
              </Folder>
            );
          })}
        </Folder>
      ))}
    </>
  );
}
