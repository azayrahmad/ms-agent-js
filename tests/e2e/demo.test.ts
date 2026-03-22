import { test, expect } from '@playwright/test';

test.describe('Demo Application E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
        localStorage.setItem('msagentjs_skip_tour_welcome', 'true');
    });
    await page.goto('/');
    // Close any other help if it appears
    try {
        await page.click('button:has-text("Close")', { timeout: 2000 });
    } catch (e) {
        // Ignore
    }
  });

  test('should load and switch tabs', async ({ page }) => {
    await expect(page.locator('#panel-about')).toBeVisible();

    await page.click('#tab-assistant');
    await expect(page.locator('#panel-assistant')).toBeVisible();
    await expect(page.locator('#panel-about')).toBeHidden();

    await page.click('#tab-animation');
    await expect(page.locator('#panel-animation')).toBeVisible();

    await page.click('#tab-speech');
    await expect(page.locator('#panel-speech')).toBeVisible();
  });

  test('should select an agent and initialize it', async ({ page }) => {
    // For now, let's just initialize the default agent (Clippit)
    // The button is on the About tab which is active by default
    await page.click('#start-stop-btn');

    // The agent is inside a container appended to body, and it has a shadow root.
    // We target the one NOT in the gallery preview
    await expect(page.locator('body > div:not(#desktop) canvas')).toBeVisible();
  });

  test('should interact with the balloon via "Ask"', async ({ page }) => {
    await page.click('#start-stop-btn');
    const agentContainer = page.locator('body > div:not(#desktop)').last();
    await expect(agentContainer.locator('canvas')).toBeVisible();

    // Go to Speech tab
    await page.click('#tab-speech');

    // Click "Ask"
    await page.click('#ask-btn');

    // Wait for balloon content
    const balloon = agentContainer.locator('.clippy-balloon');
    await expect(balloon).toBeVisible();

    // Wait for typing animation or HTML rendering
    await page.waitForTimeout(500);

    // Type something in the textarea
    const textarea = balloon.locator('textarea');
    await textarea.fill('Hello from Playwright');

    // Select a choice (Ask button)
    await balloon.locator('button.custom-button:has-text("Ask")').click();

    // Verify balloon hides after interaction
    await expect(balloon).toBeHidden();
  });

  test('visual regression of initial load', async ({ page }) => {
    await expect(page).toHaveScreenshot('initial-load.png', {
        mask: [page.locator('.debug-window')], // Mask dynamic debug info
        threshold: 0.1
    });
  });

  test('visual regression of agent and balloon', async ({ page }) => {
    await page.click('#start-stop-btn');
    const agentContainer = page.locator('body > div:not(#desktop)').last();
    await page.click('#tab-speech');
    await page.click('#ask-btn');

    const balloon = agentContainer.locator('.clippy-balloon');
    await expect(balloon).toBeVisible();

    // Wait for typing animation or text to settle
    await page.waitForTimeout(1000);

    await expect(page).toHaveScreenshot('agent-and-balloon.png', {
        mask: [page.locator('.debug-window')],
        threshold: 0.1
    });
  });
});
