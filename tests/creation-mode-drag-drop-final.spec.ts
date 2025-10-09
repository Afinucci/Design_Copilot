import { test, expect } from '@playwright/test';

test.describe('Creation Mode Drag and Drop', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // Switch to Creation mode
    const creationButton = page.getByRole('button', { name: /creation/i });
    await creationButton.click();
    await page.waitForTimeout(1000);
  });

  test('should create node when template is dragged onto canvas', async ({ page }) => {
    console.log('🧪 Starting drag-and-drop test...');

    // Wait for templates to load
    await page.waitForSelector('text=Production', { timeout: 10000 });
    console.log('✅ Templates loaded');

    // Find a template to drag (e.g., "Coating")
    const template = page.locator('text=Coating').first();
    await expect(template).toBeVisible();
    console.log('✅ Found "Coating" template');

    // Get canvas element
    const canvas = page.locator('.react-flow').first();
    await expect(canvas).toBeVisible();
    console.log('✅ Canvas is visible');

    // Get bounding boxes
    const templateBox = await template.boundingBox();
    const canvasBox = await canvas.boundingBox();

    if (!templateBox || !canvasBox) {
      throw new Error('Could not get bounding boxes');
    }

    console.log('📍 Template position:', templateBox);
    console.log('📍 Canvas position:', canvasBox);

    // Calculate drop position (center of canvas)
    const dropX = canvasBox.x + canvasBox.width / 2;
    const dropY = canvasBox.y + canvasBox.height / 2;

    console.log('📍 Drop position:', { x: dropX, y: dropY });

    // Listen for console logs
    const consoleLogs: string[] = [];
    page.on('console', (msg) => {
      const text = msg.text();
      consoleLogs.push(text);
      console.log('🖥️  Browser console:', text);
    });

    // Perform drag and drop
    console.log('🎯 Starting drag operation...');
    await template.hover();
    await page.mouse.down();
    console.log('🎯 Mouse down on template');

    await page.mouse.move(dropX, dropY, { steps: 10 });
    console.log('🎯 Moved to drop position');

    await page.waitForTimeout(500);
    await page.mouse.up();
    console.log('🎯 Mouse up - drop complete');

    // Wait for node creation
    await page.waitForTimeout(1000);

    // Check console logs for node creation
    const creationLog = consoleLogs.find(log => log.includes('✅ Creating node'));
    console.log('📋 All console logs:', consoleLogs);

    if (creationLog) {
      console.log('✅ Found node creation log:', creationLog);
    } else {
      console.log('❌ Node creation log NOT found');
    }

    // Check if node appears on canvas
    const nodeElement = page.locator('.react-flow__node').first();

    try {
      await expect(nodeElement).toBeVisible({ timeout: 5000 });
      console.log('✅ Node is visible on canvas!');

      // Get node position
      const nodeBox = await nodeElement.boundingBox();
      console.log('📍 Node position:', nodeBox);

      // Verify node creation log appeared
      expect(creationLog).toBeTruthy();
      console.log('✅ TEST PASSED - Drag and drop works!');
    } catch (error) {
      console.log('❌ Node NOT visible on canvas');
      console.log('❌ Console logs:', consoleLogs);
      throw error;
    }
  });

  test('should create multiple nodes from different templates', async ({ page }) => {
    console.log('🧪 Testing multiple node creation...');

    await page.waitForSelector('text=Production', { timeout: 10000 });

    const canvas = page.locator('.react-flow').first();
    const canvasBox = await canvas.boundingBox();

    if (!canvasBox) {
      throw new Error('Could not get canvas bounding box');
    }

    // Drag first node (Coating)
    const template1 = page.locator('text=Coating').first();
    await template1.hover();
    await page.mouse.down();
    await page.mouse.move(
      canvasBox.x + 200,
      canvasBox.y + 200,
      { steps: 10 }
    );
    await page.mouse.up();
    await page.waitForTimeout(500);

    // Drag second node (Packaging)
    const template2 = page.locator('text=Packaging').first();
    await template2.hover();
    await page.mouse.down();
    await page.mouse.move(
      canvasBox.x + 400,
      canvasBox.y + 200,
      { steps: 10 }
    );
    await page.mouse.up();
    await page.waitForTimeout(500);

    // Check that two nodes exist
    const nodes = page.locator('.react-flow__node');
    const nodeCount = await nodes.count();

    console.log(`✅ Created ${nodeCount} nodes`);
    expect(nodeCount).toBe(2);
    console.log('✅ TEST PASSED - Multiple nodes created successfully!');
  });
});
