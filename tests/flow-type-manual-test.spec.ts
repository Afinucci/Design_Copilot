import { test, expect } from '@playwright/test';

test.describe('Flow Type Manual Test', () => {
  test('inspect flow type dropdown behavior', async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    console.log('✓ App loaded');

    // Switch to CREATION mode
    const creationButton = page.locator('button:has-text("CREATION")');
    if (await creationButton.count() > 0) {
      await creationButton.click();
      console.log('✓ Switched to CREATION mode');
      await page.waitForTimeout(1000);
    }

    // Take initial screenshot
    await page.screenshot({ path: '.playwright-mcp/initial-state.png', fullPage: true });

    // Look for any existing edges on the canvas
    const existingEdges = page.locator('.react-flow__edge');
    const edgeCount = await existingEdges.count();

    console.log(`Found ${edgeCount} existing edges`);

    if (edgeCount > 0) {
      // Click on the first edge
      await existingEdges.first().click();
      console.log('✓ Clicked on existing edge');
      await page.waitForTimeout(1000);
    } else {
      console.log('⚠ No existing edges found. Please create a Material Flow relationship manually.');
      console.log('Waiting 30 seconds for you to create a relationship...');

      // Wait for user to create a relationship
      await page.waitForTimeout(30000);

      // Check again for edges
      const newEdgeCount = await existingEdges.count();
      console.log(`Now found ${newEdgeCount} edges`);

      if (newEdgeCount > 0) {
        await existingEdges.first().click();
        console.log('✓ Clicked on edge');
        await page.waitForTimeout(1000);
      }
    }

    // Wait for dialog
    const dialog = page.locator('[role="dialog"]');
    if (await dialog.waitFor({ state: 'visible', timeout: 5000 }).catch(() => false)) {
      console.log('✓ Dialog appeared');
      await page.screenshot({ path: '.playwright-mcp/dialog-opened.png', fullPage: true });

      // Check the relationship type
      const relationshipTypeText = await dialog.locator('text=Relationship Type').locator('..').textContent();
      console.log('Relationship Type section:', relationshipTypeText);

      // Look for Edit button
      const editButton = page.locator('button:has-text("Edit")');
      if (await editButton.count() > 0) {
        await editButton.click();
        console.log('✓ Clicked Edit button');
        await page.waitForTimeout(500);
        await page.screenshot({ path: '.playwright-mcp/edit-mode.png', fullPage: true });
      }

      // Find Flow Type section
      const flowTypeLabel = page.locator('text=Flow Type').first();

      if (await flowTypeLabel.count() > 0) {
        console.log('✓ Found Flow Type section');

        // Scroll into view
        await flowTypeLabel.scrollIntoViewIfNeeded();

        // Get the parent container
        const flowTypeSection = flowTypeLabel.locator('..');

        // Find the Select element
        const selectElement = flowTypeSection.locator('.MuiSelect-select');

        // Get current value
        const currentValue = await selectElement.textContent();
        console.log(`📋 Current Flow Type value: "${currentValue}"`);

        // Take screenshot before clicking
        await page.screenshot({ path: '.playwright-mcp/before-click-dropdown.png', fullPage: true });

        // Click to open dropdown
        await selectElement.click();
        console.log('✓ Clicked Flow Type dropdown');
        await page.waitForTimeout(1000);

        // Take screenshot with dropdown open
        await page.screenshot({ path: '.playwright-mcp/dropdown-opened.png', fullPage: true });

        // Get all menu items
        const menuItems = page.locator('[role="option"]');
        const itemCount = await menuItems.count();
        console.log(`Found ${itemCount} options in dropdown`);

        const allOptions = await menuItems.allTextContents();
        console.log('Available options:', allOptions);

        // Try to click on a different option (not the current one)
        let targetOption = null;
        for (let i = 0; i < itemCount; i++) {
          const optionText = await menuItems.nth(i).textContent();
          if (optionText && optionText.trim() !== currentValue?.trim() && !optionText.includes('Select')) {
            targetOption = menuItems.nth(i);
            console.log(`Selecting option: "${optionText}"`);
            break;
          }
        }

        if (targetOption) {
          const targetText = await targetOption.textContent();

          // Click the option
          await targetOption.click();
          console.log(`✓ Clicked on "${targetText}"`);
          await page.waitForTimeout(1000);

          // Take screenshot after clicking
          await page.screenshot({ path: '.playwright-mcp/after-option-click.png', fullPage: true });

          // Check if value changed
          const newValue = await selectElement.textContent();
          console.log(`📋 New Flow Type value: "${newValue}"`);

          if (newValue === currentValue) {
            console.error('❌ BUG CONFIRMED: Flow Type value did NOT change!');
            console.error(`  Expected: "${targetText}"`);
            console.error(`  Got: "${newValue}"`);
          } else {
            console.log('✅ Flow Type value changed successfully');
          }

        } else {
          console.log('⚠ Could not find a different option to select');
        }

      } else {
        console.log('⚠ Flow Type section not found - might not be a Material/Personnel Flow relationship');
      }

      // Final screenshot
      await page.screenshot({ path: '.playwright-mcp/final.png', fullPage: true });

      // Keep browser open for inspection
      await page.waitForTimeout(5000);
    } else {
      console.log('❌ No dialog appeared after clicking edge');
    }
  });
});
