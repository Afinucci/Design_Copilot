import { test, expect } from '@playwright/test';

test.describe('Triangle drawing', () => {
  test('user can create a triangle by clicking three points', async ({ page }) => {
    await page.goto('/');

    // Ensure toolbar is visible
    await expect(page.getByTestId('drawing-toolbar')).toBeVisible();

    // Select Triangle tool
    await page.getByTestId('tool-triangle').click();

    const canvas = page.getByTestId('drawing-canvas');
    await expect(canvas).toBeVisible();

    // Click three points on the canvas (rough coords within canvas)
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas not found');

    const p1 = { x: box.x + box.width * 0.3, y: box.y + box.height * 0.3 };
    const p2 = { x: box.x + box.width * 0.6, y: box.y + box.height * 0.3 };
    const p3 = { x: box.x + box.width * 0.45, y: box.y + box.height * 0.55 };

    await page.mouse.click(p1.x, p1.y);
    await page.mouse.click(p2.x, p2.y);
    await page.mouse.click(p3.x, p3.y);

    // After creation, a new overlay box should appear (shape name text present)
    await expect(page.getByText(/New triangle Room/i)).toBeVisible();

    // Assert that an SVG path for polygonal rendering exists
    const polygonPath = page.locator('svg path');
    await expect(polygonPath.first()).toBeVisible();
  });
});


