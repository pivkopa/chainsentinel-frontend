import { test, expect, devices } from "@playwright/test";

test.describe("ChainSentinel Responsive Layout", () => {
    test.use({ ...devices["iPhone 13"] });

    test.beforeEach(async ({ page }) => {
        // Inject mock JWT into localStorage
        await page.addInitScript(() => {
            window.localStorage.setItem("token", "mock-jwt-token");
        });

        // Mock the backend API responses
        await page.route("**/api/v1/users/profile", async (route) => {
            await route.fulfill({
                status: 200,
                contentType: "application/json",
                body: JSON.stringify({
                    id: 1,
                    publicKey: "0x123",
                    email: "test@example.com",
                    username: "tester",
                }),
            });
        });

        await page.route("**/api/v1/users/balance/EVM", async (route) => {
            await route.fulfill({
                status: 200,
                contentType: "application/json",
                body: JSON.stringify({ balance: "1.23", unit: "ETH" }),
            });
        });

        await page.route("**/api/v1/alerts", async (route) => {
            await route.fulfill({
                status: 200,
                contentType: "application/json",
                body: JSON.stringify([]),
            });
        });
    });

    test("should display mobile layout correctly", async ({ page }) => {
        await page.goto("/");

        // Verify header title is visible
        await expect(page.locator("text=CHAINSENTINEL")).toBeVisible();

        // Verify profile section is visible (stacked in mobile)
        await expect(page.locator("text=Profile Settings")).toBeVisible();

        // Verify modal still works in mobile
        await page.click("text=Deploy Sentinel");
        await expect(page.locator("h2:has-text('Deploy Sentinel')")).toBeVisible();

        // Check if modal fits within viewport (basic check)
        const modal = page.locator(".bg-zinc-900.border.border-zinc-800.rounded-3xl");
        const box = await modal.boundingBox();
        expect(box?.width).toBeLessThanOrEqual(390); // iPhone 13 width
    });
});
