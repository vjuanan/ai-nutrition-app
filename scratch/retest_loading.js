/**
 * QUICK RE-TEST: Builder + Mobile focus
 * Uses longer wait times to diagnose loading issues
 */

const { createClient } = require('@supabase/supabase-js');
const { chromium } = require('@playwright/test');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const BASE_URL = 'http://localhost:3002';
const ARTIFACTS_DIR = '/Users/juanan/.gemini/antigravity/brain/e041d53c-d6b4-4d77-8fe1-8b86e1410a96';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function screenshot(page, name) {
    const filePath = path.join(ARTIFACTS_DIR, `retest_${name}.png`);
    await page.screenshot({ path: filePath, fullPage: true });
    console.log(`  📸 ${name}`);
}

async function main() {
    console.log('=== RETEST: Builder & Mobile Loading Issues ===\n');
    
    const browser = await chromium.launch({ headless: true });
    
    // TEST A: Nutritionist Builder with extended wait
    console.log('[A] Nutri Login → Dashboard → Builder (10s wait)...');
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    
    // Listen for console errors
    page.on('console', msg => {
        if (msg.type() === 'error') console.log(`  🔴 CONSOLE ERROR: ${msg.text()}`);
    });
    page.on('pageerror', err => console.log(`  🔴 PAGE ERROR: ${err.message}`));
    
    await page.goto(`${BASE_URL}/login`);
    await page.waitForTimeout(2000);
    await page.fill('input[type="email"]', 'nutri_e2e_v2@ainutri.test');
    await page.fill('input[type="password"]', 'Test1234!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    await page.waitForTimeout(5000); // Extended wait for context to fully load
    await screenshot(page, 'A1_dashboard_5s');
    
    // Navigate to builder
    console.log('  Navigating to builder...');
    await page.goto(`${BASE_URL}/builder`);
    await page.waitForTimeout(10000); // Extra long wait
    await screenshot(page, 'A2_builder_10s');
    
    // Check what the page shows
    const bodyText = await page.textContent('body');
    if (bodyText.includes('Estableciendo conexión')) {
        console.log('  ⚠️ Still showing loading spinner after 10s!');
        // Check if there's a session issue
        const storage = await page.evaluate(() => {
            const keys = Object.keys(localStorage);
            return keys.filter(k => k.includes('supabase')).map(k => `${k}: ${localStorage[k].substring(0, 50)}...`);
        });
        console.log('  LocalStorage supabase keys:', storage);
    } else {
        console.log('  ✅ Builder loaded successfully!');
    }
    
    // TEST B: Use client-side navigation (Link click instead of goto)
    console.log('\n[B] Client-side navigation to builder (Link click)...');
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForTimeout(5000);
    
    // Try clicking the "Builder de Planes" link in sidebar
    const builderLink = page.locator('a:has-text("Builder"), a:has-text("Planes"), a:has-text("Crear Plan")');
    if (await builderLink.count() > 0) {
        await builderLink.first().click();
        await page.waitForTimeout(8000);
        await screenshot(page, 'B1_builder_via_link');
        const text2 = await page.textContent('body');
        if (text2.includes('Estableciendo')) {
            console.log('  ⚠️ Still loading via client-side nav');
        } else {
            console.log('  ✅ Builder loaded via client-side nav!');
        }
    } else {
        console.log('  ⚠️ No builder link found in sidebar');
        // List all sidebar links
        const links = await page.locator('nav a, aside a').allTextContents();
        console.log('  Sidebar links:', links);
    }
    
    await ctx.close();
    
    // TEST C: Patient Mobile with extended wait
    console.log('\n[C] Patient Mobile (15s wait)...');
    const mCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const mPage = await mCtx.newPage();
    mPage.on('console', msg => {
        if (msg.type() === 'error') console.log(`  🔴 CONSOLE ERROR: ${msg.text()}`);
    });
    
    await mPage.goto(`${BASE_URL}/login`);
    await mPage.waitForTimeout(3000);
    await mPage.fill('input[type="email"]', 'paciente_e2e_v2@ainutri.test');
    await mPage.fill('input[type="password"]', 'Test1234!');
    await mPage.click('button[type="submit"]');
    await mPage.waitForURL('**/dashboard', { timeout: 15000 });
    await mPage.waitForTimeout(15000); // Very long wait
    await screenshot(mPage, 'C1_patient_mobile_15s');
    
    const mobileText = await mPage.textContent('body');
    if (mobileText.includes('Estableciendo')) {
        console.log('  ⚠️ Patient mobile still loading after 15s!');
    } else {
        console.log('  ✅ Patient mobile loaded!');
    }
    
    await mCtx.close();
    await browser.close();
    
    console.log('\n=== RETEST COMPLETE ===');
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
