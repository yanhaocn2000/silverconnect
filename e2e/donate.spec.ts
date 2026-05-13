/**
 * Donate page smoke tests.
 *
 * The full Stripe Checkout flow (4242 card → success page) requires Stripe's
 * hosted page and is verified manually via §9.1 of the integration plan.
 * These tests cover everything *up to* the redirect:
 *   - page renders the demo copy
 *   - amount preset toggle works (a11y selected state)
 *   - submit posts the right payload to /api/donate/checkout
 *   - server validation rejects amount=0
 *
 * Run against a dev server: PLAYWRIGHT_TEST_BASE_URL=http://localhost:3939
 */
import { test, expect } from "@playwright/test";

test.describe("donate page", () => {
  test("/zh-CN/donate renders hero + form", async ({ page }) => {
    await page.goto("/zh-CN/donate");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "让每一位长者都",
    );
    // form
    await expect(page.getByText("现在就帮助一位长者")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "$50", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  test("preset toggle flips aria-pressed", async ({ page }) => {
    await page.goto("/zh-CN/donate");
    const btn100 = page.getByRole("button", { name: "$100", exact: true });
    await btn100.click();
    await expect(btn100).toHaveAttribute("aria-pressed", "true");
    await expect(
      page.getByRole("button", { name: "$50", exact: true }),
    ).toHaveAttribute("aria-pressed", "false");
  });

  test("submit posts cents and locale to checkout API", async ({ page }) => {
    await page.goto("/zh-CN/donate");

    // Stub the API so we don't actually hit Stripe.
    await page.route("**/api/donate/checkout", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ url: "https://checkout.stripe.com/test/abc" }),
      });
    });

    await page.getByRole("textbox", { name: /姓名/ }).fill("Test User");
    await page.getByRole("textbox", { name: /邮箱/ }).fill("test@example.com");

    const [request] = await Promise.all([
      page.waitForRequest("**/api/donate/checkout"),
      page.getByRole("button", { name: /确认捐款/ }).click(),
    ]);
    const body = JSON.parse(request.postData() ?? "{}");
    expect(body.amountCents).toBe(5000);
    expect(body.currency).toBe("aud");
    expect(body.mode).toBe("once");
    expect(body.locale).toBe("zh-CN");
    expect(body.donor.email).toBe("test@example.com");
  });

  test("server rejects amount=0", async ({ request }) => {
    const res = await request.post("/api/donate/checkout", {
      data: {
        amountCents: 0,
        currency: "aud",
        mode: "once",
        locale: "en",
        donor: { name: "X", email: "x@example.com" },
      },
    });
    expect(res.status()).toBe(400);
  });
});
