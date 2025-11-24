import { test, expect } from '@playwright/test';

test('test drag and drop in creation mode', async ({ page }) => {
  // Navigate to the application
  await page.goto('http://localhost:3000');

  // Wait for the page to load
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Take a screenshot of the initial state
  await page.screenshot({ path: 'test-results/01-initial-state.png' });

  // Check if we're in creation mode
  const modeIndicator = page.locator('text=/creation/i').first();
  if (await modeIndicator.isVisible().catch(() => false)) {
    console.log('Already in creation mode');
  }

  // Wait for templates to load in the palette
  await page.waitForSelector('[draggable="true"]', { timeout: 10000 });

  // Take screenshot of palette
  await page.screenshot({ path: 'test-results/02-palette-loaded.png' });

  // Find a draggable item (e.g., "Weighing Area")
  const draggableItem = page.locator('[draggable="true"]').first();
  const itemText = await draggableItem.textContent();
  console.log('Found draggable item:', itemText);

  // Get the canvas area
  const canvas = page.locator('.react-flow').first();
  await expect(canvas).toBeVisible();

  // Get bounding boxes
  const itemBox = await draggableItem.boundingBox();
  const canvasBox = await canvas.boundingBox();

  if (!itemBox || !canvasBox) {
    throw new Error('Could not get bounding boxes');
  }

  console.log('Item box:', itemBox);
  console.log('Canvas box:', canvasBox);

  // Calculate drop position (center of canvas)
  const dropX = canvasBox.x + canvasBox.width / 2;
  const dropY = canvasBox.y + canvasBox.height / 2;

  console.log('Drop position:', { dropX, dropY });

  // Perform drag and drop
  console.log('Starting drag...');
  await draggableItem.hover();
  await page.mouse.down();

  await page.screenshot({ path: 'test-results/03-drag-started.png' });

  console.log('Moving to canvas...');
  await page.mouse.move(dropX, dropY, { steps: 10 });

  await page.screenshot({ path: 'test-results/04-over-canvas.png' });

  console.log('Dropping...');
  await page.mouse.up();

  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'test-results/05-after-drop.png' });

  // Check if a node was created
  const nodes = page.locator('.react-flow__node');
  const nodeCount = await nodes.count();
  console.log('Node count after drop:', nodeCount);

  if (nodeCount === 0) {
    console.log('❌ No nodes created - drag and drop failed');

    // Check console logs
    const logs: string[] = [];
    page.on('console', msg => logs.push(msg.text()));

    console.log('Browser console logs:', logs);
  } else {
    console.log('✅ Node created successfully');
  }

  expect(nodeCount).toBeGreaterThan(0);
});
