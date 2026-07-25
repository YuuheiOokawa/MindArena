import { test, expect, type Browser, type Locator, type Page } from "@playwright/test";

/**
 * Friend battle happy path: two friends challenge each other to a 1-on-1 match (a 2-player
 * Tournament reusing the normal bracket/match/session machinery), play it out for real (no
 * E2E_TEST_MODE bot shortcuts — both sides are human), and verify the loser's resume state sends
 * them back to Home instead of a dead-end spectator bracket (the bug this session fixed) while
 * the winner reaches the champion screen.
 */

async function registerAndLogin(browser: Browser, username: string): Promise<Page> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("/register");
  await page.getByPlaceholder("mind_player").fill(username);
  await page.getByPlaceholder("you@example.com").fill(`${username}@example.com`);
  await page.locator('input[autocomplete="new-password"]').first().fill("TestPass123!");
  await page.locator('input[autocomplete="new-password"]').nth(1).fill("TestPass123!");
  await page.locator('input[type="checkbox"]').check();
  await page.getByRole("button", { name: "登録する" }).click();
  await page.waitForURL("**/onboarding", { timeout: 30_000 });
  await page.getByRole("button", { name: "スキップ" }).click();
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: "はじめる" }).click();
  await page.waitForURL("**/home", { timeout: 15_000 });
  return page;
}

async function clickIfPresent(locator: Locator) {
  await locator.click({ timeout: 2000 }).catch(() => {});
}

/** Advances whichever screen is currently showing (round reveal or one of the 4 games' boards)
 * by one step. Picks a fixed option per game — the winner doesn't matter for this test, only
 * that both real human clients can drive a match to completion. */
async function advanceOneStep(page: Page): Promise<boolean> {
  const revealContinue = page.getByRole("button", { name: /次のラウンドへ|結果を見る/ });
  if (await revealContinue.isVisible().catch(() => false)) {
    await clickIfPresent(revealContinue);
    return true;
  }

  const declareHeading = page.getByText("数字を選ぶ", { exact: false });
  if (await declareHeading.isVisible().catch(() => false)) {
    await clickIfPresent(page.getByRole("button", { name: "1", exact: true }));
    await clickIfPresent(page.getByText("私の数字は5以上だ", { exact: false }));
    await clickIfPresent(page.getByRole("button", { name: "宣言する" }));
    return true;
  }

  const believeButton = page.getByRole("button", { name: "信じる", exact: true });
  if (await believeButton.isVisible().catch(() => false)) {
    await clickIfPresent(believeButton);
    return true;
  }

  const trustButton = page.locator("button", { hasText: "協調して得点を分け合う" });
  if (await trustButton.isVisible().catch(() => false)) {
    await clickIfPresent(trustButton);
    return true;
  }

  const minorityAButton = page.locator("button", { hasText: "Aの少数派を狙う" });
  if (await minorityAButton.isVisible().catch(() => false)) {
    await clickIfPresent(minorityAButton);
    return true;
  }

  const strikeButton = page.locator("button", { hasText: "見破るに勝つ" });
  if (await strikeButton.isVisible().catch(() => false)) {
    await clickIfPresent(strikeButton);
    return true;
  }

  return false;
}

test("two friends can challenge each other, play the match, and land on the right screen after it ends", async ({ browser }) => {
  const suffix = Date.now().toString().slice(-6);
  const alice = `fbalice_${suffix}`;
  const bob = `fbbob_${suffix}`;

  const [alicePage, bobPage] = await Promise.all([registerAndLogin(browser, alice), registerAndLogin(browser, bob)]);

  // Become friends.
  await alicePage.goto("/friends");
  await alicePage.getByPlaceholder("ユーザー名を入力").fill(bob);
  await alicePage.getByRole("button", { name: "検索" }).click();
  await expect(alicePage.getByText(bob, { exact: true })).toBeVisible();
  await alicePage.getByRole("button", { name: "申請", exact: true }).first().click();

  await bobPage.goto("/friends");
  await bobPage.getByRole("button", { name: /^申請/ }).click();
  await expect(bobPage.getByText(alice, { exact: true })).toBeVisible();
  await bobPage.getByRole("button", { name: "承認" }).click();
  // "承認" doesn't navigate anywhere, so there's no URL/route signal to wait on for the POST +
  // refetch it triggers — waiting for the tab's own count to flip is what actually confirms it landed.
  await expect(bobPage.getByRole("button", { name: "フレンド (1)" })).toBeVisible();

  // Alice challenges Bob. Her page never refetches after mount on its own (no polling on
  // /friends), so a fresh navigation is required to see bob's now-accepted friendship — clicking
  // the already-mounted tab button would just redisplay her stale empty list. "対戦" also names
  // the (currently-empty, so suffix-less) battles tab button, which sits before the friend list
  // in the DOM — .last() picks bob's row button.
  await alicePage.goto("/friends");
  await expect(alicePage.getByText(bob, { exact: true })).toBeVisible();
  await alicePage.getByRole("button", { name: "対戦", exact: true }).last().click();
  // Same "no navigation to wait on" gap as the friend-request accept above.
  await expect(alicePage.getByRole("button", { name: "対戦 (1)" })).toBeVisible();

  // Bob accepts the challenge, which creates the 2-player tournament and redirects to its
  // bracket. Same tab-vs-row-button ambiguity as above, but the tab button is first in the DOM.
  await bobPage.goto("/friends");
  await bobPage.getByRole("button", { name: /^対戦/ }).first().click();
  await expect(bobPage.getByText(alice, { exact: true })).toBeVisible();
  await bobPage.getByRole("button", { name: "受ける" }).click();
  await bobPage.waitForURL(/\/tournaments\/.+\/bracket/, { timeout: 15_000 });

  // Alice picks it up from Home. Unlike the 32-player flow (bracket fills in asynchronously via
  // BOT-fill), a friend challenge's round-1 match already exists the instant it's accepted, so
  // resume sends her straight to its preview instead of the bracket screen bob was redirected to.
  await alicePage.goto("/home");
  await alicePage.getByRole("link", { name: "対戦を続ける" }).click();
  await alicePage.waitForURL(/\/tournaments\/.+\/(bracket|matches\/.+\/preview)/, { timeout: 15_000 });

  for (const page of [alicePage, bobPage]) {
    if (!page.url().includes("/preview")) {
      const advance = page.getByRole("button", { name: "対戦へ進む" });
      await advance.waitFor({ state: "visible", timeout: 15_000 });
      await advance.click();
      await page.waitForURL(/\/preview/, { timeout: 15_000 });
    }
    await page.getByRole("button", { name: "対戦開始" }).click();
    await page.waitForURL(/\/play/, { timeout: 15_000 });
  }

  // Play the match out with both real clients, alternating turns until the match resolves.
  let resolved = false;
  for (let attempt = 0; attempt < 80 && !resolved; attempt++) {
    await advanceOneStep(alicePage);
    await advanceOneStep(bobPage);
    await alicePage.waitForTimeout(400);
    resolved = alicePage.url().includes("/result") || bobPage.url().includes("/result");
  }
  expect(resolved).toBe(true);

  // Whoever is still on /result clicks through to their resume destination.
  for (const page of [alicePage, bobPage]) {
    if (page.url().includes("/result")) {
      await page.getByRole("button", { name: "次へ進む" }).click();
      await page.waitForURL(/\/(champion|home)(\?|$)/, { timeout: 15_000 }).catch(() => {});
    }
  }

  const aliceOnChampion = alicePage.url().includes("/champion");
  const bobOnChampion = bobPage.url().includes("/champion");
  // Exactly one side wins the single-round "tournament" and reaches the champion screen.
  expect(aliceOnChampion !== bobOnChampion).toBe(true);

  const winnerPage = aliceOnChampion ? alicePage : bobPage;
  const loserPage = aliceOnChampion ? bobPage : alicePage;

  await expect(winnerPage.getByText("優勝", { exact: true })).toBeVisible();

  // The bug this test guards against: losing used to permanently pin Home's CTA to a dead
  // spectator bracket instead of reverting to "トーナメントに参加".
  await loserPage.goto("/home");
  await expect(loserPage.getByRole("link", { name: "トーナメントに参加" })).toBeVisible();
});
