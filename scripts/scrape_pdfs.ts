import { chromium } from 'playwright';
import path from 'path';

const papersInfo = [
  { file: 'acl-meta-analysis-huang-2022.pdf', doi: '10.1097/MD.0000000000029263' },
  { file: 'hip-fai-combined-tests-palsson-2020.pdf', doi: '10.1016/j.math.2014.11.006' },
  { file: 'shoulder-impingement-calis-2000.pdf', doi: '10.1136/ard.59.1.24' },
  { file: 'shoulder-systematic-review-gismervik-2017.pdf', doi: '10.1186/s12891-017-1400-0' },
  { file: 'spurling-cervical-review-rubinstein-2007.pdf', doi: '10.1007/s00586-006-0224-4' },
  { file: 'spurling-radiculopathy-thoomes-2026.pdf', doi: '10.1097/PHM.0000000000002707' }
];

const targetDir = path.join(process.cwd(), 'public', 'clinical-tests', 'papers');

async function main() {
  console.log("Launching browser with persistent context to keep you logged in...");
  const userDataDir = path.join(process.cwd(), 'playwright-profile');
  
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    permissions: ['clipboard-read'],
    acceptDownloads: true
  });
  
  const page = await context.newPage();
  
  console.log("Navigating to ScienceDirect via CAPES/CAFe (USP)...");
  
  // Go to ScienceDirect institution login
  await page.goto('https://www.sciencedirect.com/science/activate/login');
  
  // Try to find Universidade de São Paulo
  console.log("Please authenticate if asked. I will wait up to 3 minutes for you to log in.");
  
  try {
    // If we're not already logged in, the user will have to do it.
    // We wait for the CAFe login to complete or for the user to be inside SD.
    await page.waitForFunction(() => {
        return window.location.href.includes('science/journal') || 
               window.location.href.includes('sciencedirect.com/science') ||
               document.title.includes('ScienceDirect');
    }, { timeout: 180000 });
  } catch  {
    console.log("Timeout waiting for login. Will proceed anyway, maybe it's not strictly required or you are already logged in.");
  }

  for (const paper of papersInfo) {
    console.log(`\nNavigating to ${paper.doi}...`);
    try {
        await page.goto(`https://doi.org/${paper.doi}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
        
        // Wait a bit for the redirect and page to settle
        await page.waitForTimeout(5000);

        console.log(`Please manually download the PDF for ${paper.doi} into 'public/clinical-tests/papers/${paper.file}' if not done automatically.`);
        
        // Try to click typical PDF download buttons
        const pdfButton = await page.locator('text=Download PDF, text=View PDF, a:has-text("PDF"), .pdf-download-btn, a.pdf-link').first();
        if (await pdfButton.isVisible().catch(() => false)) {
            console.log("Found a PDF button, trying to click...");
            
            // Listen for download
            const downloadPromise = page.waitForEvent('download', { timeout: 30000 }).catch(() => null);
            await pdfButton.click().catch(() => {});
            
            const download = await downloadPromise;
            if (download) {
                const dest = path.join(targetDir, paper.file);
                await download.saveAs(dest);
                console.log(`Downloaded ${paper.file} automatically!`);
            } else {
                console.log("No download triggered automatically. Please click it or wait 10s.");
                await page.waitForTimeout(10000);
            }
        } else {
            console.log("Could not find a clear PDF download button. You have 20 seconds to interact and download it manually.");
            await page.waitForTimeout(20000);
        }
    } catch (e) {
        console.log(`Error interacting with page for ${paper.doi}: ${e instanceof Error ? e.message : String(e)}. Waiting 15 seconds for manual action...`);
        await page.waitForTimeout(15000);
    }
  }

  console.log("Finished passing through DOIs. Keeping browser open for 1 minute so you can check.");
  await page.waitForTimeout(60000);
  await context.close();
}

main().catch(console.error);
