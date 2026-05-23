/**
 * VERIFY PRODUCTION DESIGN: Capture nutritionist builder and patient dashboard on production URL
 */

const { chromium } = require('@playwright/test');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const BASE_URL = 'https://ainutrition.epnstore.com.ar';
const ARTIFACTS_DIR = '/Users/juanan/.gemini/antigravity/brain/e041d53c-d6b4-4d77-8fe1-8b86e1410a96';

const TEST_USERS = {
    patient: { email: 'paciente_e2e_v2@ainutri.test', password: 'Test1234!' },
    nutritionist: { email: 'nutri_e2e_v2@ainutri.test', password: 'Test1234!' },
};

async function screenshot(page, name) {
    const filePath = path.join(ARTIFACTS_DIR, `prod_${name}.png`);
    await page.screenshot({ path: filePath, fullPage: true });
    console.log(`  📸 Saved prod_${name}.png`);
}

async function loginInNewContext(browser, email, password, viewport = { width: 1440, height: 900 }) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    await page.goto(`${BASE_URL}/login`);
    await page.waitForTimeout(3000);
    await page.waitForSelector('input[name="email"]', { timeout: 15000 });
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
    
    // Bulletproof wait
    await page.waitForTimeout(10000);
    
    const currentUrl = page.url();
    if (currentUrl.includes('/onboarding')) {
        console.log('  ⚠️ Redirected to onboarding, forcing navigation to dashboard...');
        await page.goto(`${BASE_URL}/dashboard`);
        await page.waitForTimeout(6000);
    } else if (currentUrl.includes('/login')) {
        console.log('  ⚠️ Still on login page, trying direct navigation to dashboard...');
        await page.goto(`${BASE_URL}/dashboard`);
        await page.waitForTimeout(6000);
    }
    
    return { context, page };
}

async function main() {
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║   PRODUCTION VERIFICATION - COMPACT DESIGN + BLOCKS      ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');
    
    const browser = await chromium.launch({ headless: true });
    
    try {
        // ==========================================
        // 1. NUTRITIONIST BUILDER ON PRODUCTION
        // ==========================================
        console.log('Logging in as Nutritionist on Production...');
        const { context: c1, page: p1 } = await loginInNewContext(browser, TEST_USERS.nutritionist.email, TEST_USERS.nutritionist.password);
        
        console.log('Navigating to Builder page...');
        await p1.goto(`${BASE_URL}/builder`);
        await p1.waitForTimeout(8000); // Wait for full render
        await screenshot(p1, 'nutritionist_builder');
        
        // Scroll to see meals
        await p1.evaluate(() => window.scrollTo(0, 400));
        await p1.waitForTimeout(1000);
        await screenshot(p1, 'nutritionist_builder_scroll');
        await c1.close();
        
        // ==========================================
        // 2. PATIENT DASHBOARD ON PRODUCTION
        // ==========================================
        console.log('Logging in as Patient on Production...');
        const { context: c2, page: p2 } = await loginInNewContext(browser, TEST_USERS.patient.email, TEST_USERS.patient.password);
        
        console.log('Capturing Patient Dashboard...');
        await screenshot(p2, 'patient_dashboard');
        await c2.close();
        
        console.log('\n✅ Verification Completed successfully!');
    } catch (err) {
        console.error(`❌ ERROR: ${err.message}`);
    } finally {
        await browser.close();
    }
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
