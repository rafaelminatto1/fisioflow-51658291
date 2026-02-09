import asyncio
from playwright import async_api

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
        await page.goto("http://localhost:8084", wait_until="commit", timeout=10000)

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
        # -> Navigate to http://localhost:8084
        await page.goto("http://localhost:8084", wait_until="commit", timeout=10000)
        
        # -> Try to load the login page (or reload app). If no UI elements appear, attempt a direct navigation to the login page and then perform login using provided credentials.
        await page.goto("http://localhost:8084/login", wait_until="commit", timeout=10000)
        
        # -> Try a forced reload of the login page (cache-busting) to attempt to recover the SPA. If still blank, report that the UI fails to initialize and stop.
        await page.goto("http://localhost:8084/login?reload=1", wait_until="commit", timeout=10000)
        
        # -> Attempt a cache-busting reload of the app by navigating to http://localhost:8084/?_cb=1707300000000 and wait 3 seconds to allow SPA to initialize. If the page is still blank, try other recovery steps (open index.html or report UI initialization failure).
        await page.goto("http://localhost:8084/?_cb=1707300000000", wait_until="commit", timeout=10000)
        
        # -> Fill the email and password fields with provided credentials and click the 'Entrar na Plataforma' button to log in.
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=html/body/div/div[2]/main/div[2]/div/div[2]/div[1]/div[2]/form/div/div[1]/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('rafael.minatto@yahoo.com.br')
        
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=html/body/div/div[2]/main/div[2]/div/div[2]/div[1]/div[2]/form/div/div[2]/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('Yukari30@')
        
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=html/body/div/div[2]/main/div[2]/div/div[2]/div[1]/div[2]/form/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # -> Open the new appointment modal to start scheduling test appointments by clicking the 'Novo Agendamento' button.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=html/body/div/div[2]/div[2]/main/div/div/div/div/div[2]/div/div/div/div[1]/div[2]/div[2]/button[5]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # -> Reload the app with a cache-busting parameter to recover the SPA and restore interactive elements so scheduling can continue.
        await page.goto("http://localhost:8084/?_cb=1707300002000", wait_until="commit", timeout=10000)
        
        # -> Open the new appointment modal by clicking the 'Novo Agendamento' button so scheduling can begin.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=html/body/div/div[2]/div[2]/main/div/div/div/div/div[2]/div/div/div/div[1]/div[2]/div[2]/button[5]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # -> Close the currently open 'Novo Agendamento' modal and open the calendar gridcell for the first slot (Slot 10:30 Monday - element index 17602) to start creating appointment #1.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=html/body/div[1]/div[2]/div[2]/main/div/div/div/div[2]/div/div/div[3]/div[2]/button[1]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=html/body/div[1]/div[2]/div[2]/main/div/div/div/div[1]/div[2]/div/div/div/div[2]/div/div[1]/div/div/div[2]/div/div[37]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # -> Open appointment 'Rafael Minatto De Martino - 10:00' (element index=24683) to access the appointment details and change its status to 'confirmado'.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=html/body/div/div[2]/div[2]/main/div/div/div/div/div[2]/div/div/div/div[2]/div/div[1]/div/div/div[2]/div/div[198]/div').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # -> Reload the application with a cache-busting parameter and wait for the SPA to initialize so interactive elements become available again (then continue scheduling/confirming appointments).
        await page.goto("http://localhost:8084/?_cb=1707300003000", wait_until="commit", timeout=10000)
        
        # -> Open the appointment 'Rafael Minatto De Martino - 10:00' (element index=32153) to access details and change status to 'confirmado'.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=html/body/div/div[2]/div[2]/main/div/div/div/div/div[2]/div/div/div/div[2]/div/div[1]/div/div/div[2]/div/div[198]/div').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # -> Open the 'Status' dropdown in the appointment details and change the status to 'Confirmado' (start by clicking the status combobox element).
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=html/body/div[3]/div/div/div/div[2]/div[3]/div[2]/div[1]/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # -> Navigate to the Dashboard page to find the confirmation rate metric (or the relevant Reports area) so confirmation metrics can be verified. If metric present, extract the label and percentage.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=html/body/div/div[2]/div[1]/div/nav/div[2]/a[2]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # -> Open the Agenda page (click the 'Agenda' navigation link) to inspect appointment items and confirm at least one appointment to test the confirmation workflow.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=html/body/div/div[2]/div[1]/div/nav/div[2]/a[1]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # -> Reload the application (cache-busting) to restore the SPA UI so interactive elements become available; then open the Agenda page and continue with appointment confirmation and metric verification.
        await page.goto("http://localhost:8084/?_cb=1707300004000", wait_until="commit", timeout=10000)
        
        # -> Open the appointment details for 'Rafael Minatto De Martino - 10:00' so its status can be changed to 'Confirmado'.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=html/body/div/div[2]/div[2]/main/div/div/div/div/div[2]/div/div/div/div[2]/div/div[1]/div/div/div[2]/div/div[198]/div').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # -> Open the 'Status' combobox in the open appointment dialog so the 'Confirmado' option can be selected.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=html/body/div[3]/div/div/div/div[2]/div[3]/div[2]/div[1]/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # -> Open the Agenda view to list appointments and begin confirming appointment(s) (open first agendado appointment).
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=html/body/div/div[2]/div[1]/div/nav/div[2]/a[1]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # -> Open appointment details for Rafael Minatto De Martino - 10:00 (element index 55680) so its status can be changed to 'Confirmado'.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=html/body/div[1]/div[2]/div[2]/main/div/div/div/div/div[2]/div/div/div/div[2]/div/div[1]/div/div/div[2]/div/div[198]/div').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # -> Open the 'Status' combobox for the currently opened appointment and select 'Confirmado' to test the confirmation workflow (first appointment). Then repeat for other visible 'agendado' appointments and finally extract confirmation-rate metric from Dashboard/Reports.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=html/body/div[3]/div/div/div/div[2]/div[3]/div[2]/div[1]/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # -> Open appointment details for 'Rafael Minatto De Martino - 10:00' by clicking the calendar appointment element (index 57884) so its status can be changed to 'Confirmado'.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=html/body/div/div[2]/div[2]/main/div/div/div/div/div[2]/div/div/div/div[2]/div/div[1]/div/div/div[2]/div/div[198]/div').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # -> Open the Status combobox in the currently-open appointment so the 'Confirmado' option can be selected (click element index=58265).
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=html/body/div[3]/div/div/div/div[2]/div[3]/div[2]/div[1]/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # -> Open a stable appointment details dialog (Rafael Minatto De Martino - 10:00 variant) so the Status control can be interacted with and the appointment can be marked 'Confirmado'.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=html/body/div/div[2]/div[2]/main/div/div/div/div/div[2]/div/div/div/div[2]/div/div[1]/div/div/div[2]/div/div[207]/div').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # --> Assertions to verify final state
        frame = context.pages[-1]
        # -> Assertions for appointment confirmation workflows and confirmation rate metric
        frame = context.pages[-1]
        await page.wait_for_timeout(2000)  # give UI a moment to stabilize
        
        # Assertion 1: At least one appointment was marked as 'Confirmado' (visible on the page)
        confirmed_count = await frame.locator("text=Confirmado").count()
        assert confirmed_count > 0, f"Expected at least 1 confirmed appointment, found {confirmed_count}"
        
        # Assertion 2: Confirmation rate metric exists and is >= 85%
        import re
        await page.wait_for_timeout(1000)
        # Try to find an element that contains a percentage sign
        pct_locator = frame.locator("xpath=//*[contains(text(), '%')]").first
        pct_count = await pct_locator.count()
        assert pct_count > 0, 'Could not find any percentage metric on the page to evaluate confirmation rate'
        pct_text = (await pct_locator.text_content()) or ''
        pct_text = pct_text.strip()
        m = re.search(r"(\d{1,3})(?:[.,](\d+))?\s*%", pct_text)
        assert m, f"Failed to parse percentage from text: '{pct_text}'"
        pct_value = float(m.group(1) + ('.' + m.group(2) if m.group(2) else ''))
        assert pct_value >= 85.0, f"Confirmation rate is below expected threshold: {pct_value}% < 85%"
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    