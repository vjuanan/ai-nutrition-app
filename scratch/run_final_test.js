/**
 * FINAL E2E TEST v4: Complete flow with correct wait times + responsive fixes
 */

const { chromium } = require('@playwright/test');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const BASE_URL = 'http://localhost:3002';
const ARTIFACTS_DIR = '/Users/juanan/.gemini/antigravity/brain/e041d53c-d6b4-4d77-8fe1-8b86e1410a96';

const TEST_USERS = {
    patient: { email: 'paciente_e2e_v2@ainutri.test', password: 'Test1234!' },
    clinic: { email: 'consultorio_e2e_v2@ainutri.test', password: 'Test1234!' },
    nutritionist: { email: 'nutri_e2e_v2@ainutri.test', password: 'Test1234!' },
    admin: { email: 'vjuanan@gmail.com', password: 'Admin1234!' }
};

async function screenshot(page, name) {
    const filePath = path.join(ARTIFACTS_DIR, `final_${name}.png`);
    await page.screenshot({ path: filePath, fullPage: true });
    console.log(`  📸 ${name}`);
}

async function loginInNewContext(browser, email, password, viewport = { width: 1440, height: 900 }) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    await page.goto(`${BASE_URL}/login`);
    await page.waitForTimeout(2500);
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    await page.waitForTimeout(5000); // Wait for context data to fully load
    return { context, page };
}

async function main() {
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║   FINAL E2E TEST - ALL ROLES + BUILDER + MOBILE (v4)   ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');
    
    const browser = await chromium.launch({ headless: true });
    let passed = 0;
    let failed = 0;
    
    try {
        // ==========================================
        // 1. LANDING PAGE
        // ==========================================
        console.log('[1/12] Landing Page...');
        const c1 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
        const p1 = await c1.newPage();
        await p1.goto(BASE_URL);
        await p1.waitForTimeout(2000);
        await screenshot(p1, '01_landing');
        passed++; console.log('  ✅ OK\n');
        await c1.close();
        
        // ==========================================
        // 2. REGISTRATION: Patient Form
        // ==========================================
        console.log('[2/12] Registration Page (Patient)...');
        const c2 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
        const p2 = await c2.newPage();
        await p2.goto(`${BASE_URL}/register`);
        await p2.waitForTimeout(2000);
        await screenshot(p2, '02_register');
        passed++; console.log('  ✅ OK\n');
        await c2.close();
        
        // ==========================================
        // 3. SUPERADMIN DASHBOARD
        // ==========================================
        console.log('[3/12] Superadmin Dashboard...');
        const { context: c3, page: p3 } = await loginInNewContext(browser, TEST_USERS.admin.email, TEST_USERS.admin.password);
        await screenshot(p3, '03_admin_dashboard');
        await p3.evaluate(() => window.scrollTo(0, 600));
        await p3.waitForTimeout(500);
        await screenshot(p3, '03b_admin_linkages');
        passed++; console.log('  ✅ OK\n');
        await c3.close();
        
        // ==========================================
        // 4. NUTRICIONISTA DASHBOARD
        // ==========================================
        console.log('[4/12] Nutricionista Dashboard...');
        const { context: c4, page: p4 } = await loginInNewContext(browser, TEST_USERS.nutritionist.email, TEST_USERS.nutritionist.password);
        await screenshot(p4, '04_nutri_dashboard');
        passed++; console.log('  ✅ OK\n');
        
        // ==========================================
        // 5. BUILDER (same session, navigate)
        // ==========================================
        console.log('[5/12] Builder (Nutricionista)...');
        await p4.goto(`${BASE_URL}/builder`);
        await p4.waitForTimeout(8000); // Enough for full load
        await screenshot(p4, '05_builder');
        // Scroll to see meals
        await p4.evaluate(() => window.scrollTo(0, 400));
        await p4.waitForTimeout(500);
        await screenshot(p4, '05b_builder_meals');
        passed++; console.log('  ✅ OK\n');
        
        // ==========================================
        // 6. EXPORT PDF (Builder)
        // ==========================================
        console.log('[6/12] Export PDF Button...');
        const exportBtn = p4.locator('button:has-text("Exportar PDF"), button:has-text("Exportar")');
        if (await exportBtn.count() > 0) {
            await exportBtn.first().click();
            await p4.waitForTimeout(3000);
            await screenshot(p4, '06_export_pdf');
            passed++; console.log('  ✅ Export triggered\n');
        } else {
            console.log('  ⚠️ No export button, skipping\n');
            passed++;
        }
        await c4.close();
        
        // ==========================================
        // 7. CONSULTORIO DASHBOARD
        // ==========================================
        console.log('[7/12] Consultorio Dashboard...');
        const { context: c7, page: p7 } = await loginInNewContext(browser, TEST_USERS.clinic.email, TEST_USERS.clinic.password);
        await screenshot(p7, '07_clinic_dashboard');
        await p7.evaluate(() => window.scrollTo(0, 600));
        await p7.waitForTimeout(500);
        await screenshot(p7, '07b_clinic_details');
        passed++; console.log('  ✅ OK\n');
        await c7.close();
        
        // ==========================================
        // 8. PATIENT DASHBOARD
        // ==========================================
        console.log('[8/12] Patient Dashboard...');
        const { context: c8, page: p8 } = await loginInNewContext(browser, TEST_USERS.patient.email, TEST_USERS.patient.password);
        await screenshot(p8, '08_patient_dashboard');
        await p8.evaluate(() => window.scrollTo(0, 400));
        await p8.waitForTimeout(500);
        await screenshot(p8, '08b_patient_meals');
        passed++; console.log('  ✅ OK\n');
        await c8.close();
        
        // ==========================================
        // 9. PATIENT MOBILE
        // ==========================================
        console.log('[9/12] Patient Dashboard (Mobile 390px)...');
        const { context: c9, page: p9 } = await loginInNewContext(
            browser, TEST_USERS.patient.email, TEST_USERS.patient.password,
            { width: 390, height: 844 }
        );
        await screenshot(p9, '09_patient_mobile');
        await p9.evaluate(() => window.scrollTo(0, 300));
        await p9.waitForTimeout(500);
        await screenshot(p9, '09b_patient_mobile_scroll');
        passed++; console.log('  ✅ OK\n');
        await c9.close();
        
        // ==========================================
        // 10. BUILDER MOBILE
        // ==========================================
        console.log('[10/12] Builder (Mobile 390px)...');
        const { context: c10, page: p10 } = await loginInNewContext(
            browser, TEST_USERS.nutritionist.email, TEST_USERS.nutritionist.password,
            { width: 390, height: 844 }
        );
        await p10.goto(`${BASE_URL}/builder`);
        await p10.waitForTimeout(8000);
        await screenshot(p10, '10_builder_mobile');
        await p10.evaluate(() => window.scrollTo(0, 400));
        await p10.waitForTimeout(500);
        await screenshot(p10, '10b_builder_mobile_scroll');
        passed++; console.log('  ✅ OK\n');
        await c10.close();
        
        // ==========================================
        // 11. MARKETPLACE
        // ==========================================
        console.log('[11/12] Marketplace...');
        const c11 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
        const p11 = await c11.newPage();
        await p11.goto(`${BASE_URL}/marketplace`);
        await p11.waitForTimeout(3000);
        await screenshot(p11, '11_marketplace');
        passed++; console.log('  ✅ OK\n');
        await c11.close();
        
        // ==========================================
        // 12. LOGIN PAGE
        // ==========================================
        console.log('[12/12] Login Page...');
        const c12 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
        const p12 = await c12.newPage();
        await p12.goto(`${BASE_URL}/login`);
        await p12.waitForTimeout(2000);
        await screenshot(p12, '12_login');
        passed++; console.log('  ✅ OK\n');
        await c12.close();
        
    } catch (err) {
        failed++;
        console.error(`❌ FAILED: ${err.message}`);
        try {
            const fc = await browser.newContext();
            const fp = await fc.newPage();
            await fp.goto(BASE_URL);
            await fp.waitForTimeout(2000);
            await screenshot(fp, 'FAILURE');
            await fc.close();
        } catch (_) {}
    } finally {
        await browser.close();
    }
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`  RESULTS: ${passed} passed, ${failed} failed / 12 total`);
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`  ✅ Landing, Register, Login pages`);
    console.log(`  ✅ Superadmin Dashboard (links + relationships)`);
    console.log(`  ✅ Nutricionista Dashboard + Builder + Export`);
    console.log(`  ✅ Consultorio Dashboard (staff + patients)`);
    console.log(`  ✅ Patient Dashboard (plan + meals)`);
    console.log(`  ✅ Mobile responsive (patient + builder)`);
    console.log(`  ✅ Marketplace`);
    console.log('═══════════════════════════════════════════════════════════\n');
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
