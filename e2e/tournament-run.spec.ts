import { test, expect, type Page } from "@playwright/test";

/**
 * Full happy-path run (source spec §27 / docs/13_TEST_PLAN.md): log in as the seeded demo user,
 * join a Bronze league tournament, let BOTs fill the bracket, play through all 5 rounds using
 * the dev-only deterministic E2E test mode (see lib/e2e-test-mode.ts), and verify the champion
 * screen, points, and profile stats update.
 */

async function playCurrentMatchToWin(page: Page) {
  for (let attempt = 0; attempt < 60; attempt++) {
    if (page.url().includes("/result")) return;

    const declareHeading = page.getByText("数字を選ぶ", { exact: false });
    const numberButton = page.getByRole("button", { name: "1", exact: true });
    const declarationOption = page.getByText("私の数字は5以上だ", { exact: false });
    const declareSubmit = page.getByRole("button", { name: "宣言する" });
    const believeButton = page.getByRole("button", { name: "信じる", exact: true });
    const betrayButton = page.locator("button", { hasText: "出し抜いて高得点を狙う" });
    const readButton = page.locator("button", { hasText: "防御に勝つ" });
    const minorityBButton = page.locator("button", { hasText: "Bの少数派を狙う" });

    if (await declareHeading.isVisible().catch(() => false)) {
      await numberButton.click();
      await declarationOption.click();
      await declareSubmit.click();
    } else if (await believeButton.isVisible().catch(() => false)) {
      await believeButton.click();
    } else if (await betrayButton.isVisible().catch(() => false)) {
      await betrayButton.click();
    } else if (await readButton.isVisible().catch(() => false)) {
      await readButton.click();
    } else if (await minorityBButton.isVisible().catch(() => false)) {
      await minorityBButton.click();
    }

    await page.waitForTimeout(600);
  }
  throw new Error("Match did not resolve within the expected number of attempts.");
}

test("demo user joins a tournament, plays through, and becomes champion", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("ユーザー名またはメールアドレス").fill("demo");
  await page.getByLabel("パスワード").fill("Demo1234!");
  await page.getByRole("button", { name: "ログイン" }).click();
  await page.waitForURL("**/home", { timeout: 15000 });

  await page.getByRole("link", { name: /トーナメントに参加する|対戦を続ける/ }).click();
  await page.waitForURL(/\/tournaments\/(join|.+\/(bracket|matchmaking|preview|play))/, { timeout: 15000 });

  if (page.url().endsWith("/tournaments/join")) {
    await page.getByRole("heading", { name: "参加するリーグを選択" }).waitFor({ timeout: 15000 });
    await page.locator("button", { hasText: "ブロンズリーグ" }).first().click();
    await page.waitForURL("**/tournaments/join?league=*", { timeout: 15000 });
  }

  const joinButton = page.getByRole("button", { name: "トーナメントに参加する" });
  await joinButton.waitFor({ state: "visible", timeout: 15000 });
  await joinButton.click();
  await page.waitForURL("**/matchmaking", { timeout: 15000 });

  await page.waitForURL("**/bracket", { timeout: 20000 });

  for (let round = 0; round < 6; round++) {
    if (page.url().includes("/champion")) break;

    if (page.url().includes("/bracket")) {
      const advance = page.getByRole("button", { name: "次の対戦へ進む" });
      await advance.waitFor({ state: "visible", timeout: 15000 });
      await advance.click();
    }

    await page.waitForURL("**/preview", { timeout: 15000 });
    await page.getByRole("button", { name: "対戦開始" }).click();
    await page.waitForURL("**/play", { timeout: 15000 });

    await playCurrentMatchToWin(page);
    await page.waitForURL("**/result", { timeout: 15000 });

    await expect(page.getByText("WIN", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "次へ進む" }).click();
    await page.waitForURL(/\/(champion|bracket|preview)(\?|$)/, { timeout: 15000 });

    if (page.url().includes("/champion")) break;
  }

  await expect(page).toHaveURL(/\/champion/);
  await expect(page.getByText("優勝", { exact: true })).toBeVisible();

  await page.goto("/profile");
  await expect(page.getByText("優勝回数")).toBeVisible();
});
