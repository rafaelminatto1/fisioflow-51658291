import asyncio
from playwright import async_api
from playwright.async_api import expect

async def run_test():
    pw = None
    browser = None
    context = None
    
    try:
        # Start a Playwright session in asynchronous mode
        pw = await async_api.async_playwright().start()
        
        # Launch a Chromium browser in headless mode with custom arguments
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--window-size=1280,720",         # Set the browser window size
                "--disable-dev-shm-usage",        # Avoid using /dev/shm which can cause issues in containers
                "--ipc=host",                     # Use host-level IPC for better stability
                "--single-process"                # Run the browser in a single process mode
            ],
        )
        
        # Create a new browser context (like an incognito window)
        context = await browser.new_context()
        context.set_default_timeout(5000)
        
        # Open a new page in the browser context
        page = await context.new_page()
        
        # Navigate to your target URL and wait until the network request is committed
        await page.goto("http://localhost:8080", wait_until="commit", timeout=10000)
        
        # Wait for the main page to reach DOMContentLoaded state (optional for stability)
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=3000)
        except async_api.Error:
            pass
        
        # Iterate through all iframes and wait for them to load as well
        for frame in page.frames:
            try:
                await frame.wait_for_load_state("domcontentloaded", timeout=3000)
            except async_api.Error:
                pass
        
        # Interact with the page elements to simulate user flow
        # -> Input email and password, then click login button to access the calendar with existing appointments.
        frame = context.pages[-1]
        # Input email for login
        elem = frame.locator('xpath=html/body/div/div[2]/div[2]/div[2]/div[2]/div[2]/form/div/div/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('rafael.minatto@yahoo.com.br')
        

        frame = context.pages[-1]
        # Input password for login
        elem = frame.locator('xpath=html/body/div/div[2]/div[2]/div[2]/div[2]/div[2]/form/div/div[2]/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('Yukari30@')
        

        frame = context.pages[-1]
        # Click login button to enter the platform
        elem = frame.locator('xpath=html/body/div/div[2]/div[2]/div[2]/div[2]/div[2]/form/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Click on 'Agenda' menu item to open the calendar with existing appointments.
        frame = context.pages[-1]
        # Click on 'Agenda' menu item to open the calendar with existing appointments
        elem = frame.locator('xpath=html/body/div/div[2]/div/div/nav/a[5]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Click on 'Agenda' menu item to open the calendar with existing appointments.
        frame = context.pages[-1]
        # Click on 'Agenda' menu item to open the calendar with existing appointments
        elem = frame.locator('xpath=html/body/div/div[2]/div/div/nav/a[5]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Scroll down to check for appointments further down the page or try to apply filters to display existing appointments.
        await page.mouse.wheel(0, 600)
        

        # -> Try to open filters or settings to check if appointments are hidden or filtered out, and attempt to enable or adjust filters to display existing appointments.
        frame = context.pages[-1]
        # Click on 'Filtros' button to open filters and check if appointments are hidden or filtered out
        elem = frame.locator('xpath=html/body/div/div[2]/div[2]/main/div/div/div/div/div[2]/button[2]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Select all status filters and all service type filters to ensure all appointments are visible, then close the filters panel and check the calendar for appointments.
        frame = context.pages[-1]
        # Select 'Agendado' status filter
        elem = frame.locator('xpath=html/body/div[3]/div[2]/div/div/div').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Try to close the filters panel and then reopen it to reset the filter UI, or try to scroll inside the filters panel to reveal hidden options and retry selecting all filters.
        frame = context.pages[-1]
        # Click 'Filtros' button to close the filters panel
        elem = frame.locator('xpath=html/body/div/div[2]/div[2]/main/div/div/div/div/div[2]/button[2]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        await page.mouse.wheel(0, 200)
        

        # -> Select all status filters and all service type filters to ensure all appointments are visible, then close the filters panel and check the calendar for appointments.
        frame = context.pages[-1]
        # Select 'Agendado' status filter
        elem = frame.locator('xpath=html/body/div[3]/div[2]/div/div/div').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Close the filters panel and verify that appointments are now visible on the calendar for drag and drop rescheduling.
        frame = context.pages[-1]
        # Click 'Close' button to close the filters panel
        elem = frame.locator('xpath=html/body/div[3]/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Try clicking outside the filters panel or pressing Escape key to close the filters panel, then verify appointments are visible on the calendar for drag and drop.
        frame = context.pages[-1]
        # Click outside filters panel to close it
        elem = frame.locator('xpath=html/body/div/a').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Drag an existing appointment (e.g., 'Ana Silva' on Tuesday, January 13, 2026, 08:00 - 09:00) to a free, valid time slot and verify the update.
        frame = context.pages[-1]
        # Click on the appointment block for 'Ana Silva' on Tuesday, January 13, 2026, 08:00 - 09:00 to select it for drag and drop
        elem = frame.locator('xpath=html/body/div/div[2]/div/div/nav/a[18]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # --> Assertions to verify final state
        frame = context.pages[-1]
        try:
            await expect(frame.locator('text=Appointment Reschedule Successful').first).to_be_visible(timeout=1000)
        except AssertionError:
            raise AssertionError("Test case failed: The appointment could not be rescheduled by dragging and dropping to a different valid time slot on the calendar as required by the test plan.")
        await asyncio.sleep(5)
    
    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()
            
asyncio.run(run_test())
    