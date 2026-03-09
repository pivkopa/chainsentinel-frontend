import { test, expect } from "@playwright/test";

test.describe("ChainSentinel MVP Frontend", () => {
  test.beforeEach(async ({ page }) => {
    // Mock the backend API responses
    await page.route("**/api/v1/users/profile", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: 1,
          publicKey: "0x1234567890123456789012345678901234567890",
          email: "test@example.com",
          username: "tester",
        }),
      });
    });

    await page.route("**/api/v1/users/balance/EVM", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ balance: "1.2345", unit: "ETH" }),
      });
    });

    await page.route("**/api/v1/alerts", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([]),
        });
      } else if (route.request().method() === "POST") {
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            id: 101,
            type: "PRICE_ABOVE",
            status: "ACTIVE",
          }),
        });
      }
    });

    // Inject mock JWT into localStorage
    await page.addInitScript(() => {
      window.localStorage.setItem("token", "mock-jwt-token");
    });

    await page.goto("/");
  });

  test("should display dashboard with user info", async ({ page }) => {
    await expect(page.locator("text=My Profile")).toBeVisible();
    await expect(page.locator("text=0x1234...7890")).toBeVisible();
    await expect(page.locator("text=1.2345 ETH")).toBeVisible();
  });

  test("should open alert modal and submit new alert", async ({ page }) => {
    await page.click("text=Deploy Sentinel");
    await expect(page.locator("text=Deploy New Sentinel")).toBeVisible();

    // Fill form
    await page.selectOption("select", "PRICE_ABOVE");
    await page.fill("placeholder=ETH", "BTC");
    await page.fill("placeholder=5000", "60000");

    // Mock successful creation response for the list refresh
    await page.route("**/api/v1/alerts", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([
            {
              id: 101,
              type: "PRICE_ABOVE",
              tokenSymbol: "BTC",
              threshold: 60000,
              status: "ACTIVE",
            },
          ]),
        });
      }
    });

    await page.click("text=Start Sentinel");

    // Verify alert appears in list
    await expect(page.locator("text=PRICE ABOVE")).toBeVisible();
    await expect(page.locator("text=BTC at $60000")).toBeVisible();
  });

  test("should allow updating profile", async ({ page }) => {
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toHaveValue("test@example.com");

    await emailInput.fill("new@example.com");

    // Mock successful update
    await page.route("**/api/v1/users/profile", async (route) => {
      if (route.request().method() === "PATCH") {
        await route.fulfill({ status: 200 });
      } else {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({
            id: 1,
            publicKey: "0x123",
            email: "new@example.com",
            username: "tester",
          }),
        });
      }
    });

    // We don't have a direct "Save" button text, it's "Save Profile"
    await page.click("text=Save Profile");

    // Playwright handles the alert() dialog
    page.on("dialog", (dialog) => dialog.accept());
  });
});
