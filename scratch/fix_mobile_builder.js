/**
 * Quick fix: Builder mobile with 15s wait
 */
const { chromium } = require('@playwright/test');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const BASE_URL = 'http://localhost:3002';
const ARTIFACTS_DIR = '/Users/juanan/.gemini/antigravity/brain/e041d53c-d6b4-4d77-8fe1-8b86e1410a96';

async function main() {
    const browser = await chromium.launch({ headless: true });
    
    // Login on mobile → dashboard first
    console.log('Login (mobile)...');
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE_URL}/login`);
    await page.waitForTimeout(3000);
    await page.fill('input[type="email"]', 'nutri_e2e_v2@ainutri.test');
    await page.fill('input[type="password"]', 'Test1234!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    await page.waitForTimeout(8000);
    console.log('  Dashboard loaded on mobile');
    
    // Now navigate to builder via client-side (avoid full reload)
    console.log('Navigate to builder...');
    // Try clicking a link in the menu
    const hamburger = page.locator('button[aria-label="Abrir menú"]');
    if (await hamburger.count() > 0) {
        await hamburger.click();
        await page.waitForTimeout(500);
        console.log('  Hamburger clicked, menu open');
        await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'final_10_builder_mobile_menu.png'), fullPage: true });
        
        const builderLink = page.locator('a:has-text("Builder")');
        if (await builderLink.count() > 0) {
            await builderLink.first().click();
            await page.waitForTimeout(8000);
            await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'final_10_builder_mobile.png'), fullPage: true });
            console.log('  📸 Builder mobile via client nav');
            
            const text = await page.textContent('body');
            if (text.includes('Estableciendo')) {
                console.log('  ⚠️ Still loading after client nav + 8s');
                // Full reload approach with longer wait
                await page.goto(`${BASE_URL}/builder`);
                await page.waitForTimeout(15000);
                await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'final_10_builder_mobile.png'), fullPage: true });
                console.log('  📸 Builder mobile via full reload + 15s');
            } else {
                console.log('  ✅ Builder loaded!');
            }
        } else {
            console.log('  No builder link found');
        }
    } else {
        // Direct goto with max wait
        console.log('  No hamburger, direct navigation...');
        await page.goto(`${BASE_URL}/builder`);
        await page.waitForTimeout(15000);
        await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'final_10_builder_mobile.png'), fullPage: true });
    }
    
    await ctx.close();
    await browser.close();
    console.log('\nDone!');
}

main().catch(err => { console.error(err); process.exit(1); });
