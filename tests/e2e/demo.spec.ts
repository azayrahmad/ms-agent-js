import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // Disable the welcome tour via localStorage
  await page.addInitScript(() => {
    localStorage.setItem('msagentjs_skip_tour_welcome', 'true');
  });
  await page.goto('/');
});

test.describe('Demo App', () => {
  test('should load the demo page', async ({ page }) => {
    await expect(page).toHaveTitle(/MSAgentJS/);
    await expect(page.locator('.control-panel .title-bar-text')).toContainText('MS Agent JS Control Panel');
  });

  test('should switch tabs', async ({ page }) => {
    const assistantTab = page.locator('#tab-assistant');
    await assistantTab.click();
    await expect(assistantTab).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#panel-assistant')).toBeVisible();

    const speechTab = page.locator('#tab-speech');
    await speechTab.click();
    await expect(speechTab).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#panel-speech')).toBeVisible();
  });

  test('should load Clippy and respond to click', async ({ page }) => {
    // Initial state: No agent loaded
    const status = page.locator('#dash-state');
    await expect(status).toHaveText('-');

    // Load Clippy (click Start button on About tab)
    const startBtn = page.locator('#start-stop-btn');
    await startBtn.click();

    // Wait for loading to complete
    await expect(status).not.toHaveText('-', { timeout: 30000 });
    await expect(status).not.toHaveText('Loading...', { timeout: 30000 });

    // Find the main agent canvas
    const agentCanvas = page.locator('body > div > canvas');
    await expect(agentCanvas).toBeVisible();

    // Click the agent to trigger animation
    await agentCanvas.click();

    // Verify status shows activity
    const animName = page.locator('#dash-anim');
    await expect(animName).not.toHaveText('-', { timeout: 10000 });
  });

  test('should show speech balloon when using Speak', async ({ page }) => {
    // Load agent
    await page.locator('#start-stop-btn').click();
    await expect(page.locator('#dash-state')).not.toHaveText('-', { timeout: 30000 });

    // Switch to Speech tab
    await page.locator('#tab-speech').click();

    // Type in speech box
    const speechInput = page.locator('#speak-text');
    await speechInput.fill('Hello Playwright!');

    // Click Speak button
    await page.locator('#speak-btn').click();

    // Verify balloon is visible
    const agentContainer = page.locator('body > div:has(> canvas)');
    const balloon = agentContainer.locator('.clippy-balloon');
    await expect(balloon).toBeVisible();
    await expect(balloon).toContainText('Hello Playwright!');
  });
});
