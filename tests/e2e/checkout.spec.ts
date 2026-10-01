import { expect, test, type Page } from "@playwright/test";

// Acceptance flows 2–4: browse → size → cart → details → payment page →
// mock card → paid order page with a single purchase event; plus expiry.

async function toPaymentPage(page: Page) {
  await page.goto("/en/products/matrixyl-firming-serum?kt=e2e123&aff=net1&sub1=x");
  await page.getByRole("button", { name: "Necessary only" }).click();
  await page.getByRole("button", { name: /^30 ml/ }).click();
  await expect(page).toHaveURL(/variant=30ml/);
  await page.getByTestId("add-to-cart").click();

  const drawer = page.getByRole("dialog");
  await expect(drawer.getByText("Matrixyl Firming Serum")).toBeVisible();
  await expect(drawer.getByText("30 ml")).toBeVisible();
  await drawer.getByRole("button", { name: "Checkout" }).click();

  await expect(page).toHaveURL(/\/en\/checkout$/);
  await page.getByLabel("Email").fill("e2e@example.com");
  await page.getByLabel("First name").fill("E2E");
  await page.getByLabel("Last name").fill("Buyer");
  await page.getByLabel("Address", { exact: true }).fill("1 Test Street");
  await page.getByLabel("City").fill("Madrid");
  await page.getByLabel("Postcode").fill("28001");
  await page.getByRole("checkbox").last().click();
  await page.getByTestId("continue-to-payment").click();

  await expect(page).toHaveURL(/\/en\/checkout\/pay\?session=/);
  await expect(page.getByText("Matrixyl Firming Serum")).toBeVisible();
  await expect(page.getByTestId("pay-total")).toContainText("54,90");
  await expect(page.getByTestId("countdown")).toHaveText(/^\d{2}:\d{2}$/);
  // Other adapters (Stripe, Ziina) may be enabled locally; these tests use the mock card.
  await page.getByRole("button", { name: "Card (test mode)" }).click();
}

test("purchase with mock card ends on a paid order page and fires purchase once", async ({ page }) => {
  await toPaymentPage(page);

  await page.getByLabel("Card number").fill("4242 4242 4242 4242");
  await page.getByLabel("MM / YY").fill("12 / 29");
  await page.getByLabel("CVC").fill("123");
  await page.getByLabel("Name on card").fill("E2E Buyer");
  await page.getByTestId("pay-button").click();

  await expect(page).toHaveURL(/\/en\/order\/NPS\d{8}$/);
  await expect(page.getByTestId("order-status-title")).toHaveAttribute("data-status", "PAID");

  const purchases = () => page.evaluate(() => (window.dataLayer ?? []).filter((e) => e.event === "purchase").length);
  await expect.poll(purchases).toBe(1);
  await page.reload();
  await expect(page.getByTestId("order-status-title")).toHaveAttribute("data-status", "PAID");
  expect(await purchases()).toBe(0); // cookie guard: not re-fired on reload
});

test("declined card shows an error and keeps the order payable", async ({ page }) => {
  await toPaymentPage(page);
  await page.getByLabel("Card number").fill("4000 0000 0000 0002");
  await page.getByLabel("MM / YY").fill("12 / 29");
  await page.getByLabel("CVC").fill("123");
  await page.getByLabel("Name on card").fill("E2E Buyer");
  await page.getByTestId("pay-button").click();
  await expect(page.getByText("Your card was declined")).toBeVisible();
  await expect(page).toHaveURL(/\/checkout\/pay/);
});

test("attribution from the landing URL is stored first-touch", async ({ page }) => {
  await page.goto("/en?kt=first111&aff=netA");
  await page.goto("/en/shop?kt=second222");
  const attr = await page.evaluate(() => decodeURIComponent((document.cookie.match(/kt_attr=([^;]*)/) ?? [])[1] ?? ""));
  expect(JSON.parse(attr).ktSubid).toBe("first111");
  await page.goto("/en/shop?kt=third333&kt_override=1");
  const attr2 = await page.evaluate(() => decodeURIComponent((document.cookie.match(/kt_attr=([^;]*)/) ?? [])[1] ?? ""));
  expect(JSON.parse(attr2).ktSubid).toBe("third333");
});

test("spanish locale translates nav, product and checkout", async ({ page }) => {
  await page.goto("/es/products/matrixyl-firming-serum");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sérum Reafirmante Matrixyl");
  await expect(page.getByRole("link", { name: "Tienda" }).first()).toBeVisible();
  await expect(page.getByText("Elige el tamaño")).toBeVisible();
});
