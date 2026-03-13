import { test, expect } from "@playwright/test";

test.describe("ChainSentinel Functional Tests", () => {
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
                    body: JSON.stringify([
                        {
                            id: 1,
                            type: "PRICE_ABOVE",
                            tokenSymbol: "ETH",
                            threshold: 2500,
                            status: "ACTIVE",
                        },
                    ]),
                });
            }
        });

        await page.route("**/api/v1/alerts/1/logs", async (route) => {
            await route.fulfill({
                status: 200,
                contentType: "application/json",
                body: JSON.stringify([
                    { id: 1, message: "Price crossed 2500", value: "2501", createdAt: new Date() },
                ]),
            });
        });
    });

    test("should show landing page when not logged in", async ({ page }) => {
        // Ensure no token
        await page.addInitScript(() => {
            window.localStorage.removeItem("token");
        });
        await page.goto("/");
        await expect(page.locator("h1")).toContainText("ON-CHAIN SENTINEL");
        await expect(page.locator("text=Connect your wallet")).toBeVisible();
    });

    test("should logout successfully", async ({ page }) => {
        // Login first
        await page.addInitScript(() => {
            window.localStorage.setItem("token", "mock-jwt-token");
        });
        await page.goto("/");

        // Click Logout
        await page.click("text=LOGOUT");

        // Should see landing page
        await expect(page.locator("h1")).toContainText("ON-CHAIN SENTINEL");

        // Check localStorage
        const token = await page.evaluate(() => window.localStorage.getItem("token"));
        expect(token).toBeNull();
    });

    test("should delete an alert", async ({ page }) => {
        // Login
        await page.addInitScript(() => {
            window.localStorage.setItem("token", "mock-jwt-token");
        });

        // Mock delete request
        await page.route("**/api/v1/alerts/1", async (route) => {
            expect(route.request().method()).toBe("DELETE");
            await route.fulfill({ status: 204 });
        });

        // Mock empty list after deletion
        let deleted = false;
        await page.route("**/api/v1/alerts", async (route) => {
            if (route.request().method() === "GET") {
                await route.fulfill({
                    status: 200,
                    contentType: "application/json",
                    body: JSON.stringify(deleted ? [] : [{
                        id: 1,
                        type: "PRICE_ABOVE",
                        tokenSymbol: "ETH",
                        threshold: 2500,
                        status: "ACTIVE",
                    }]),
                });
            }
        });

        await page.goto("/");

        // Handle the confirm dialog
        page.once("dialog", dialog => {
            deleted = true;
            dialog.accept();
        });

        // Find the delete button (it's inside the alert card)
        await page.locator("button:has(svg)").filter({ has: page.locator(".lucide-trash2") }).click();

        // Verify it's gone
        await expect(page.locator("text=No active sentinels")).toBeVisible();
    });

    test("should show event logs for active alerts", async ({ page }) => {
        await page.addInitScript(() => {
            window.localStorage.setItem("token", "mock-jwt-token");
        });
        await page.goto("/");

        await expect(page.locator("text=Event Log")).toBeVisible();
        await expect(page.locator("text=Price crossed 2500")).toBeVisible();
        await expect(page.locator("text=2501")).toBeVisible();
    });

    test("should cancel sentinel deployment", async ({ page }) => {
        await page.addInitScript(() => {
            window.localStorage.setItem("token", "mock-jwt-token");
        });
        await page.goto("/");

        await page.click("text=Deploy Sentinel");
        await expect(page.locator("h2:has-text('Deploy Sentinel')")).toBeVisible();

        await page.click("text=Cancel");
        await expect(page.locator("h2:has-text('Deploy Sentinel')")).not.toBeVisible();
    });
});
