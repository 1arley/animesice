import { expect, test } from "@playwright/test";

test("stream endpoint rejects invalid episode identifiers", async ({ request }) => {
  const response = await request.get("/api/stream-source?anime=../segredo&episode=0");

  expect(response.status()).toBe(400);
});

test("stream endpoint does not cache pending extraction jobs", async ({ request }) => {
  const response = await request.get("/api/stream-source?anime=slow-stream&episode=1");

  expect(response.status()).toBe(202);
  expect(response.headers()["cache-control"]).toContain("no-store");
  await expect(response.json()).resolves.toMatchObject({ jobId: "slow-job" });
});

test("stream endpoint caches resolved sources for five minutes", async ({ request }) => {
  const response = await request.get("/api/stream-source?anime=cached-stream&episode=1");

  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toBe(
    "public, s-maxage=300, stale-while-revalidate=300",
  );
  await expect(response.json()).resolves.toMatchObject({ src: "https://video.example/episode.m3u8" });
});

