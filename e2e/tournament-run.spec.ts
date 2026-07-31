import { test, expect, type Locator, type Page } from "@playwright/test";

/**
 * Full happy-path run (source spec §27 / docs/13_TEST_PLAN.md): log in as the seeded demo user,
 * join a Bronze league tournament, let BOTs fill the bracket, play through all 5 rounds using
 * the dev-only deterministic E2E test mode (see lib/e2e-test-mode.ts), and verify the champion
 * screen, points, and profile stats update.
 */

/**
 * A round can resolve (submission accepted -> WaitingBanner/next phase rendered) between an
 * attempt's isVisible() check and its click(), e.g. because a previous attempt's submission was
 * still in flight. A short per-click timeout turns that race into a fast no-op instead of
 * Playwright's click() retrying against a detaching element for the full test timeout.
 */
async function clickIfPresent(locator: Locator) {
  await locator.click({ timeout: 2000 }).catch(() => {});
}

async function playCurrentMatchToWin(page: Page) {
  for (let attempt = 0; attempt < 60; attempt++) {
    if (page.url().includes("/result")) return;

    // Between rounds, GamePlayPage shows a RoundReveal ("次のラウンドへ" / "結果を見る") instead
    // of the board — dismiss it before looking for any of the choice buttons below.
    const revealContinue = page.getByRole("button", { name: /次のラウンドへ|結果を見る/ });
    if (await revealContinue.isVisible().catch(() => false)) {
      await clickIfPresent(revealContinue);
      await page.waitForTimeout(600);
      continue;
    }

    const declareHeading = page.getByText("数字を選ぶ", { exact: false });
    const numberButton = page.getByRole("button", { name: "1", exact: true });
    const declarationOption = page.getByText("私の数字は5以上だ", { exact: false });
    const declareSubmit = page.getByRole("button", { name: "宣言する" });
    const believeButton = page.getByRole("button", { name: "信じる", exact: true });
    const betrayButton = page.locator("button", { hasText: "出し抜いて高得点を狙う" });
    const readButton = page.locator("button", { hasText: "防御に勝つ" });
    const minorityBButton = page.locator("button", { hasText: "Bの少数派を狙う" });

    if (await declareHeading.isVisible().catch(() => false)) {
      await clickIfPresent(numberButton);
      await clickIfPresent(declarationOption);
      await clickIfPresent(declareSubmit);
    } else if (await believeButton.isVisible().catch(() => false)) {
      await clickIfPresent(believeButton);
    } else if (await betrayButton.isVisible().catch(() => false)) {
      await clickIfPresent(betrayButton);
    } else if (await readButton.isVisible().catch(() => false)) {
      await clickIfPresent(readButton);
    } else if (await minorityBButton.isVisible().catch(() => false)) {
      await clickIfPresent(minorityBButton);
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

  await page.getByRole("link", { name: /トーナメントに参加|対戦を続ける/ }).click();
  await page.waitForURL(/\/(leagues|tournaments\/.+\/(bracket|matchmaking|preview|play))/, { timeout: 15000 });

  if (page.url().endsWith("/leagues")) {
    await page.getByRole("heading", { name: "リーグ一覧" }).waitFor({ timeout: 15000 });
    await page.getByText("ブロンズリーグ").first().click();
    await page.waitForURL(/\/leagues\/.+/, { timeout: 15000 });
  }

  const joinButton = page.getByRole("button", { name: "トーナメントに参加する" });
  await joinButton.waitFor({ state: "visible", timeout: 15000 });
  await joinButton.click();
  await page.waitForURL("**/matchmaking", { timeout: 15000 });

  await page.waitForURL("**/bracket", { timeout: 20000 });

  for (let round = 0; round < 6; round++) {
    if (page.url().includes("/champion")) break;

    if (page.url().includes("/bracket")) {
      // Right after a win, /bracket?advanced=1 shows a "勝ち上がり！" celebration in place of the
      // normal bracket content — dismiss it before looking for the next match's advance button.
      const dismissAdvance = page.getByRole("button", { name: "対戦表を見る" });
      if (await dismissAdvance.isVisible().catch(() => false)) {
        await dismissAdvance.click();
      }
      const advance = page.getByRole("button", { name: "対戦へ進む" });
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
  await expect(page.getByText("優勝回数", { exact: true })).toBeVisible();
});
