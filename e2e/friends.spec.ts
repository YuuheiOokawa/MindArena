import { test, expect, type Browser, type Page } from "@playwright/test";

/**
 * Friend request happy path across two independently-registered accounts: search by username,
 * send a request, see it pending on the sender, accept it on the receiver, and confirm both
 * sides now list each other as friends and can unfriend.
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
  return page;
}

test("two players can send, accept, and remove a friend request", async ({ browser }) => {
  const suffix = Date.now().toString().slice(-8);
  const alice = `alice_${suffix}`;
  const bob = `bob_${suffix}`;

  const [alicePage, bobPage] = await Promise.all([registerAndLogin(browser, alice), registerAndLogin(browser, bob)]);

  await alicePage.goto("/friends");
  await alicePage.getByPlaceholder("ユーザー名を入力").fill(bob);
  await alicePage.getByRole("button", { name: "検索" }).click();
  await expect(alicePage.getByText(bob, { exact: false })).toBeVisible();
  await alicePage.getByRole("button", { name: "申請", exact: true }).first().click();
  await expect(alicePage.getByText("申請済み")).toBeVisible();

  await bobPage.goto("/friends");
  await bobPage.getByRole("button", { name: /^申請/ }).click();
  await expect(bobPage.getByText(alice, { exact: false })).toBeVisible();
  await bobPage.getByRole("button", { name: "承認" }).click();

  await bobPage.getByRole("button", { name: /^フレンド/ }).click();
  await expect(bobPage.getByText(alice, { exact: false })).toBeVisible();

  await alicePage.reload();
  await expect(alicePage.getByText(bob, { exact: false })).toBeVisible();

  await alicePage.getByLabel("フレンド解除").click();
  await expect(alicePage.getByText("まだフレンドがいません")).toBeVisible();
});
