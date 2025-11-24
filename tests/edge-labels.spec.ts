import { test, expect } from '@playwright/test';

test.describe('Edge Labels', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // Switch to Creation mode
    const creationButton = page.getByRole('button', { name: /creation/i });
    await creationButton.click();
    await page.waitForTimeout(500);
  });

  test('should display relationship type label on newly created edge', async ({ page }) => {
    // Drag Compression node from palette to canvas
    const compressionTemplate = page.locator('text=Compression').first();
    const canvas = page.locator('.react-flow__renderer');

    await compressionTemplate.dragTo(canvas, {
      targetPosition: { x: 400, y: 300 }
    });
    await page.waitForTimeout(500);

    // Drag Granulation node from palette to canvas
    const granulationTemplate = page.locator('text=Granulation').first();
    await granulationTemplate.dragTo(canvas, {
      targetPosition: { x: 700, y: 300 }
    });
    await page.waitForTimeout(500);

    // Find the nodes on canvas
    const compressionNode = page.locator('[data-id^="node-compression"]').first();
    const granulationNode = page.locator('[data-id^="node-granulation"]').first();

    // Get bounding boxes for connection
    const compressionBox = await compressionNode.boundingBox();
    const granulationBox = await granulationNode.boundingBox();

    if (!compressionBox || !granulationBox) {
      throw new Error('Could not find nodes on canvas');
    }

    // Connect the nodes by dragging from Compression to Granulation
    await page.mouse.move(
      compressionBox.x + compressionBox.width,
      compressionBox.y + compressionBox.height / 2
    );
    await page.mouse.down();
    await page.mouse.move(
      granulationBox.x,
      granulationBox.y + granulationBox.height / 2,
      { steps: 10 }
    );
    await page.mouse.up();
    await page.waitForTimeout(1000);

    // Close the relationship edit dialog if it appears
    const dialogCloseButton = page.getByRole('button', { name: /close/i });
    if (await dialogCloseButton.isVisible()) {
      await dialogCloseButton.click();
      await page.waitForTimeout(500);
    }

    // Check if the edge label is visible
    const edgeLabel = page.locator('.react-flow__edge-text, text:has-text("Adjacent To")');
    await expect(edgeLabel).toBeVisible({ timeout: 5000 });

    // Verify the label text is correct
    const labelText = await edgeLabel.textContent();
    expect(labelText).toContain('Adjacent To');
  });

  test('should update edge label when relationship type changes', async ({ page }) => {
    // Create nodes and connection (similar to previous test)
    const compressionTemplate = page.locator('text=Compression').first();
    const canvas = page.locator('.react-flow__renderer');

    await compressionTemplate.dragTo(canvas, {
      targetPosition: { x: 400, y: 300 }
    });
    await page.waitForTimeout(500);

    const granulationTemplate = page.locator('text=Granulation').first();
    await granulationTemplate.dragTo(canvas, {
      targetPosition: { x: 700, y: 300 }
    });
    await page.waitForTimeout(500);

    const compressionNode = page.locator('[data-id^="node-compression"]').first();
    const granulationNode = page.locator('[data-id^="node-granulation"]').first();

    const compressionBox = await compressionNode.boundingBox();
    const granulationBox = await granulationNode.boundingBox();

    if (!compressionBox || !granulationBox) {
      throw new Error('Could not find nodes on canvas');
    }

    // Create connection
    await page.mouse.move(
      compressionBox.x + compressionBox.width,
      compressionBox.y + compressionBox.height / 2
    );
    await page.mouse.down();
    await page.mouse.move(
      granulationBox.x,
      granulationBox.y + granulationBox.height / 2,
      { steps: 10 }
    );
    await page.mouse.up();
    await page.waitForTimeout(1000);

    // Find and click the relationship type dropdown in the dialog
    const relationshipTypeSelect = page.locator('[id="relationship-type"]');
    if (await relationshipTypeSelect.isVisible()) {
      await relationshipTypeSelect.click();

      // Select "Material Flow"
      const materialFlowOption = page.getByRole('option', { name: /material flow/i });
      await materialFlowOption.click();
      await page.waitForTimeout(500);

      // Save the changes
      const saveButton = page.getByRole('button', { name: /save|ok/i });
      await saveButton.click();
      await page.waitForTimeout(500);

      // Check if the edge label updated to "Material Flow"
      const edgeLabel = page.locator('text:has-text("Material Flow")');
      await expect(edgeLabel).toBeVisible({ timeout: 5000 });
    }
  });
});
