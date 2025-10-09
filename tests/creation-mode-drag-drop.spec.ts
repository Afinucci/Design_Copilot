import { test, expect } from '@playwright/test';

test.describe('Creation Mode Drag and Drop', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:3000');

    // Wait for the app to load
    await page.waitForSelector('text=Pharmaceutical Facility Design Copilot');

    // Switch to Creation mode
    await page.click('button[aria-label="creation mode"]');
    await page.waitForTimeout(500);
  });

  test('should allow dragging templates from palette to canvas', async ({ page }) => {
    // Wait for templates to load
    await page.waitForSelector('text=Template Library');
    await page.waitForSelector('text=Production');

    // Expand Production category if not already expanded
    const productionHeader = page.locator('text=Production').first();
    await productionHeader.click();
    await page.waitForTimeout(300);

    // Find the first template (Weighing Area)
    const template = page.locator('text=Weighing Area').first();
    await expect(template).toBeVisible();

    // Get the canvas drop zone
    const canvas = page.locator('.react-flow-wrapper').first();
    await expect(canvas).toBeVisible();

    // Log canvas info
    const canvasBox = await canvas.boundingBox();
    console.log('Canvas bounding box:', canvasBox);

    // Get template info
    const templateBox = await template.boundingBox();
    console.log('Template bounding box:', templateBox);

    // Perform drag and drop
    console.log('Starting drag from template to canvas center...');

    if (canvasBox && templateBox) {
      // Calculate center of canvas
      const dropX = canvasBox.x + canvasBox.width / 2;
      const dropY = canvasBox.y + canvasBox.height / 2;

      console.log(`Drop target: (${dropX}, ${dropY})`);

      // Perform drag and drop
      await template.dragTo(canvas, {
        targetPosition: {
          x: canvasBox.width / 2,
          y: canvasBox.height / 2
        }
      });

      await page.waitForTimeout(1000);

      // Check if a node was created on the canvas
      const nodes = page.locator('.react-flow__node');
      const nodeCount = await nodes.count();
      console.log('Nodes on canvas:', nodeCount);

      // Take a screenshot
      await page.screenshot({ path: 'test-results/drag-drop-test.png', fullPage: true });

      // Verify node was created
      expect(nodeCount).toBeGreaterThan(0);
    }
  });

  test('should show drag feedback during drag operation', async ({ page }) => {
    // Setup console listener
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      consoleMessages.push(msg.text());
      console.log('Browser console:', msg.text());
    });

    // Wait for templates to load
    await page.waitForSelector('text=Weighing Area');

    const template = page.locator('text=Weighing Area').first();
    const canvas = page.locator('.react-flow-wrapper').first();

    // Start dragging
    await template.hover();
    await page.mouse.down();
    await page.waitForTimeout(100);

    // Move over canvas
    const canvasBox = await canvas.boundingBox();
    if (canvasBox) {
      await page.mouse.move(canvasBox.x + 300, canvasBox.y + 200, { steps: 10 });
      await page.waitForTimeout(500);

      // Release
      await page.mouse.up();
      await page.waitForTimeout(500);
    }

    // Check console messages
    console.log('All console messages:', consoleMessages);

    // Verify drag start was logged
    const hasDragStart = consoleMessages.some(msg => msg.includes('Drag started'));
    expect(hasDragStart).toBe(true);

    // Check if drop was detected
    const hasDropEvent = consoleMessages.some(msg => msg.includes('Drop event triggered'));
    console.log('Drop event detected:', hasDropEvent);

    await page.screenshot({ path: 'test-results/drag-feedback-test.png' });
  });
});
