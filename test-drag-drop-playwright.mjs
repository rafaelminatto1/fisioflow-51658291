// Test script for drag and drop functionality
// Run with: node test-drag-drop-playwright.mjs

const { chromium } = require('playwright');

async function testDragAndDrop() {
    console.log('Starting drag and drop test...');
    
    const browser = await chromium.launch({
        headless: false, // Run in non-headless mode to see what's happening
        slowMo: 500 // Slow down actions to see drag movement
    });
    
    const context = await browser.newContext();
    const page = await context.newPage();
    
    try {
        // Navigate to the app (adjust URL if needed)
        console.log('Navigating to app...');
        await page.goto('http://localhost:8085', { waitUntil: 'networkidle' });
        
        // Wait for page to load
        await page.waitForTimeout(3000);
        
        // Look for appointment cards
        console.log('Looking for appointment cards...');
        const appointmentCard = await page.locator('.calendar-appointment-card').first();
        
        if (!await appointmentCard.count()) {
            console.error('No appointment cards found!');
            return;
        }
        
        console.log('Found appointment card');
        
        // Highlight the card to make it visible
        await appointmentCard.scrollIntoViewIfNeeded();
        await page.waitForTimeout(1000);
        
        // Screenshot before drag
        await page.screenshot({ path: 'test-screenshots/01-before-drag.png' });
        console.log('Screenshot saved: 01-before-drag.png');
        
        // Start drag
        console.log('Starting drag...');
        const dragSource = await appointmentCard.boundingBox();
        
        // For drag handle mode, try to click on the grip handle
        const dragHandle = await page.locator('[data-drag-handle]').first();
        
        if (await dragHandle.count() > 0) {
            console.log('Using drag handle mode');
            const handleBox = await dragHandle.boundingBox();
            await page.mouse.move(
                dragSource.x + handleBox.x + handleBox.width / 2,
                dragSource.y + handleBox.y + handleBox.height / 2
            );
            await page.mouse.down();
            await page.waitForTimeout(500);
        } else {
            console.log('Using full card drag mode');
            await page.mouse.move(
                dragSource.x + dragSource.width / 2,
                dragSource.y + dragSource.height / 2
            );
            await page.mouse.down();
            await page.waitForTimeout(500);
        }
        
        // Move mouse to simulate dragging out of the original cell
        console.log('Dragging to adjacent cell...');
        
        // Look for a time slot cell to drag to
        const targetSlot = await page.locator('[role="gridcell"]').nth(5);
        
        if (await targetSlot.count() === 0) {
            console.error('No target slot found!');
            return;
        }
        
        const targetBox = await targetSlot.boundingBox();
        
        // Move to target
        await page.mouse.move(
            targetBox.x + targetBox.width / 2,
            targetBox.y + targetBox.height / 2
        );
        
        await page.waitForTimeout(2000);
        
        // Screenshot during drag
        await page.screenshot({ path: 'test-screenshots/02-during-drag.png' });
        console.log('Screenshot saved: 02-during-drag.png');
        
        // Release mouse
        console.log('Releasing mouse...');
        await page.mouse.up();
        
        await page.waitForTimeout(1000);
        
        // Screenshot after drop
        await page.screenshot({ path: 'test-screenshots/03-after-drop.png' });
        console.log('Screenshot saved: 03-after-drop.png');
        
        // Check if confirm dialog appeared
        const confirmDialog = await page.locator('[role="dialog"]');
        const dialogVisible = await confirmDialog.count() > 0;
        
        console.log('Confirm dialog visible:', dialogVisible);
        
        // Get any console errors
        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.error('Browser console error:', msg.text());
            }
        });
        
        console.log('Test completed');
        
    } catch (error) {
        console.error('Test failed with error:', error);
        await page.screenshot({ path: 'test-screenshots/error.png' });
    } finally {
        await context.close();
        await browser.close();
    }
}

testDragAndDrop();
