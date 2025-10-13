import { test, expect } from '@playwright/test';

test.describe('Flow Type Dropdown Test', () => {
  test('should allow changing flow type in relationship editor', async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:3000');

    // Wait for the app to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    console.log('✓ App loaded');

    // Switch to CREATION mode if not already there
    const creationButton = page.locator('button:has-text("CREATION")');
    if (await creationButton.count() > 0) {
      await creationButton.click();
      console.log('✓ Switched to CREATION mode');
      await page.waitForTimeout(1000);
    }

    // Find and drag Weighing Area node
    const weighingArea = page.locator('text=Weighing Area').first();
    await weighingArea.waitFor({ state: 'visible', timeout: 5000 });

    const weighingBox = await weighingArea.boundingBox();
    if (weighingBox) {
      await page.mouse.move(weighingBox.x + weighingBox.width / 2, weighingBox.y + weighingBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(400, 300);
      await page.mouse.up();
      console.log('✓ Dragged Weighing Area');
    }

    await page.waitForTimeout(500);

    // Find and drag Analytical Lab node
    const analyticalLab = page.locator('text=Analytical Lab').first();
    await analyticalLab.waitFor({ state: 'visible', timeout: 5000 });

    const labBox = await analyticalLab.boundingBox();
    if (labBox) {
      await page.mouse.move(labBox.x + labBox.width / 2, labBox.y + labBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(700, 300);
      await page.mouse.up();
      console.log('✓ Dragged Analytical Lab');
    }

    await page.waitForTimeout(1000);

    // Take screenshot of canvas with nodes
    await page.screenshot({ path: '.playwright-mcp/nodes-placed.png', fullPage: true });

    // Try to create an edge by clicking on the handle of the first node
    const canvas = page.locator('.react-flow__viewport');

    // Look for connection handles on the Weighing Area node
    const sourceHandle = page.locator('[data-handleid][data-nodeid*="weighing"]').first();

    if (await sourceHandle.count() > 0) {
      console.log('✓ Found source handle');
      await sourceHandle.click();
      await page.waitForTimeout(500);
    } else {
      // Alternative: try to connect by dragging from node to node
      console.log('⚠ No handle found, trying to drag between nodes');
      await page.mouse.move(450, 300); // Near the first node's right edge
      await page.mouse.down();
      await page.mouse.move(650, 300); // To the second node's left edge
      await page.mouse.up();
    }

    await page.waitForTimeout(1000);

    // Look for an edge on the canvas
    const edge = page.locator('.react-flow__edge').first();

    if (await edge.count() === 0) {
      console.log('⚠ No edge created automatically, checking for context menu or dialog');

      // Check if there's a relationship dialog or menu
      const dialog = page.locator('[role="dialog"]');
      if (await dialog.count() > 0) {
        console.log('✓ Found dialog for creating relationship');

        // Look for Material Flow option
        const materialFlowOption = page.locator('text=Material Flow');
        if (await materialFlowOption.count() > 0) {
          await materialFlowOption.click();
          console.log('✓ Selected Material Flow');
        }

        // Fill in reason if required
        const reasonField = page.locator('input[placeholder*="reason" i], textarea[placeholder*="reason" i]');
        if (await reasonField.count() > 0) {
          await reasonField.fill('Testing material flow connection');
          console.log('✓ Filled reason field');
        }

        // Click create/save button
        const saveButton = page.locator('button:has-text("Save"), button:has-text("Create"), button:has-text("Add")');
        if (await saveButton.count() > 0) {
          await saveButton.click();
          console.log('✓ Clicked save button');
        }

        await page.waitForTimeout(1000);
      }
    }

    // Now try to find and click on the edge to open the edit dialog
    const edgeElement = page.locator('.react-flow__edge').first();

    if (await edgeElement.count() > 0) {
      await edgeElement.click();
      console.log('✓ Clicked on edge');
      await page.waitForTimeout(1000);

      // Take screenshot after clicking edge
      await page.screenshot({ path: '.playwright-mcp/edge-clicked.png', fullPage: true });

      // Wait for the relationship dialog to open
      const relationshipDialog = page.locator('[role="dialog"]:has-text("Relationship")');
      await relationshipDialog.waitFor({ state: 'visible', timeout: 5000 });
      console.log('✓ Relationship dialog opened');

      // Take screenshot of dialog
      await page.screenshot({ path: '.playwright-mcp/relationship-dialog-view.png', fullPage: true });

      // Click Edit button
      const editButton = page.locator('button:has-text("Edit")').last();
      await editButton.click();
      console.log('✓ Clicked Edit button');
      await page.waitForTimeout(500);

      // Take screenshot of edit mode
      await page.screenshot({ path: '.playwright-mcp/relationship-dialog-edit.png', fullPage: true });

      // Find the Flow Type dropdown
      const flowTypeSection = page.locator('text=Flow Type').locator('..');
      await flowTypeSection.scrollIntoViewIfNeeded();

      // Get current value
      const currentFlowType = await flowTypeSection.locator('.MuiSelect-select').textContent();
      console.log(`Current Flow Type: "${currentFlowType}"`);

      // Click on the Flow Type dropdown
      const flowTypeDropdown = flowTypeSection.locator('.MuiSelect-select');
      await flowTypeDropdown.click();
      console.log('✓ Clicked Flow Type dropdown');
      await page.waitForTimeout(500);

      // Take screenshot with dropdown open
      await page.screenshot({ path: '.playwright-mcp/flowtype-dropdown-open.png', fullPage: true });

      // Try to select a different option
      const finishedProductOption = page.locator('[role="option"]:has-text("Finished Product")');
      const wasteOption = page.locator('[role="option"]:has-text("Waste")');
      const rawMaterialOption = page.locator('[role="option"]:has-text("Raw Material")');

      if (await finishedProductOption.count() > 0) {
        console.log('Found "Finished Product" option, clicking...');
        await finishedProductOption.click();
        await page.waitForTimeout(500);

        // Check if the value changed
        const newFlowType = await flowTypeSection.locator('.MuiSelect-select').textContent();
        console.log(`New Flow Type after clicking: "${newFlowType}"`);

        // Take screenshot after selection
        await page.screenshot({ path: '.playwright-mcp/flowtype-after-selection.png', fullPage: true });

        if (newFlowType === currentFlowType) {
          console.error('❌ ISSUE FOUND: Flow Type did not change after selection!');
          console.log('Current value is still:', newFlowType);
        } else {
          console.log('✓ Flow Type changed successfully');
        }

      } else {
        console.log('Options available:', await page.locator('[role="option"]').allTextContents());
      }

      // Wait a bit to see the final state
      await page.waitForTimeout(2000);

      // Final screenshot
      await page.screenshot({ path: '.playwright-mcp/final-state.png', fullPage: true });

    } else {
      console.log('❌ No edge found to test with');
    }
  });
});
