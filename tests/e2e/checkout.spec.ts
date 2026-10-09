import { expect, test, type BrowserContext } from "@playwright/test";
import { sealData } from "iron-session";
import { sessionSecret } from "./setup";

async function signIn(context: BrowserContext) {
  await context.addCookies([{ name: "avion_purchaser", value: await sealData({ purchaserId: "e2e-buyer" }, { password: sessionSecret, ttl: 3600 }), domain: "localhost", path: "/", httpOnly: true, sameSite: "Lax" }]);
}

test("checkout requires an approved account and preserves locale", async ({ page }) => {
  await page.goto("/es/checkout");
  await expect(page.getByRole("heading", { name: /cuenta de investigación verificada/ })).toBeVisible();
  await page.getByRole("link", { name: "Cuenta de investigación e historial", exact: true }).last().click();
  await expect(page).toHaveURL(/\/es\/account$/);
  await expect(page.getByRole("heading", { name: "Cuenta de comprador de investigación" })).toBeVisible();
});

test("persistent cart reaches server-priced pending order and keeps cart on cancellation", async ({ page, context }) => {
  await signIn(context);
  await page.goto("/en/products/e2e-sample");
  await page.getByRole("button", { name: "Increase quantity", exact: true }).click();
  await page.getByTestId("add-to-cart").click();
  await page.reload();
  await page.evaluate(() => {
    const cart = JSON.parse(localStorage.getItem("nps-cart")!);
    cart.state.items[0].unitCents = 1;
    localStorage.setItem("nps-cart", JSON.stringify(cart));
  });
  await page.goto("/en/checkout");
  await page.getByLabel("First name").fill("Research");
  await page.getByLabel("Last name").fill("Buyer");
  await page.getByLabel("Address", { exact: true }).fill("1 Laboratory Road");
  await page.getByLabel("City").fill("Madrid");
  await page.getByLabel("Postcode").fill("28001");
  await page.getByRole("checkbox").last().check();
  await page.getByTestId("continue-to-payment").click();
  await expect(page).toHaveURL(/\/checkout\/pay\?session=/);
  await expect(page.getByTestId("pay-total")).toHaveText("€45.90");
  const token = new URL(page.url()).searchParams.get("session");
  await page.goto(`/en/checkout/cancel?session=${token}`);
  await expect(page.getByRole("heading", { name: "Checkout cancelled" })).toBeVisible();
  await page.reload();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("nps-cart")!).state.items[0].qty)).toBe(2);
  await page.goto("/en/account");
  await expect(page.getByRole("heading", { name: "Order history" })).toBeVisible();
  await expect(page.getByRole("link", { name: /NPS.*PENDING/ }).first()).toBeVisible();
});

test("checkout layout stays within a mobile viewport", async ({ page, context }) => {
  await signIn(context);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/en/account");
  await expect(page.getByRole("heading", { name: "Research purchaser account" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("email ownership and independent admin review are separate gates", async ({ page, context }) => {
  const { readdirSync, readFileSync } = await import("node:fs");
  await page.goto("/en/account");
  const requestForm = page.locator("form").filter({ has: page.getByRole("button", { name: "Send sign-in code", exact: true }) });
  await requestForm.getByLabel("Institutional email").fill("pending-researcher@example.com");
  await requestForm.getByRole("button").click();
  await expect(page.getByRole("status").filter({ hasText: "a code has been sent" })).toBeVisible();
  const email = readdirSync("tmp/mail").map(file => readFileSync(`tmp/mail/${file}`, "utf8")).findLast(text => text.includes("To: pending-researcher@example.com") && text.includes("sign-in code is"));
  const code = email?.match(/sign-in code is (\d{6})/)?.[1];
  expect(code).toBeTruthy();
  const verifyForm = page.locator("form").filter({ has: page.getByLabel("Six-digit code") });
  await verifyForm.getByLabel("Institutional email").fill("pending-researcher@example.com");
  await verifyForm.getByLabel("Six-digit code").fill(code!);
  await verifyForm.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByText("pending-researcher@example.com · Application required")).toBeVisible();
  await page.getByLabel("Organization / institution", { exact: true }).fill("Independent Test Lab");
  await page.getByLabel("Organization registration or accreditation number").fill("REG-TEST-123");
  await page.getByLabel("Institution website").fill("https://example.com");
  await page.getByLabel(/Research purpose, facility/).fill("Analytical research by our institutional laboratory. Contact the independently listed laboratory director to verify authorization.");
  await page.getByRole("checkbox", { name: /I am authorized to purchase/ }).check();
  await page.getByRole("button", { name: "Submit for independent review" }).click();
  await page.goto("/en/checkout");
  await expect(page.getByRole("heading", { name: /verified and approved research purchaser/ })).toBeVisible();

  await context.addCookies([{ name: "avion_admin", value: await sealData({ isAdmin: true }, { password: sessionSecret, ttl: 3600 }), domain: "localhost", path: "/", httpOnly: true, sameSite: "Lax" }]);
  await page.goto("/admin/approvals");
  const review = page.locator("details").filter({ has: page.locator("summary", { hasText: "Independent Test Lab" }) });
  await review.locator("summary").click();
  await review.getByLabel("Reviewer name").fill("Test Administrator");
  await review.getByLabel("Verification evidence and decision rationale").fill("TEST FIXTURE ONLY: independent institutional registration and director authorization checked for this automated test.");
  await review.getByRole("button", { name: "Approve", exact: true }).click();
  await page.goto("/en/account");
  await expect(page.getByText("pending-researcher@example.com · Approved")).toBeVisible();
});
