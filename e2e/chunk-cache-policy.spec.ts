import { expect, test } from "@playwright/test";

test("missing Next chunks are never cached as immutable", async ({ request }) => {
  const response = await request.get(
    `/_next/static/chunks/missing-${Date.now()}.js`,
  );

  expect(response.status()).toBe(404);
  const cacheControl = response.headers()["cache-control"] ?? "";
  expect(cacheControl).not.toContain("immutable");
  expect(cacheControl).not.toContain("max-age=31536000");
});
