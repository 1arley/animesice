declare module "paper-jsdom" {
  import type paper from "paper";
  export = paper;
}

declare module "svgdom" {
  export function createSVGWindow(): Window & typeof globalThis & {
    document: Document & { documentElement: SVGSVGElement };
  };
}
