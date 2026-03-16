import { chromium } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function capture() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Load template relative to this script
  const templatePath = 'file://' + path.join(__dirname, 'og-image-template.html');
  console.log(`Loading template from: ${templatePath}`);

  await page.goto(templatePath);

  // Wait for the webp image to load
  await page.waitForTimeout(1000);

  // Capture OG Preview (1200x630)
  console.log('Capturing og-preview.png (1200x630)...');
  await page.setViewportSize({ width: 1200, height: 630 });
  await page.evaluate(() => {
    const area = document.getElementById('capture-area');
    if (area) {
      area.className = 'og-size';
    }
  });
  await page.screenshot({
    path: 'public/og-preview.png',
    clip: { x: 0, y: 0, width: 1200, height: 630 }
  });

  // Capture Social Preview (1280x640)
  console.log('Capturing social-preview.png (1280x640)...');
  await page.setViewportSize({ width: 1280, height: 640 });
  await page.evaluate(() => {
    const area = document.getElementById('capture-area');
    if (area) {
      area.className = 'social-size';
    }
  });
  await page.screenshot({
    path: 'public/social-preview.png',
    clip: { x: 0, y: 0, width: 1280, height: 640 }
  });

  await browser.close();
  console.log('Done! Images saved to public/ directory.');
}

capture().catch(console.error);
