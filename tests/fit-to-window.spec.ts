import { test, expect } from '@playwright/test';

test.describe('Fit to Window Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Wait for the app to load
    await expect(page.getByText('Pharmaceutical Facility Design Copilot')).toBeVisible();

    // Switch to Layout Designer mode
    await page.getByRole('button', { name: /layout designer/i }).click();
    await page.waitForTimeout(500);
  });

  test('should fit shapes to window when button is clicked', async ({ page }) => {
    // Add some shapes to the canvas
    console.log('Adding shapes to canvas...');

    // Click on a shape from the shape library
    const shapeLibrary = page.locator('[aria-label="shape library"], .shape-library').first();
    await shapeLibrary.waitFor({ state: 'visible', timeout: 10000 });

    // Add a rectangle shape
    const rectangleShape = page.locator('text=Rectangle, text=/Rectangle/i').first();
    if (await rectangleShape.isVisible()) {
      await rectangleShape.click();
    }

    // Click on canvas to place first shape
    const canvas = page.locator('canvas, [data-testid="drawing-canvas"]').first();
    await canvas.click({ position: { x: 100, y: 100 } });

    // Add another shape at a different position
    await canvas.click({ position: { x: 500, y: 500 } });

    // Add a third shape
    await canvas.click({ position: { x: 1000, y: 800 } });

    await page.waitForTimeout(500);

    // Get initial scroll and zoom state
    const scrollContainer = page.locator('[style*="overflow: auto"]').first();
    const initialScrollLeft = await scrollContainer.evaluate(el => (el as HTMLElement).scrollLeft);
    const initialScrollTop = await scrollContainer.evaluate(el => (el as HTMLElement).scrollTop);

    console.log(`Initial scroll: left=${initialScrollLeft}, top=${initialScrollTop}`);

    // Find and click the "Fit to Window" button
    console.log('Clicking Fit to Window button...');
    const fitButton = page.getByRole('button', { name: /fit to window/i }).or(
      page.locator('button[aria-label*="Fit"]').or(
        page.locator('button').filter({ has: page.locator('svg') }).filter({ hasText: /fit/i })
      )
    );

    await fitButton.first().click();
    await page.waitForTimeout(500);

    // Verify scroll position changed
    const newScrollLeft = await scrollContainer.evaluate(el => (el as HTMLElement).scrollLeft);
    const newScrollTop = await scrollContainer.evaluate(el => (el as HTMLElement).scrollTop);

    console.log(`New scroll: left=${newScrollLeft}, top=${newScrollTop}`);

    // Verify that the scroll position has changed (shapes should be centered)
    expect(Math.abs(newScrollLeft - initialScrollLeft)).toBeGreaterThan(10);
    expect(Math.abs(newScrollTop - initialScrollTop)).toBeGreaterThan(10);

    // Verify shapes are visible in viewport
    // (Shapes should be centered and visible after fit to window)
    const viewportWidth = await scrollContainer.evaluate(el => (el as HTMLElement).clientWidth);
    const viewportHeight = await scrollContainer.evaluate(el => (el as HTMLElement).clientHeight);

    console.log(`Viewport: width=${viewportWidth}, height=${viewportHeight}`);

    // The scroll position should place content in the center
    // (This is a rough check - in a real scenario, you'd verify the shapes are actually visible)
    expect(newScrollLeft).toBeGreaterThanOrEqual(0);
    expect(newScrollTop).toBeGreaterThanOrEqual(0);
  });

  test('should handle fit to window with no shapes', async ({ page }) => {
    // Click Fit to Window without any shapes
    const fitButton = page.getByRole('button', { name: /fit to window/i }).or(
      page.locator('button[aria-label*="Fit"]')
    );

    // Should not throw error
    await fitButton.first().click();
    await page.waitForTimeout(300);

    // Verify no error occurred (page should still be functional)
    await expect(page.getByText('Layout Designer')).toBeVisible();
  });

  test('should handle fit to window with single shape', async ({ page }) => {
    // Add a single shape
    const canvas = page.locator('canvas, [data-testid="drawing-canvas"]').first();
    await canvas.click({ position: { x: 2000, y: 2000 } });

    await page.waitForTimeout(500);

    // Click Fit to Window
    const fitButton = page.getByRole('button', { name: /fit to window/i }).or(
      page.locator('button[aria-label*="Fit"]')
    );
    await fitButton.first().click();
    await page.waitForTimeout(500);

    // Verify the canvas scrolled to show the shape
    const scrollContainer = page.locator('[style*="overflow: auto"]').first();
    const scrollLeft = await scrollContainer.evaluate(el => (el as HTMLElement).scrollLeft);
    const scrollTop = await scrollContainer.evaluate(el => (el as HTMLElement).scrollTop);

    // Shape at 2000, 2000 should cause non-zero scroll
    expect(scrollLeft).toBeGreaterThan(0);
    expect(scrollTop).toBeGreaterThan(0);
  });
});
