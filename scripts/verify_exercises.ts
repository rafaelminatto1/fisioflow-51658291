import { chromium } from 'playwright';

async function verifyExercises() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    // Login first
    console.log('Navigating to login page...');
    await page.goto('http://localhost:8080/login', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    console.log('Filling login form...');
    await page.fill('input[type="email"]', 'rafael.minatto@yahoo.com.br');
    await page.fill('input[type="password"]', 'Yukari30@');
    await page.click('button[type="submit"]');

    // Wait for redirect after login
    console.log('Waiting for login to complete...');
    await page.waitForTimeout(5000);

    // Navigate to exercises
    console.log('Navigating to exercises page...');
    await page.goto('http://localhost:8080/exercises', { waitUntil: 'networkidle' });

    // Wait longer for data to fully load
    console.log('Waiting for data to load...');
    await page.waitForTimeout(8000);

    // Wait for actual exercise cards to appear (not skeleton)
    try {
        await page.waitForSelector('[class*="exercise-card"], [class*="ExerciseCard"], .card', { timeout: 10000 });
        console.log('Exercise cards found!');
    } catch (e) {
        console.log('Timeout waiting for cards, continuing anyway...');
    }

    // Take screenshot
    const screenshotPath = '/home/rafael/.gemini/antigravity/brain/b1607313-7708-411e-9f8f-607debc7c869/exercises_verification.avif';
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log(`Screenshot saved to: ${screenshotPath}`);

    // Check for "sem video" text
    const pageText = await page.textContent('body');
    const hasNoVideo = pageText?.includes('sem video') || pageText?.includes('sem vídeo');
    console.log('Page contains "sem video":', hasNoVideo);

    // Try to extract specific number
    const match = pageText?.match(/(\d+)\s*sem\s*v[íi]deo/i);
    if (match) {
        console.log('Number of exercises without video:', match[1]);
    } else {
        console.log('Could not find "sem video" counter - possibly 0 or removed!');
    }

    // Also look for stats text
    const bodyText = pageText || '';
    if (bodyText.includes('Exercícios') || bodyText.includes('exercício')) {
        console.log('Page appears to have exercise content loaded');
    }

    await browser.close();
    console.log('Done!');
}

verifyExercises().catch(console.error);
