import { expect, test } from "@playwright/test";
import { openTwoPeers } from "@baditaflorin/mesh-common/testing";

test("a shared challenge and completion appear for another peer", async ({ browser, baseURL }) => {
  const { a, b, cleanup } = await openTwoPeers(browser, baseURL ?? "", {
    storagePrefix: "mesh-skill-challenge",
  });
  try {
    await a.getByLabel("Your display name").fill("Ari");
    await b.getByLabel("Your display name").fill("Bea");
    await a.getByLabel("Challenge title").fill("Explain your idea in one breath");
    await a.getByLabel("Skill focus").selectOption("Speaking");
    await a.getByLabel("Optional encouragement").fill("Keep it warm and clear.");
    await a.getByRole("button", { name: "Share challenge" }).click();
    await expect(a.getByRole("heading", { name: "Explain your idea in one breath" })).toBeVisible();
    await expect(b.getByRole("heading", { name: "Explain your idea in one breath" })).toBeVisible({
      timeout: 10_000,
    });
    await b.getByRole("button", { name: "I tried it" }).click();
    await expect(a.getByText("1 completed")).toBeVisible({ timeout: 10_000 });
  } finally {
    await cleanup();
  }
});
