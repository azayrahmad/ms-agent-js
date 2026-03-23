import { test, expect } from '@playwright/test';

test.describe('Visual Regressions', () => {
  test.beforeEach(async ({ page }) => {
    // Disable the welcome tour via localStorage
    await page.addInitScript(() => {
        localStorage.setItem('msagentjs_skip_tour_welcome', 'true');
      });
    await page.goto('/');
  });

  test('Clippit visual states', async ({ page }) => {
    const status = page.locator('#dash-state');

    // Load Clippy
    await page.locator('#start-stop-btn').click();
    await expect(status).not.toHaveText('-', { timeout: 30000 });

    // Initial Clippy state (Idle)
    const agentContainer = page.locator('body > div:has(> canvas)');
    const clippitCanvas = agentContainer.locator('canvas');
    await expect(clippitCanvas).toBeVisible();

    // Take screenshot of Clippy in Idle state
    await expect(clippitCanvas).toHaveScreenshot('clippit-idle.png', { threshold: 0.1 });

    // Trigger Speak interaction
    await page.locator('#tab-speech').click();
    await page.locator('#speak-text').fill('Testing visual regression');
    await page.locator('#speak-btn').click();

    // Verify balloon is visible and take screenshot
    const balloon = agentContainer.locator('.clippy-balloon');
    await expect(balloon).toBeVisible();

    // Wait for balloon content to fully render
    await page.waitForTimeout(1000);

    // Take snapshot of the agent and balloon together
    await expect(agentContainer).toHaveScreenshot('clippit-speaking.png', { threshold: 0.1 });
  });
});
