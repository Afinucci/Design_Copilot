import { test, expect } from '@playwright/test';

test.describe('Drag and Drop Debug', () => {
  test('should test HTML5 drag and drop with custom implementation', async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:3000');
    await page.waitForSelector('text=Pharmaceutical Facility Design Copilot');

    // Switch to Creation mode
    await page.click('button[aria-label="creation mode"]');
    await page.waitForTimeout(500);

    // Setup console listener
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      consoleMessages.push(text);
      console.log('Browser:', text);
    });

    // Wait for templates to load
    await page.waitForSelector('text=Production');

    // Expand Production category
    await page.click('text=Production');
    await page.waitForTimeout(300);

    // Wait for Weighing Area to be visible
    await page.waitForSelector('text=Weighing Area', { state: 'visible' });

    // Get elements
    const sourceElement = await page.locator('li:has-text("Weighing Area")').first();
    const canvasBox = await page.locator('.react-flow-wrapper').first().boundingBox();

    if (!canvasBox) {
      throw new Error('Canvas not found');
    }

    const dropX = canvasBox.x + canvasBox.width / 2;
    const dropY = canvasBox.y + canvasBox.height / 2;

    console.log('Drop target:', { dropX, dropY });

    // Use JavaScript to simulate proper HTML5 drag and drop
    await page.evaluate(async ({ sourceSelector, targetX, targetY }) => {
      // Get the source element
      const source = document.querySelector(sourceSelector);
      if (!source) throw new Error('Source element not found');

      // Create a proper DataTransfer object
      const dataTransfer = new DataTransfer();

      // Get the drag data from the source
      const templateData = source.getAttribute('data-template') ||
                          (source as any).__reactProps$?.template;

      console.log('Template data:', templateData);

      // Set the data
      if (templateData) {
        dataTransfer.setData('application/reactflow', JSON.stringify(templateData));
      }

      // Create and dispatch dragstart event
      const dragStartEvent = new DragEvent('dragstart', {
        bubbles: true,
        cancelable: true,
        dataTransfer: dataTransfer
      });

      source.dispatchEvent(dragStartEvent);
      console.log('✅ Dispatched dragstart');

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100));

      // Find the drop target
      const dropTarget = document.querySelector('.react-flow-wrapper') ||
                        document.elementFromPoint(targetX, targetY);

      if (!dropTarget) {
        console.error('❌ Drop target not found at', targetX, targetY);
        return;
      }

      console.log('Drop target element:', dropTarget.tagName, dropTarget.className);

      // Create and dispatch dragover event
      const dragOverEvent = new DragEvent('dragover', {
        bubbles: true,
        cancelable: true,
        clientX: targetX,
        clientY: targetY,
        dataTransfer: dataTransfer
      });

      dropTarget.dispatchEvent(dragOverEvent);
      console.log('✅ Dispatched dragover');

      await new Promise(resolve => setTimeout(resolve, 100));

      // Create and dispatch drop event
      const dropEvent = new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        clientX: targetX,
        clientY: targetY,
        dataTransfer: dataTransfer
      });

      const dropResult = dropTarget.dispatchEvent(dropEvent);
      console.log('✅ Dispatched drop, result:', dropResult);

      // Dispatch dragend on source
      const dragEndEvent = new DragEvent('dragend', {
        bubbles: true,
        cancelable: true,
        dataTransfer: dataTransfer
      });

      source.dispatchEvent(dragEndEvent);
      console.log('✅ Dispatched dragend');

    }, {
      sourceSelector: 'li:has(p:text("Weighing Area"))',
      targetX: dropX,
      targetY: dropY
    });

    await page.waitForTimeout(2000);

    // Take screenshot
    await page.screenshot({ path: 'test-results/drag-drop-debug.png', fullPage: true });

    // Check console for drop event
    console.log('\n=== All Console Messages ===');
    consoleMessages.forEach(msg => console.log(msg));

    const hasDropEvent = consoleMessages.some(msg => msg.includes('Drop event triggered'));
    console.log('\n🎯 Drop event detected:', hasDropEvent);

    // Check if nodes were created
    const nodeCount = await page.locator('.react-flow__node').count();
    console.log('📦 Nodes on canvas:', nodeCount);
  });

  test('should inspect event listeners on drop zone', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForSelector('text=Pharmaceutical Facility Design Copilot');
    await page.click('button[aria-label="creation mode"]');
    await page.waitForTimeout(500);

    // Inspect what event listeners are actually attached
    const listenerInfo = await page.evaluate(() => {
      const wrapper = document.querySelector('.react-flow-wrapper');
      const snapCanvas = wrapper?.firstElementChild;
      const reactFlow = snapCanvas?.querySelector('.react-flow');

      const getListeners = (element: Element | null) => {
        if (!element) return 'Element not found';

        // Try to get event listeners (Chrome DevTools Protocol)
        const listeners: any = {};

        // Check for React event handlers
        const reactProps = Object.keys(element).find(key => key.startsWith('__reactProps$'));
        if (reactProps) {
          const props = (element as any)[reactProps];
          listeners.react = {
            onDragOver: !!props?.onDragOver,
            onDrop: !!props?.onDrop,
            onDrag: !!props?.onDrag,
          };
        }

        return {
          tagName: element.tagName,
          className: element.className,
          listeners,
          style: {
            pointerEvents: window.getComputedStyle(element).pointerEvents,
            position: window.getComputedStyle(element).position,
            zIndex: window.getComputedStyle(element).zIndex,
          }
        };
      };

      return {
        wrapper: getListeners(wrapper),
        snapCanvas: getListeners(snapCanvas),
        reactFlow: getListeners(reactFlow),
      };
    });

    console.log('\n=== Event Listener Analysis ===');
    console.log(JSON.stringify(listenerInfo, null, 2));
  });
});
