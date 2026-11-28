import { createRequire } from "node:module";
import type {} from "paper";
import type { Bounds, Point2D } from "../generative/index.ts";

const require = createRequire(import.meta.url);
const paperLib = require("paper-jsdom") as paper.PaperScope;

export type PaperScopeInstance = paper.PaperScope;

export type BezierAnchor = {
  x: number;
  y: number;
  /** Relative handle in from previous point. */
  handleIn?: Point2D;
  /** Relative handle out toward next point. */
  handleOut?: Point2D;
};

export type BooleanOp = "unite" | "subtract" | "intersect" | "exclude";

export type SampledPoint = {
  x: number;
  y: number;
  tx: number;
  ty: number;
  nx: number;
  ny: number;
  angleDeg: number;
  t: number;
  offset: number;
};

/**
 * Formats an SVG path `d` string with bounded floating-point precision so
 * Paper.js outputs stay compact without introducing visual drift.
 */
export function roundPathData(d: string, precision = 2): string {
  const factor = 10 ** precision;
  return d
    .replace(/-?\d*\.?\d+(?:e[+-]?\d+)?/gi, (token) => {
      const n = Number(token);
      if (!Number.isFinite(n)) return token;
      const rounded = Math.round(n * factor) / factor;
      return Object.is(rounded, -0) ? "0" : String(rounded);
    })
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Runs vector geometry inside an isolated headless Paper.js PaperScope and
 * cleans up project state in `finally`.
 */
export function withGeometryScope<T>(
  fn: (scope: PaperScopeInstance) => T,
  size: [number, number] = [750, 1000],
): T {
  const scope = new paperLib.PaperScope();
  scope.setup(new scope.Size(size[0], size[1]));
  try {
    return fn(scope);
  } finally {
    scope.project?.clear();
    scope.remove();
  }
}

function toPaperPath(
  scope: PaperScopeInstance,
  pathData: string,
): paper.PathItem {
  const created = scope.PathItem.create(pathData);
  return created;
}

/**
 * Builds an explicit cubic Bézier SVG path string from anchor points and optional handles.
 */
export function bezierPath(
  anchors: readonly BezierAnchor[],
  opts?: { closed?: boolean; smooth?: boolean; precision?: number },
): string {
  return withGeometryScope((scope) => {
    const p = new scope.Path({ closed: opts?.closed ?? false });
    for (const a of anchors) {
      const pt = new scope.Point(a.x, a.y);
      const hIn = a.handleIn ? new scope.Point(a.handleIn.x, a.handleIn.y) : undefined;
      const hOut = a.handleOut ? new scope.Point(a.handleOut.x, a.handleOut.y) : undefined;
      p.add(new scope.Segment(pt, hIn, hOut));
    }
    if (opts?.smooth) {
      p.smooth({ type: "continuous" });
    }
    return roundPathData(p.pathData, opts?.precision ?? 2);
  });
}

/**
 * Fits a smooth curve through control points using Paper.js curve smoothing.
 */
export function smoothPath(
  points: readonly Point2D[],
  opts?: {
    closed?: boolean;
    type?: "continuous" | "catmull-rom" | "geometric";
    factor?: number;
    precision?: number;
  },
): string {
  if (points.length === 0) return "";
  return withGeometryScope((scope) => {
    const p = new scope.Path({ closed: opts?.closed ?? false });
    for (const pt of points) {
      p.add(new scope.Point(pt.x, pt.y));
    }
    if (points.length >= 2) {
      p.smooth({
        type: opts?.type ?? "continuous",
        factor: opts?.factor ?? 0.5,
      });
    }
    return roundPathData(p.pathData, opts?.precision ?? 2);
  });
}

/**
 * Builds a bilateral symmetric closed Bézier path by mirroring `halfPoints` across `axisX`.
 * Expects points from top-center along one side down to bottom-center.
 */
export function symmetricPath(
  halfPoints: readonly BezierAnchor[],
  axisX: number,
  opts?: { smooth?: boolean; precision?: number },
): string {
  if (halfPoints.length < 2) return "";
  return withGeometryScope((scope) => {
    const p = new scope.Path({ closed: true });
    for (const a of halfPoints) {
      p.add(
        new scope.Segment(
          new scope.Point(a.x, a.y),
          a.handleIn ? new scope.Point(a.handleIn.x, a.handleIn.y) : undefined,
          a.handleOut ? new scope.Point(a.handleOut.x, a.handleOut.y) : undefined,
        ),
      );
    }
    // Mirror points in reverse order excluding endpoints that lie right on the axis
    for (let i = halfPoints.length - 1; i >= 0; i--) {
      const a = halfPoints[i]!;
      if ((i === 0 || i === halfPoints.length - 1) && Math.abs(a.x - axisX) < 0.05) {
        continue;
      }
      const mx = 2 * axisX - a.x;
      // Swapping handles on mirror reverses traversal direction cleanly
      const hIn = a.handleOut ? new scope.Point(-a.handleOut.x, a.handleOut.y) : undefined;
      const hOut = a.handleIn ? new scope.Point(-a.handleIn.x, a.handleIn.y) : undefined;
      p.add(new scope.Segment(new scope.Point(mx, a.y), hIn, hOut));
    }
    if (opts?.smooth) {
      p.smooth({ type: "continuous" });
    }
    return roundPathData(p.pathData, opts?.precision ?? 2);
  });
}

/**
 * Constructs a calligraphic / tapered variable-width ribbon along a smooth centerline.
 * Great for celestial swirls, crescent hair strokes, energy arcs, and comet tails.
 */
export function taperedRibbon(
  centerline: readonly Point2D[],
  width: number | ((t: number) => number),
  opts?: { steps?: number; smooth?: boolean; precision?: number },
): string {
  if (centerline.length < 2) return "";
  const steps = Math.max(8, opts?.steps ?? 36);
  const widthFn = typeof width === "number" ? () => width : width;

  return withGeometryScope((scope) => {
    const spine = new scope.Path();
    for (const pt of centerline) spine.add(new scope.Point(pt.x, pt.y));
    if (opts?.smooth ?? true) {
      spine.smooth({ type: "continuous" });
    }

    const len = spine.length;
    if (len <= 1e-4) return "";

    const leftPts: paper.Point[] = [];
    const rightPts: paper.Point[] = [];

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const offset = t * len;
      const pt = spine.getPointAt(offset);
      const normal = spine.getNormalAt(offset);
      const halfW = Math.max(0, widthFn(t) * 0.5);
      leftPts.push(pt.add(normal.multiply(halfW)));
      rightPts.push(pt.subtract(normal.multiply(halfW)));
    }

    const ribbon = new scope.Path({ closed: true });
    for (const pt of leftPts) ribbon.add(pt);
    for (let i = rightPts.length - 1; i >= 0; i--) {
      ribbon.add(rightPts[i]!);
    }
    ribbon.smooth({ type: "continuous" });

    // Preserve sharp pointed tips when width tapers to 0 at start or end
    if (widthFn(0) <= 0.1) {
      const s0 = ribbon.segments[0];
      if (s0) {
        s0.handleIn.set(0, 0);
        s0.handleOut.set(0, 0);
      }
    }
    if (widthFn(1) <= 0.1) {
      const tipIdx = steps;
      const sTip = ribbon.segments[tipIdx];
      const sTip2 = ribbon.segments[tipIdx + 1];
      if (sTip) {
        sTip.handleIn.set(0, 0);
        sTip.handleOut.set(0, 0);
      }
      if (sTip2) {
        sTip2.handleIn.set(0, 0);
        sTip2.handleOut.set(0, 0);
      }
    }

    return roundPathData(ribbon.pathData, opts?.precision ?? 2);
  });
}

/**
 * Executes an exact 2D boolean operation (`unite`, `subtract`, `intersect`, `exclude`)
 * on two SVG path `d` strings using Paper.js.
 */
export function booleanOp(
  op: BooleanOp,
  pathA: string,
  pathB: string,
  opts?: { precision?: number },
): { d: string; fillRule: "evenodd" | "nonzero" } {
  return withGeometryScope((scope) => {
    const a = toPaperPath(scope, pathA);
    const b = toPaperPath(scope, pathB);
    const res = a[op](b);
    const d = roundPathData(res.pathData, opts?.precision ?? 2);
    const fillRule = res instanceof scope.CompoundPath ? "evenodd" : "nonzero";
    return { d, fillRule };
  });
}

/**
 * Reduces an array of SVG path strings with a single boolean operation.
 */
export function booleanReduce(
  op: BooleanOp,
  paths: readonly string[],
  opts?: { precision?: number },
): { d: string; fillRule: "evenodd" | "nonzero" } {
  if (paths.length === 0) return { d: "", fillRule: "nonzero" };
  if (paths.length === 1) return { d: roundPathData(paths[0]!, opts?.precision ?? 2), fillRule: "nonzero" };

  return withGeometryScope((scope) => {
    let acc = toPaperPath(scope, paths[0]!);
    for (let i = 1; i < paths.length; i++) {
      const next = toPaperPath(scope, paths[i]!);
      acc = acc[op](next);
    }
    const d = roundPathData(acc.pathData, opts?.precision ?? 2);
    const fillRule = acc instanceof scope.CompoundPath ? "evenodd" : "nonzero";
    return { d, fillRule };
  });
}

/**
 * Samples evenly spaced positions, tangents, and normals along any SVG path `d`.
 */
export function samplePath(pathData: string, count: number): SampledPoint[] {
  if (!pathData.trim() || count <= 0) return [];
  return withGeometryScope((scope) => {
    const item = toPaperPath(scope, pathData);
    const path =
      item instanceof scope.CompoundPath
        ? (item.children[0] as paper.Path | undefined)
        : (item as paper.Path);
    if (!path) return [];
    const total = path.length;
    if (total <= 1e-5) return [];
    const pts: SampledPoint[] = [];
    const denom = count === 1 ? 1 : count - 1;
    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0.5 : i / denom;
      const offset = Math.min(total, Math.max(0, t * total));
      const pt = path.getPointAt(offset);
      const tan = path.getTangentAt(offset);
      const norm = path.getNormalAt(offset);
      pts.push({
        x: pt.x,
        y: pt.y,
        tx: tan.x,
        ty: tan.y,
        nx: norm.x,
        ny: norm.y,
        angleDeg: (Math.atan2(tan.y, tan.x) * 180) / Math.PI,
        t,
        offset,
      });
    }
    return pts;
  });
}

export function pathLength(pathData: string): number {
  if (!pathData.trim()) return 0;
  return withGeometryScope((scope) => {
    const item = toPaperPath(scope, pathData);
    if (item instanceof scope.Path) return item.length;
    if (item instanceof scope.CompoundPath) {
      return item.children.reduce(
        (acc: number, c: paper.Item) => acc + (c instanceof scope.Path ? c.length : 0),
        0,
      );
    }
    return 0;
  });
}

export function pathBounds(pathData: string): Bounds {
  if (!pathData.trim()) return { x: 0, y: 0, w: 0, h: 0 };
  return withGeometryScope((scope) => {
    const item = toPaperPath(scope, pathData);
    const b = item.bounds;
    return { x: b.x, y: b.y, w: b.width, h: b.height };
  });
}

export function transformPath(
  pathData: string,
  opts: {
    translate?: Point2D;
    rotateDeg?: number;
    scale?: number | Point2D;
    origin?: Point2D;
    precision?: number;
  },
): string {
  if (!pathData.trim()) return "";
  return withGeometryScope((scope) => {
    const item = toPaperPath(scope, pathData);
    const center = opts.origin
      ? new scope.Point(opts.origin.x, opts.origin.y)
      : item.bounds.center;
    if (opts.scale !== undefined) {
      const sx = typeof opts.scale === "number" ? opts.scale : opts.scale.x;
      const sy = typeof opts.scale === "number" ? opts.scale : opts.scale.y;
      item.scale(sx, sy, center);
    }
    if (opts.rotateDeg) {
      item.rotate(opts.rotateDeg, center);
    }
    if (opts.translate) {
      item.translate(new scope.Point(opts.translate.x, opts.translate.y));
    }
    return roundPathData(item.pathData, opts.precision ?? 2);
  });
}

export function rectPath(x: number, y: number, w: number, h: number, radius = 0): string {
  return withGeometryScope((scope) => {
    const p = new scope.Path.Rectangle(
      new scope.Rectangle(x, y, w, h),
      radius > 0 ? new scope.Size(radius, radius) : undefined,
    );
    return roundPathData(p.pathData);
  });
}

/**
 * Angular chamfered rectangle (core AnimesIce crystalline geometric silhouette).
 */
export function chamferedRectPath(
  x: number,
  y: number,
  w: number,
  h: number,
  chamfer: number,
): string {
  const c = Math.max(0, Math.min(chamfer, w * 0.45, h * 0.45));
  if (c === 0) return rectPath(x, y, w, h);
  const x2 = x + w;
  const y2 = y + h;
  return roundPathData(
    `M${x + c} ${y} L${x2 - c} ${y} L${x2} ${y + c} L${x2} ${y2 - c} L${x2 - c} ${y2} L${x + c} ${y2} L${x} ${y2 - c} L${x} ${y + c} Z`,
  );
}

export function circlePath(cx: number, cy: number, r: number): string {
  return withGeometryScope((scope) => {
    const p = new scope.Path.Circle(new scope.Point(cx, cy), r);
    return roundPathData(p.pathData);
  });
}

export function ellipsePath(cx: number, cy: number, rx: number, ry: number): string {
  return withGeometryScope((scope) => {
    const p = new scope.Path.Ellipse(
      new scope.Rectangle(cx - rx, cy - ry, rx * 2, ry * 2),
    );
    return roundPathData(p.pathData);
  });
}

export function polygonPath(points: readonly Point2D[], closed = true): string {
  if (points.length === 0) return "";
  const cmds = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x} ${p.y}`);
  if (closed) cmds.push("Z");
  return roundPathData(cmds.join(" "));
}
