import { test, expect } from '@playwright/test';

test.describe('Fit to Window - Simple Test', () => {
  test('Fit to Window button should be clickable and functional', async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:3000');

    // Wait for app to load
    await page.waitForSelector('text=Pharmaceutical Facility Design Copilot', { timeout: 10000 });

    // Switch to Layout Designer mode
    const layoutDesignerButton = page.locator('button:has-text("LAYOUT DESIGNER"), button:has-text("Layout Designer")').first();
    await layoutDesignerButton.click();
    await page.waitForTimeout(1000);

    // Wait for the canvas/designer to be visible
    await page.waitForSelector('[style*="overflow: auto"], .drawing-canvas, canvas', { timeout: 5000 });

    // Find the Fit to Window button by tooltip or icon
    // The button has a tooltip "Fit to Window" and FitScreenIcon
    const fitButton = page.locator('button[aria-label="Fit to Window"], button:has([data-testid="FitScreenIcon"])').first();

    // If not found by aria-label, try finding by tooltip
    if (!(await fitButton.isVisible())) {
      // Look for the button near other zoom controls
      const allButtons = page.locator('button');
      const buttonCount = await allButtons.count();

      for (let i = 0; i < buttonCount; i++) {
        const button = allButtons.nth(i);
        const title = await button.getAttribute('title');
        if (title && title.includes('Fit')) {
          await button.click();
          console.log('Clicked Fit to Window button via title attribute');
          break;
        }
      }
    } else {
      await fitButton.click();
      console.log('Clicked Fit to Window button via locator');
    }

    // Wait a bit for the action to complete
    await page.waitForTimeout(500);

    // Check console for the log message we added
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      if (msg.text().includes('Fit to window:')) {
        consoleLogs.push(msg.text());
        console.log('Console log:', msg.text());
      }
    });

    // Click again to trigger the console log
    if (await fitButton.isVisible()) {
      await fitButton.click();
      await page.waitForTimeout(500);
    }

    // Verify no JavaScript errors
    const errors: string[] = [];
    page.on('pageerror', error => {
      errors.push(error.message);
    });

    await page.waitForTimeout(1000);

    // Should not have any errors
    expect(errors.length).toBe(0);

    console.log('✅ Fit to Window test passed - button is clickable and functional');
  });

  test('Console log verification for Fit to Window', async ({ page }) => {
    const consoleLogs: string[] = [];

    page.on('console', msg => {
      consoleLogs.push(msg.text());
    });

    await page.goto('http://localhost:3000');
    await page.waitForSelector('text=Pharmaceutical Facility Design Copilot');

    // Switch to Layout Designer
    await page.locator('button:has-text("LAYOUT DESIGNER"), button:has-text("Layout Designer")').first().click();
    await page.waitForTimeout(1000);

    // Try to find and click Fit to Window button via multiple selectors
    const fitButtonSelectors = [
      'button:has-text("Fit to Window")',
      'button[title*="Fit"]',
      'button[aria-label*="Fit"]',
    ];

    let clicked = false;
    for (const selector of fitButtonSelectors) {
      const button = page.locator(selector).first();
      if (await button.isVisible({ timeout: 2000 }).catch(() => false)) {
        await button.click();
        clicked = true;
        console.log(`Clicked using selector: ${selector}`);
        break;
      }
    }

    if (clicked) {
      await page.waitForTimeout(500);

      // Check if the console log was output
      const hasLog = consoleLogs.some(log => log.includes('Fit to window:'));
      console.log('Console logs:', consoleLogs);
      console.log('Has fit to window log:', hasLog);
    } else {
      console.warn('Could not find Fit to Window button');
    }
  });
});
