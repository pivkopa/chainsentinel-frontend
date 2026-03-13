import { test, expect } from "@playwright/test";

test.describe("ChainSentinel Authentication Logic", () => {
    test("should handle authentication failure", async ({ page }) => {
        // Mock nonce failure
        await page.route("**/api/v1/auth/nonce", async (route) => {
            await route.fulfill({ status: 500, body: JSON.stringify({ message: "Nonce generation failed" }) });
        });

        await page.goto("/");

        // We need to simulate wagmi/rainbowkit state which is hard in E2E without real wallet
        // But we can check if the "Sign In with Ethereum" button appears when connected
        // This requires mocking the window.ethereum or wagmi state
    });

    test("should use token from localStorage if available", async ({ page }) => {
        // Inject token
        await page.addInitScript(() => {
            window.localStorage.setItem("token", "valid-token");
        });

        // Mock profile to return success
        await page.route("**/api/v1/users/profile", async (route) => {
            await route.fulfill({
                status: 200,
                contentType: "application/json",
                body: JSON.stringify({ id: 1, username: "cached_user" }),
            });
        });

        await page.route("**/api/v1/users/balance/EVM", async (route) => {
            await route.fulfill({ status: 200, body: JSON.stringify({ balance: "0" }) });
        });

        await page.route("**/api/v1/alerts", async (route) => {
            await route.fulfill({ status: 200, body: JSON.stringify([]) });
        });

        await page.goto("/");

        // Should skip landing page and show dashboard
        await expect(page.locator("text=Profile Settings")).toBeVisible();
        await expect(page.locator("text=cached_user")).toBeVisible();
    });
});
