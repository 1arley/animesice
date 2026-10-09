import { spawnSync } from "node:child_process";
import { access, mkdir } from "node:fs/promises";

const output = "public/gacha/crystal.mp4";
const poster = "public/gacha/crystal.webp";
await mkdir("public/gacha", { recursive: true });

const render = spawnSync("npx", [
  "--yes",
  "--package=@remotion/cli@4.0.534",
  "remotion",
  "render",
  "remotion/index.tsx",
  "GachaCrystal",
  output,
  "--codec=h264",
  "--pixel-format=yuv420p",
  "--crf=23",
  "--overwrite",
], { stdio: "inherit" });
if (render.error) throw render.error;
if (render.status !== 0) process.exit(render.status ?? 1);

const frame = spawnSync("ffmpeg", ["-y", "-ss", "0.3", "-i", output, "-frames:v", "1", "-c:v", "libwebp", "-lossless", "0", "-quality", "82", poster], { stdio: "inherit" });
if (frame.error) throw frame.error;
if (frame.status !== 0) process.exit(frame.status ?? 1);
await Promise.all([access(output), access(poster)]);
