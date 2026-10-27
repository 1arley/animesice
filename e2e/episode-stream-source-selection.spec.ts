import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

const mockBackendPort = process.env.MOCK_BACKEND_PORT || "3001";
const mockBackendUrl = `http://localhost:${mockBackendPort}`;

test("viewer switches servers, ignores stale results, and resumes playback time", async ({
  page,
  request,
}, testInfo) => {
  const animeSlug = `server-selection-${testInfo.project.name}`;
  const videoBytes = readFileSync("public/icons/crystal_animation_h264.mp4");
  await page.route(`${mockBackendUrl}/__e2e/video/**`, async (route) => {
    const range = route
      .request()
      .headers()
      .range?.match(/^bytes=(\d+)-(\d*)$/);
    const start = range ? Number(range[1]) : 0;
    const end = range && range[2] ? Number(range[2]) : videoBytes.length - 1;
    const body = videoBytes.subarray(start, end + 1);
    await route.fulfill({
      status: range ? 206 : 200,
      headers: {
        "Accept-Ranges": "bytes",
        "Content-Type": "video/mp4",
        "Content-Length": String(body.length),
        ...(range
          ? { "Content-Range": `bytes ${start}-${end}/${videoBytes.length}` }
          : {}),
      },
      body,
    });
  });

  const sourceRequests: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.pathname === "/api/stream-source") sourceRequests.push(url.href);
  });

  try {
    await page.goto(`/animes/${animeSlug}/1`);
    const server = page.getByRole("combobox", { name: "Servidor" });
    const video = page.locator("video");
    await expect(server).toHaveValue("");
    await expect(video).toHaveAttribute(
      "src",
      `${mockBackendUrl}/__e2e/video/auto.mp4`,
    );
    await expect
      .poll(() =>
        video.evaluate((element: HTMLVideoElement) => element.duration),
      )
      .toBeGreaterThan(2);
    await expect
      .poll(() =>
        video.evaluate((element: HTMLVideoElement) => element.seekable.length),
      )
      .toBeGreaterThan(0);

    await video.evaluate((element: HTMLVideoElement) => {
      element.pause();
      element.currentTime = 2;
    });
    await expect
      .poll(() =>
        video.evaluate((element: HTMLVideoElement) => element.currentTime),
      )
      .toBeCloseTo(2, 0);
    await video.evaluate((element: HTMLVideoElement) => {
      element.dispatchEvent(new Event("timeupdate", { bubbles: true }));
    });

    const staleSourceResponse = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return (
        url.pathname === "/api/stream-source" &&
        url.searchParams.get("sourceId") === "animesonline"
      );
    });
    await server.selectOption("animesonline");
    await expect
      .poll(() =>
        sourceRequests.some((url) => url.includes("sourceId=animesonline")),
      )
      .toBe(true);
    await expect
      .poll(async () =>
        (
          await request.get(
            `${mockBackendUrl}/__e2e/pending-source?anime=${animeSlug}`,
          )
        ).json(),
      )
      .toMatchObject({ pending: true });

    await server.selectOption("topanimes");
    await expect(video).toHaveAttribute(
      "src",
      `${mockBackendUrl}/__e2e/video/topanimes.mp4`,
    );
    await expect
      .poll(() =>
        video.evaluate((element: HTMLVideoElement) => element.duration),
      )
      .toBeGreaterThan(2);
    await expect
      .poll(() =>
        video.evaluate((element: HTMLVideoElement) => element.currentTime),
      )
      .toBeCloseTo(2, 0);

    const release = await request.get(
      `${mockBackendUrl}/__e2e/release-source?anime=${animeSlug}`,
    );
    await expect(release.json()).resolves.toEqual({ released: true });
    await (await staleSourceResponse).finished();
    await expect(server).toHaveValue("topanimes");
    await expect(video).toHaveAttribute(
      "src",
      `${mockBackendUrl}/__e2e/video/topanimes.mp4`,
    );

    await server.selectOption("");
    await expect(video).toHaveAttribute(
      "src",
      `${mockBackendUrl}/__e2e/video/auto.mp4`,
    );
    await expect
      .poll(() =>
        video.evaluate((element: HTMLVideoElement) => element.duration),
      )
      .toBeGreaterThan(2);
    await expect
      .poll(() =>
        video.evaluate((element: HTMLVideoElement) => element.currentTime),
      )
      .toBeCloseTo(2, 0);
    expect(sourceRequests).toHaveLength(2);
  } finally {
    await request
      .get(`${mockBackendUrl}/__e2e/release-source?anime=${animeSlug}`)
      .catch(() => null);
  }
});
