const { chromium } = require('@playwright/test');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const BASE_URL = 'https://ainutrition.epnstore.com.ar';

async function main() {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    page.on('pageerror', err => console.error('BROWSER ERROR:', err.message));
    
    console.log('Navigating to login...');
    await page.goto(`${BASE_URL}/login`);
    await page.waitForTimeout(3000);
    
    console.log('Filling form...');
    await page.fill('input[name="email"]', 'nutri_e2e_v2@ainutri.test');
    await page.fill('input[name="password"]', 'Test1234!');
    
    console.log('Clicking submit...');
    await page.click('button[type="submit"]');
    
    await page.waitForTimeout(5000);
    console.log('Current URL:', page.url());
    
    // Capture screenshot
    await page.screenshot({ path: '/Users/juanan/.gemini/antigravity/brain/e041d53c-d6b4-4d77-8fe1-8b86e1410a96/login_debug.png' });
    console.log('Saved login_debug.png');
    
    await browser.close();
}

main().catch(err => console.error(err));
