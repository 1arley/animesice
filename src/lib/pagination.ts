export function paginationSlots(
  current: number,
  total: number,
): (number | "…")[] {
  const visible = new Set<number>([1, total]);
  for (let offset = -2; offset <= 2; offset++) {
    const page = current + offset;
    if (page >= 1 && page <= total) visible.add(page);
  }

  const sorted = [...visible].sort((a, b) => a - b);
  return sorted.flatMap((page, index): (number | "…")[] => {
    const previous = sorted[index - 1];
    return previous !== undefined && page - previous > 1
      ? ["…", page]
      : [page];
  });
}
