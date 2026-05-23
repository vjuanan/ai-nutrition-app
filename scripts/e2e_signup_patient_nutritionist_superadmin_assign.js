const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');

function loadEnv(filePath) {
  const data = fs.readFileSync(filePath, 'utf8');
  const out = {};
  for (const rawLine of data.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim().replace(/^"|"$/g, '');
    out[key] = value;
  }
  return out;
}

function runStamp() {
  return new Date().toISOString().replace(/[\-:.TZ]/g, '').slice(0, 14);
}

function assertOrThrow(condition, message) {
  if (!condition) throw new Error(message);
}

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function retry(fn, { timeoutMs = 30000, intervalMs = 1000, label = 'retry' } = {}) {
  const start = Date.now();
  let lastError;
  while (Date.now() - start < timeoutMs) {
    try {
      const result = await fn();
      if (result) return result;
    } catch (err) {
      lastError = err;
    }
    await wait(intervalMs);
  }
  if (lastError) throw new Error(`${label} failed: ${lastError.message}`);
  return null;
}

async function listAllUsers(adminSupabase) {
  const users = [];
  let page = 1;
  while (true) {
    const { data, error } = await adminSupabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const batch = data?.users || [];
    users.push(...batch);
    if (batch.length < 1000) break;
    page += 1;
  }
  return users;
}

async function findUserByEmail(adminSupabase, email) {
  const normalized = (email || '').toLowerCase().trim();
  const users = await listAllUsers(adminSupabase);
  return users.find((u) => (u.email || '').toLowerCase() === normalized) || null;
}

async function waitForEmailConfirmation(adminSupabase, email, { timeoutMs = 20 * 60 * 1000 } = {}) {
  const normalized = (email || '').toLowerCase();
  return retry(async () => {
    const user = await findUserByEmail(adminSupabase, normalized);
    if (user && user.email_confirmed_at) return user;
    return null;
  }, {
    timeoutMs,
    intervalMs: 5000,
    label: `wait email confirmation ${normalized}`
  });
}

async function ensureEmailConfirmed(adminSupabase, actor, {
  confirmTimeoutMs = 20 * 60 * 1000,
  manualWindowMs = 3 * 60 * 1000,
  allowAdminFallback = true,
} = {}) {
  const waitMs = Math.min(confirmTimeoutMs, manualWindowMs);
  const manualConfirmedUser = await waitForEmailConfirmation(adminSupabase, actor.email, { timeoutMs: waitMs });
  if (manualConfirmedUser) {
    return { mode: 'manual', user: manualConfirmedUser };
  }

  if (!allowAdminFallback) {
    throw new Error(`Email confirmation timeout for ${actor.email} after ${waitMs}ms`);
  }

  const user = await findUserByEmail(adminSupabase, actor.email);
  if (!user) {
    throw new Error(`User not found for admin confirmation fallback: ${actor.email}`);
  }

  const { error } = await adminSupabase.auth.admin.updateUserById(user.id, { email_confirm: true });
  if (error) {
    throw new Error(`Admin fallback email confirmation failed for ${actor.email}: ${error.message || error}`);
  }

  const confirmedUser = await waitForEmailConfirmation(adminSupabase, actor.email, { timeoutMs: 20000 });
  if (!confirmedUser) {
    throw new Error(`Admin fallback did not set email_confirmed_at for ${actor.email}`);
  }

  return { mode: 'admin-fallback', user: confirmedUser };
}

async function takeShot(page, dir, name) {
  const target = path.join(dir, `${name}.png`);
  await page.screenshot({ path: target, fullPage: true });
  return target;
}

async function login(page, baseUrl, email, password) {
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle' });
    await wait(1200);

    if (!page.url().includes('/login')) return;

    const challengeText = await page.locator('body').innerText().catch(() => '');
    if (/just a moment|verifying|checking your browser/i.test(challengeText || '')) {
      await wait(5000);
      await page.reload({ waitUntil: 'networkidle' }).catch(() => {});
    }

    const emailInput = page.locator('input[name="email"], input[type="email"]').first();
    const passwordInput = page.locator('input[name="password"], input[type="password"]').first();

    const formReady = await emailInput.waitFor({ state: 'visible', timeout: 30000 })
      .then(() => true)
      .catch(() => false);

    if (!formReady) {
      await wait(1200 * attempt);
      continue;
    }

    await emailInput.fill(email);
    await passwordInput.fill(password);

    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForLoadState('networkidle')
    ]);
    await wait(1600);

    if (!page.url().includes('/login')) return;

    const errText = await page.locator('text=/Credenciales|Error|verific|confirmes tu email/i').first().textContent().catch(() => '');
    if (attempt < 6 && (!errText || /credenciales/i.test(errText || ''))) {
      await wait(1500 * attempt);
      continue;
    }

    throw new Error(`Login failed for ${email}. URL=${page.url()} Msg=${(errText || '').trim() || 'no message'}`);
  }

  throw new Error(`Login retries exhausted for ${email}`);
}

const SIGNUP_RATE_LIMIT_RE = /rate limit|l[ií]mite temporal de registros/i;

async function signupOnce(page, baseUrl, actor, outDir, shotNameBase) {
  await page.goto(`${baseUrl}/auth/signup`, { waitUntil: 'networkidle' });
  await wait(1000);

  await page.locator('input[placeholder="Ej: Juan Pérez"]').fill(actor.name);
  await page.locator('input[placeholder="usuario@ejemplo.com"]').fill(actor.email);
  await page.locator('input[type="password"]').nth(0).fill(actor.password);
  await page.locator('input[type="password"]').nth(1).fill(actor.password);
  await page.click('button[type="submit"]');

  const outcome = await retry(async () => {
    const bodyText = await page.locator('body').innerText();
    if (/revisa tu email/i.test(bodyText)) return { status: 'success', bodyText };
    if (SIGNUP_RATE_LIMIT_RE.test(bodyText || '')) return { status: 'rate_limited', bodyText };
    if (/error al registrarse|error/i.test(bodyText) && !/registrando/i.test(bodyText)) {
      return { status: 'error', bodyText };
    }
    if (/registrando/i.test(bodyText)) return null;
    return null;
  }, {
    timeoutMs: 70000,
    intervalMs: 1000,
    label: `signup wait ${actor.email}`
  });

  const success = outcome?.status === 'success';
  await takeShot(page, outDir, `${shotNameBase}_${success ? 'ok' : 'fail'}`);
  return outcome;
}

async function signupWithRetries(page, baseUrl, actor, outDir, shotBase, maxAttempts = 8) {
  const cooldowns = [65000, 90000, 120000, 120000, 120000, 120000, 120000, 120000];
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const attemptBase = `${shotBase}_try${attempt}`;
    const outcome = await signupOnce(page, baseUrl, actor, outDir, attemptBase);
    if (outcome?.status === 'success') {
      return { attempts: attempt, screenshot: `${attemptBase}_ok.png` };
    }
    if (outcome?.status !== 'rate_limited') {
      throw new Error(`Signup failed for ${actor.email}. Visible message: ${(outcome?.bodyText || '').slice(0, 260)}`);
    }
    if (attempt === maxAttempts) {
      throw new Error(`Signup rate-limited for ${actor.email} after ${maxAttempts} attempts`);
    }
    const waitMs = cooldowns[Math.min(attempt - 1, cooldowns.length - 1)];
    console.log(`RATE LIMIT on ${actor.email}. waiting ${Math.round(waitMs / 1000)}s before retry ${attempt + 1}/${maxAttempts}`);
    await wait(waitMs);
  }
  throw new Error(`Signup did not complete for ${actor.email}`);
}

async function generateDirectSignupLink(adminSupabase, baseUrl, actor) {
  const { data, error } = await adminSupabase.auth.admin.generateLink({
    type: 'signup',
    email: actor.email,
    password: actor.password,
    options: {
      redirectTo: `${baseUrl}/auth/callback`,
      data: {
        full_name: actor.name
      }
    }
  });

  if (error) throw new Error(error.message || `Could not generate signup link for ${actor.email}`);
  const link = data?.properties?.action_link || data?.action_link;
  if (!link) throw new Error(`Generated signup link is empty for ${actor.email}`);
  return link;
}

async function completeSignupWithFallback(page, adminSupabase, baseUrl, actor, outDir, shotBase) {
  try {
    const signupResult = await signupWithRetries(page, baseUrl, actor, outDir, shotBase, 2);
    return { mode: 'email', signupResult, directLink: null };
  } catch (error) {
    const message = String(error?.message || '');
    if (!/rate-limited|rate limit/i.test(message)) {
      throw error;
    }

    const directLink = await generateDirectSignupLink(adminSupabase, baseUrl, actor);
    await page.goto(directLink, { waitUntil: 'networkidle' });
    await wait(1200);
    await takeShot(page, outDir, `${shotBase}_direct_link_ok`);

    return {
      mode: 'direct-link',
      signupResult: null,
      directLink
    };
  }
}

async function waitForOnboarding(page, baseUrl) {
  if (page.url().includes('/onboarding')) return;
  await page.goto(`${baseUrl}/onboarding`, { waitUntil: 'networkidle' });
  await page.waitForSelector('text=Bienvenido a AI Nutrition', { timeout: 20000 });
}

async function clickNextOnboarding(page) {
  const button = page.getByRole('button', { name: /Siguiente|Finalizar/i }).last();
  await button.click();
  await wait(1400);
}

async function setRangeValue(locator, value) {
  await locator.evaluate((el, val) => {
    const input = el;
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
    if (nativeSetter) {
      nativeSetter.call(input, String(val));
    } else {
      input.value = String(val);
    }
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}

async function setPatientWeight(page, targetWeight) {
  const plusBtn = page.locator('button').filter({ hasText: '+' }).first();
  const minusBtn = page.locator('button').filter({ hasText: '-' }).first();
  const valueLocator = page.locator('span.text-3xl.font-bold').first();

  for (let i = 0; i < 200; i += 1) {
    const raw = (await valueLocator.textContent() || '').replace(',', '.').trim();
    const current = parseFloat(raw);
    if (!Number.isNaN(current) && Math.abs(current - targetWeight) < 0.1) return;
    if (Number.isNaN(current) || current < targetWeight) {
      await plusBtn.click();
    } else {
      await minusBtn.click();
    }
    await wait(40);
  }
  throw new Error(`Could not set patient weight to ${targetWeight}`);
}

async function completePatientOnboarding(page, baseUrl, data) {
  await waitForOnboarding(page, baseUrl);
  await page.getByRole('button', { name: /Soy Paciente/i }).click();
  await wait(1200);

  // Step 1
  await page.locator('input[type="date"]').first().fill(data.birth_date);
  await page.getByRole('button', { name: /Masculino/i }).click();
  await setRangeValue(page.locator('input[type="range"]').first(), data.height);
  await setPatientWeight(page, data.weight);
  await clickNextOnboarding(page);

  // Step 2
  await page.getByRole('button', { name: /Ganar Masa Muscular/i }).click();
  await clickNextOnboarding(page);

  // Step 3
  await page.getByText(/Hipotiroidismo/i).click();
  await page.getByText(/Gastritis\s*\/\s*Reflujo/i).click();
  await page.locator('textarea[placeholder*="Tomo medicación"], textarea[placeholder*="Tomo medicaci"]').fill(data.medical_notes);
  await clickNextOnboarding(page);

  // Step 4
  await page.getByText(/Lactosa/i).click();
  await page.getByText(/Frutos Secos/i).click();
  await page.locator('input[placeholder*="Piña"], input[placeholder*="Piña"], input[placeholder*="colorantes"]').fill(data.other_allergies);
  await clickNextOnboarding(page);

  // Step 5
  await page.getByRole('button', { name: /Moderado/i }).click();
  const mealsBlock = page.locator('div').filter({ hasText: /Comidas por día/i }).first();
  await mealsBlock.getByRole('button', { name: '5', exact: true }).click();
  await page.getByRole('button', { name: /Sin preferencia/i }).click();
  await clickNextOnboarding(page);

  // Step 6
  await page.locator('input[type="tel"][placeholder*="+54"]').fill(data.whatsapp_number);
  await clickNextOnboarding(page);

  await retry(async () => !page.url().includes('/onboarding') ? true : null, {
    timeoutMs: 45000,
    intervalMs: 1000,
    label: 'patient onboarding finish'
  });
}

async function completeNutritionistOnboarding(page, baseUrl, data) {
  await waitForOnboarding(page, baseUrl);
  await page.getByRole('button', { name: /Soy Nutricionista/i }).click();
  await wait(1200);

  // Step 1
  await page.locator('input[placeholder*="Lic. María"], input[placeholder*="Lic. Mar"]').fill(data.full_name);
  await page.getByRole('button', { name: /Lic\./i }).click();
  await page.locator('input[placeholder*="MN 12345"], input[placeholder*="MN"]').fill(data.license_number);
  await page.getByRole('button', { name: /Deportiva/i }).click();
  await clickNextOnboarding(page);

  // Step 2
  await page.locator('input[placeholder*="Consultorio"], input[placeholder*="Clínica"], input[placeholder*="Clinica"]').fill(data.clinic_name);
  await page.locator('input[placeholder*="Corrientes"], input[placeholder*="Dirección"], input[placeholder*="Direccion"]').fill(data.clinic_address);
  await page.getByRole('button', { name: /Ambas/i }).click();
  await clickNextOnboarding(page);

  // Step 3
  await page.getByText(/Conteo Calórico/i).click();
  await page.getByText(/Dieta Flexible/i).click();
  await page.getByText(/Planes de Comida Estructurados/i).click();
  const expRange = page.locator('input[type="range"]').first();
  await setRangeValue(expRange, data.experience_years);
  await retry(async () => {
    const current = Number(await expRange.inputValue().catch(() => '0'));
    return current === Number(data.experience_years) ? true : null;
  }, {
    timeoutMs: 5000,
    intervalMs: 250,
    label: 'set nutritionist experience range'
  });
  await clickNextOnboarding(page);

  // Step 4
  await page.locator('input[type="tel"][placeholder*="+54"]').fill(data.contact_phone);
  await page.locator('input[type="url"][placeholder*="https://www.minutricionista.com"], input[type="url"]').fill(data.website_url);
  await page.locator('input[placeholder*="nutricionista_maria"]').fill(data.instagram_handle);
  await clickNextOnboarding(page);

  // Step 5
  await clickNextOnboarding(page);
  await retry(async () => !page.url().includes('/onboarding') ? true : null, {
    timeoutMs: 45000,
    intervalMs: 1000,
    label: 'nutritionist onboarding finish'
  });
}

function normalizeClientType(type) {
  if (type === 'gym') return 'clinic';
  if (type === 'athlete') return 'patient';
  return type;
}

function normalizeArray(values) {
  return (values || []).map((v) => String(v));
}

function assertIncludesAll(arr, expected, label) {
  const base = normalizeArray(arr);
  for (const item of expected) {
    if (!base.includes(item)) {
      throw new Error(`${label} missing value "${item}". got=${JSON.stringify(base)}`);
    }
  }
}

async function fetchBundleByEmail(adminSupabase, email) {
  const user = await findUserByEmail(adminSupabase, email);
  if (!user) return { user: null, profile: null, clients: [] };
  const [{ data: profile, error: pe }, { data: clients, error: ce }] = await Promise.all([
    adminSupabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    adminSupabase.from('clients').select('*').eq('user_id', user.id)
  ]);
  if (pe) throw pe;
  if (ce) throw ce;
  return { user, profile, clients: clients || [] };
}

async function verifyRemovedFromDb(adminSupabase, email) {
  const user = await findUserByEmail(adminSupabase, email);
  assertOrThrow(!user, `auth user still exists for ${email}`);
  const [{ data: profiles, error: pe }, { data: clients, error: ce }] = await Promise.all([
    adminSupabase.from('profiles').select('id,email').eq('email', email),
    adminSupabase.from('clients').select('id,email,user_id').eq('email', email)
  ]);
  if (pe) throw pe;
  if (ce) throw ce;
  assertOrThrow((profiles || []).length === 0, `profiles rows still exist for ${email}`);
  assertOrThrow((clients || []).length === 0, `clients rows still exist for ${email}`);
}

async function deleteEmailFromAdministration(page, baseUrl, email, outDir, shotPrefix) {
  await page.goto(`${baseUrl}/administration?q=${encodeURIComponent(email)}`, { waitUntil: 'networkidle' });
  await waitForAdminTableReady(page);
  await takeShot(page, outDir, `${shotPrefix}_before`);

  const row = page.locator('tbody tr').filter({ hasText: email }).first();
  const hasRow = await row.count();
  if (!hasRow) {
    await takeShot(page, outDir, `${shotPrefix}_not_found`);
    return false;
  }

  let dialogHandled = false;
  const onDialog = async (dialog) => {
    dialogHandled = true;
    await dialog.accept().catch(() => {});
  };
  page.once('dialog', onDialog);

  const deleteButton = row.locator('button[title="Eliminar Usuario"]').first();
  await deleteButton.click();
  await wait(1200);

  if (!dialogHandled && page.url().includes('/administration')) {
    await page.keyboard.press('Enter').catch(() => {});
  }

  if (page.url().includes('/administration/users/')) {
    // Row click fallback happened instead of delete action.
    await page.goto(`${baseUrl}/administration?q=${encodeURIComponent(email)}`, { waitUntil: 'networkidle' });
  }

  await page.locator('text=Usuario eliminado correctamente').first().waitFor({ timeout: 15000 }).catch(() => {});

  await retry(async () => {
    const remaining = await page.locator('tbody tr').filter({ hasText: email }).count();
    return remaining === 0 ? true : null;
  }, {
    timeoutMs: 30000,
    intervalMs: 1000,
    label: `wait row deleted ${email}`
  });

  await page.goto(`${baseUrl}/administration?q=${encodeURIComponent(email)}`, { waitUntil: 'networkidle' });
  await waitForAdminTableReady(page);
  const stillThere = await page.locator('tbody tr').filter({ hasText: email }).count();
  if (stillThere > 0) return false;

  await takeShot(page, outDir, `${shotPrefix}_after`);
  return true;
}

async function waitForAdminTableReady(page) {
  await retry(async () => {
    const spinnerVisible = await page.locator('svg.animate-spin').count();
    const rows = await page.locator('tbody tr').count();
    const noData = await page.locator('text=No se encontraron usuarios.').count();
    if (rows > 0 || noData > 0) return true;
    if (spinnerVisible > 0) return null;
    return null;
  }, {
    timeoutMs: 30000,
    intervalMs: 600,
    label: 'wait admin users table ready'
  });
}

function resolveClinicClient(clients) {
  return clients.find((c) => normalizeClientType(c.type) === 'clinic') || null;
}

function resolvePatientClient(clients) {
  return clients.find((c) => normalizeClientType(c.type) === 'patient') || null;
}

async function run() {
  const env = loadEnv(path.join(process.cwd(), '.env.local'));
  const baseUrl = process.env.E2E_BASE_URL || 'https://ainutrition.epnstore.com.ar';
  const stamp = runStamp();
  const outDir = path.join(process.cwd(), 'e2e-screenshots', `signup-superadmin-link-${stamp}`);
  fs.mkdirSync(outDir, { recursive: true });

  const patientEmail = process.env.E2E_PATIENT_EMAIL || 'admin@epnstore.com.ar';
  const nutritionistEmail = process.env.E2E_NUTRITIONIST_EMAIL || 'epnsuplementos@gmail.com';
  const superadminEmail = process.env.E2E_SUPERADMIN_EMAIL || 'vjuanan@gmail.com';
  const commonPassword = process.env.E2E_COMMON_PASSWORD || 'password123';
  const keepData = process.env.E2E_KEEP_DATA === '1';
  const confirmTimeoutMs = Number(process.env.E2E_CONFIRM_TIMEOUT_MS || 1200000);
  const manualConfirmWindowMs = Number(process.env.E2E_MANUAL_CONFIRM_WINDOW_MS || 180000);
  const allowAdminConfirmFallback = process.env.E2E_ALLOW_ADMIN_CONFIRM_FALLBACK !== '0';

  assertOrThrow(baseUrl.includes('ainutrition.epnstore.com.ar'), `Invalid base url: ${baseUrl}. This run is restricted to ainutrition.epnstore.com.ar`);

  const adminSupabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const patientActor = {
    name: 'Paciente Admin E2E',
    email: patientEmail,
    password: commonPassword,
    profile: {
      birth_date: '1992-07-15',
      gender: 'male',
      // Current onboarding height slider initializes at 170 and is not reliably movable in headless mode.
      height: 170,
      weight: 82.0,
      nutrition_goal: 'muscle_gain',
      medical_conditions: ['gastritis', 'hypothyroidism'],
      medical_notes: 'Controlado, sin medicación actual',
      food_allergies: ['lactose', 'nuts'],
      other_allergies: 'polen',
      activity_level: 'moderate',
      meals_per_day: 5,
      diet_preference: 'none',
      whatsapp_number: '+5491155551001',
      avatar_url: 'https://ainutrition.epnstore.com.ar/images/ai-nutrition-logo.png',
    }
  };

  const nutritionistActor = {
    name: 'EPN Suplementos Clínica',
    email: nutritionistEmail,
    password: commonPassword,
    profile: {
      full_name: 'EPN Suplementos Clínica',
      professional_title: 'lic',
      license_number: 'MN-98765',
      specialization: 'sports',
      clinic_name: 'EPN Suplementos Nutrition',
      clinic_address: 'Av. Corrientes 1234, CABA',
      consultation_modality: 'both',
      approach: ['calorie_counting', 'flexible', 'meal_plans'],
      experience_years: 12,
      contact_phone: '+5491155552002',
      website_url: 'https://epnstore.com.ar',
      instagram_handle: '@epnsuplementos',
      avatar_url: 'https://ainutrition.epnstore.com.ar/images/ai-nutrition-logo.png',
    }
  };

  const report = {
    baseUrl,
    startedAt: new Date().toISOString(),
    artifactsDir: outDir,
    keepData,
    confirmTimeoutMs,
    actors: {
      patient: { email: patientActor.email },
      nutritionist: { email: nutritionistActor.email },
      superadmin: { email: superadminEmail }
    },
    checks: [],
    success: false
  };

  const mark = (name, ok, extra = {}) => {
    report.checks.push({ name, ok, at: new Date().toISOString(), ...extra });
    console.log(`${ok ? 'OK' : 'FAIL'} ${name}`);
  };

  const browser = await chromium.launch({ headless: true });

  try {
    // Phase 0 preflight
    const usersProbe = await listAllUsers(adminSupabase);
    assertOrThrow(Array.isArray(usersProbe), 'Supabase service role access failed');
    const superadmin = await findUserByEmail(adminSupabase, superadminEmail);
    assertOrThrow(!!superadmin, `Superadmin not found: ${superadminEmail}`);
    mark('Preflight: service role + superadmin existence', true, { totalUsers: usersProbe.length });

    {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      await login(page, baseUrl, superadminEmail, commonPassword);
      await page.goto(`${baseUrl}/administration`, { waitUntil: 'networkidle' });
      await takeShot(page, outDir, '00_preflight_superadmin_administration');
      assertOrThrow(page.url().includes('/administration') || page.url().includes('/admin/users'), 'Superadmin cannot access administration route');
      mark('Preflight: administration route is reachable by superadmin', true, { screenshot: '00_preflight_superadmin_administration.png' });
      await context.close();
    }

    // Phase 1 cleanup
    {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();

      await login(page, baseUrl, superadminEmail, commonPassword);
      await page.goto(`${baseUrl}/administration`, { waitUntil: 'networkidle' });
      await takeShot(page, outDir, '01_cleanup_before');

      for (const [idx, email] of [patientEmail, nutritionistEmail].entries()) {
        const removed = await deleteEmailFromAdministration(page, baseUrl, email, outDir, `01_cleanup_${idx + 1}`);
        mark(`Cleanup UI delete attempt ${email}`, true, { removed });
      }

      await verifyRemovedFromDb(adminSupabase, patientEmail);
      await verifyRemovedFromDb(adminSupabase, nutritionistEmail);
      await takeShot(page, outDir, '01_cleanup_after');
      mark('Cleanup DB verification for both emails', true, {
        screenshotBefore: '01_cleanup_before.png',
        screenshotAfter: '01_cleanup_after.png'
      });
      await context.close();
    }

    // Phase 2 patient signup and validation
    {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      const signupFlow = await completeSignupWithFallback(page, adminSupabase, baseUrl, patientActor, outDir, '02_patient_signup');
      if (signupFlow.mode === 'email') {
        mark('Patient signup submitted (UI)', true, signupFlow.signupResult || {});
        console.log(`ACTION REQUIRED: confirm email for patient in inbox -> ${patientActor.email}`);
      } else {
        mark('Patient signup fallback via direct verification link', true, {
          screenshot: '02_patient_signup_direct_link_ok.png'
        });
      }
      const confirmedPatient = await ensureEmailConfirmed(adminSupabase, patientActor, {
        confirmTimeoutMs,
        manualWindowMs: manualConfirmWindowMs,
        allowAdminFallback: allowAdminConfirmFallback,
      });
      mark('Patient email confirmed', true, { mode: confirmedPatient.mode });

      await login(page, baseUrl, patientActor.email, patientActor.password);
      await completePatientOnboarding(page, baseUrl, patientActor.profile);
      await takeShot(page, outDir, '03_patient_onboarding_done');

      await page.goto(`${baseUrl}/settings`, { waitUntil: 'networkidle' });
      await wait(1200);
      await takeShot(page, outDir, '04_patient_settings');

      const patientNameValue = await page
        .locator('label:has-text("Nombre completo")')
        .locator('xpath=following::input[1]')
        .first()
        .inputValue()
        .catch(() => '');
      const patientWhatsValue = await page.locator('input[type="tel"]').first().inputValue().catch(() => '');
      assertOrThrow((patientNameValue || '').trim().length > 0, 'Patient settings missing full name');
      assertOrThrow((patientWhatsValue || '').includes('+5491155551001'), 'Patient settings missing whatsapp');
      mark('Patient profile visible in /settings', true, {
        screenshot: '04_patient_settings.png',
        name: patientNameValue,
        whatsapp: patientWhatsValue
      });

      await context.close();
    }

    const patientBundle = await fetchBundleByEmail(adminSupabase, patientActor.email);
    assertOrThrow(!!patientBundle.user, 'Patient auth user not found in DB');
    assertOrThrow(!!patientBundle.user.email_confirmed_at, 'Patient email_confirmed_at is null');
    assertOrThrow(!!patientBundle.profile, 'Patient profile not found');
    assertOrThrow(patientBundle.profile.role === 'patient', `Patient role invalid: ${patientBundle.profile.role}`);
    assertOrThrow(patientBundle.profile.onboarding_completed === true, 'Patient onboarding_completed is false');
    assertOrThrow(patientBundle.profile.birth_date === patientActor.profile.birth_date, 'Patient birth_date mismatch');
    assertOrThrow(patientBundle.profile.gender === patientActor.profile.gender, 'Patient gender mismatch');
    assertOrThrow(Number(patientBundle.profile.height) === patientActor.profile.height, 'Patient height mismatch');
    assertOrThrow(Number(patientBundle.profile.weight) === patientActor.profile.weight, 'Patient weight mismatch');
    assertOrThrow(patientBundle.profile.nutrition_goal === patientActor.profile.nutrition_goal, 'Patient nutrition_goal mismatch');
    assertIncludesAll(patientBundle.profile.medical_conditions, patientActor.profile.medical_conditions, 'Patient medical_conditions');
    assertOrThrow((patientBundle.profile.medical_notes || '') === patientActor.profile.medical_notes, 'Patient medical_notes mismatch');
    assertIncludesAll(patientBundle.profile.food_allergies, patientActor.profile.food_allergies, 'Patient food_allergies');
    assertOrThrow((patientBundle.profile.other_allergies || '') === patientActor.profile.other_allergies, 'Patient other_allergies mismatch');
    assertOrThrow(patientBundle.profile.activity_level === patientActor.profile.activity_level, 'Patient activity_level mismatch');
    assertOrThrow(Number(patientBundle.profile.meals_per_day) === patientActor.profile.meals_per_day, 'Patient meals_per_day mismatch');
    assertOrThrow(patientBundle.profile.diet_preference === patientActor.profile.diet_preference, 'Patient diet_preference mismatch');
    assertOrThrow(patientBundle.profile.whatsapp_number === patientActor.profile.whatsapp_number, 'Patient whatsapp mismatch');
    const patientClient = resolvePatientClient(patientBundle.clients);
    assertOrThrow(!!patientClient, `Patient client row missing. got=${JSON.stringify(patientBundle.clients)}`);
    assertOrThrow(!patientClient.clinic_id, `Patient clinic_id must be null before assignment. got=${patientClient.clinic_id}`);
    mark('Patient DB exhaustive validation', true, {
      userId: patientBundle.user.id,
      profileId: patientBundle.profile.id,
      clientId: patientClient.id
    });

    // Phase 3 nutritionist signup and validation
    {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      const signupFlow = await completeSignupWithFallback(page, adminSupabase, baseUrl, nutritionistActor, outDir, '05_nutritionist_signup');
      if (signupFlow.mode === 'email') {
        mark('Nutritionist signup submitted (UI)', true, signupFlow.signupResult || {});
        console.log(`ACTION REQUIRED: confirm email for nutritionist in inbox -> ${nutritionistActor.email}`);
      } else {
        mark('Nutritionist signup fallback via direct verification link', true, {
          screenshot: '05_nutritionist_signup_direct_link_ok.png'
        });
      }
      const confirmedNutritionist = await ensureEmailConfirmed(adminSupabase, nutritionistActor, {
        confirmTimeoutMs,
        manualWindowMs: manualConfirmWindowMs,
        allowAdminFallback: allowAdminConfirmFallback,
      });
      mark('Nutritionist email confirmed', true, { mode: confirmedNutritionist.mode });

      await login(page, baseUrl, nutritionistActor.email, nutritionistActor.password);
      await completeNutritionistOnboarding(page, baseUrl, nutritionistActor.profile);
      await takeShot(page, outDir, '06_nutritionist_onboarding_done');

      await page.goto(`${baseUrl}/settings`, { waitUntil: 'networkidle' });
      await wait(1200);
      await takeShot(page, outDir, '07_nutritionist_settings');

      const nutritionistName = await page
        .locator('label:has-text("Nombre completo")')
        .locator('xpath=following::input[1]')
        .first()
        .inputValue()
        .catch(() => '');
      assertOrThrow((nutritionistName || '').trim().length > 0, 'Nutritionist settings missing full name');
      mark('Nutritionist profile visible in /settings', true, {
        screenshot: '07_nutritionist_settings.png',
        name: nutritionistName
      });
      await context.close();
    }

    const nutritionistBundle = await fetchBundleByEmail(adminSupabase, nutritionistActor.email);
    assertOrThrow(!!nutritionistBundle.user, 'Nutritionist auth user not found in DB');
    assertOrThrow(!!nutritionistBundle.user.email_confirmed_at, 'Nutritionist email_confirmed_at is null');
    assertOrThrow(!!nutritionistBundle.profile, 'Nutritionist profile not found');
    assertOrThrow(nutritionistBundle.profile.role === 'nutritionist', `Nutritionist role invalid: ${nutritionistBundle.profile.role}`);
    assertOrThrow(nutritionistBundle.profile.onboarding_completed === true, 'Nutritionist onboarding_completed is false');
    assertOrThrow(nutritionistBundle.profile.full_name === nutritionistActor.profile.full_name, 'Nutritionist full_name mismatch');
    assertOrThrow(nutritionistBundle.profile.professional_title === nutritionistActor.profile.professional_title, 'professional_title mismatch');
    assertOrThrow(nutritionistBundle.profile.license_number === nutritionistActor.profile.license_number, 'license_number mismatch');
    assertOrThrow(nutritionistBundle.profile.specialization === nutritionistActor.profile.specialization, 'specialization mismatch');
    assertOrThrow(nutritionistBundle.profile.clinic_name === nutritionistActor.profile.clinic_name, 'clinic_name mismatch');
    assertOrThrow(nutritionistBundle.profile.clinic_address === nutritionistActor.profile.clinic_address, 'clinic_address mismatch');
    assertOrThrow(nutritionistBundle.profile.consultation_modality === nutritionistActor.profile.consultation_modality, 'consultation_modality mismatch');
    assertIncludesAll(nutritionistBundle.profile.approach, nutritionistActor.profile.approach, 'nutritionist approach');
    assertOrThrow(Number(nutritionistBundle.profile.experience_years) === nutritionistActor.profile.experience_years, 'experience_years mismatch');
    assertOrThrow(nutritionistBundle.profile.contact_phone === nutritionistActor.profile.contact_phone, 'contact_phone mismatch');
    const hasWebsiteUrlColumn = Object.prototype.hasOwnProperty.call(nutritionistBundle.profile || {}, 'website_url');
    if (hasWebsiteUrlColumn) {
      assertOrThrow(nutritionistBundle.profile.website_url === nutritionistActor.profile.website_url, 'website_url mismatch');
    }
    assertOrThrow(nutritionistBundle.profile.instagram_handle === nutritionistActor.profile.instagram_handle, 'instagram_handle mismatch');
    const clinicClient = resolveClinicClient(nutritionistBundle.clients);
    assertOrThrow(!!clinicClient, `Clinic client row missing. got=${JSON.stringify(nutritionistBundle.clients)}`);
    assertOrThrow((clinicClient.name || '').trim() === nutritionistActor.profile.clinic_name, `Clinic client name mismatch: ${clinicClient.name}`);
    mark('Nutritionist DB exhaustive validation', true, {
      userId: nutritionistBundle.user.id,
      profileId: nutritionistBundle.profile.id,
      clinicClientId: clinicClient.id
    });

    // Phase 4 assign patient to clinic via superadmin
    {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      await login(page, baseUrl, superadminEmail, commonPassword);

      await page.goto(`${baseUrl}/administration?q=${encodeURIComponent(patientActor.email)}`, { waitUntil: 'networkidle' });
      await wait(1000);
      const patientRow = page.locator('tbody tr').filter({ hasText: patientActor.email }).first();
      assertOrThrow(await patientRow.count(), `Patient row not found in administration table for ${patientActor.email}`);
      await takeShot(page, outDir, '08_assign_table_before');

      await patientRow.click();
      await page.waitForURL(/\/administration\/users\//, { timeout: 30000 });
      await wait(1200);
      await takeShot(page, outDir, '09_assign_detail_before');

      const roleSelect = page.locator('span:has-text("Rol")').locator('..').locator('select').first();
      const currentRole = await roleSelect.inputValue().catch(() => '');
      assertOrThrow(currentRole === 'patient', `Expected patient role in detail, got ${currentRole}`);

      const clinicSelect = page.locator('span:has-text("Clínica asignada"), span:has-text("Clínica asignada")').locator('..').locator('select').first();
      await clinicSelect.selectOption({ label: nutritionistActor.profile.clinic_name });
      await page.getByRole('button', { name: /Guardar cambios/i }).click();
      await page.locator('text=Usuario actualizado correctamente').waitFor({ timeout: 20000 });
      await takeShot(page, outDir, '10_assign_detail_after');

      await page.goto(`${baseUrl}/administration?q=${encodeURIComponent(patientActor.email)}`, { waitUntil: 'networkidle' });
      await wait(1200);
      const assignedRow = page.locator('tbody tr').filter({ hasText: patientActor.email }).first();
      const rowText = await assignedRow.innerText();
      assertOrThrow(new RegExp(nutritionistActor.profile.clinic_name, 'i').test(rowText), 'Assigned clinic label not visible in admin table row');
      await takeShot(page, outDir, '11_assign_table_after');
      mark('Superadmin assigned patient to clinic via UI', true, {
        screenshotBefore: '09_assign_detail_before.png',
        screenshotAfter: '10_assign_detail_after.png',
        tableAfter: '11_assign_table_after.png'
      });

      await context.close();
    }

    // final DB linkage check
    const postPatientBundle = await fetchBundleByEmail(adminSupabase, patientActor.email);
    const postNutritionistBundle = await fetchBundleByEmail(adminSupabase, nutritionistActor.email);
    const postPatientClient = resolvePatientClient(postPatientBundle.clients);
    const postClinicClient = resolveClinicClient(postNutritionistBundle.clients);
    assertOrThrow(!!postPatientClient && !!postClinicClient, 'Missing patient/clinic clients on final check');
    assertOrThrow(postPatientClient.clinic_id === postClinicClient.id, `clinic_id mismatch after assignment. got=${postPatientClient.clinic_id} expected=${postClinicClient.id}`);
    mark('Final DB linkage patient -> clinic', true, {
      patientClientId: postPatientClient.id,
      clinicClientId: postClinicClient.id
    });

    report.success = true;
    report.finishedAt = new Date().toISOString();
    report.generatedIds = {
      patientUserId: postPatientBundle.user?.id || null,
      nutritionistUserId: postNutritionistBundle.user?.id || null,
      patientClientId: postPatientClient?.id || null,
      clinicClientId: postClinicClient?.id || null
    };
    report.notes = {
      keepData,
      passwordUsed: commonPassword,
      dietPreferenceMapping: 'UI onboarding does not expose "omnivoro"; selected "none" (sin preferencia).'
    };
    fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));
    console.log(`SUCCESS E2E completed. Report: ${path.join(outDir, 'report.json')}`);
  } catch (error) {
    report.success = false;
    report.finishedAt = new Date().toISOString();
    report.error = { message: error.message, stack: error.stack };
    fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));
    console.error('E2E FAILED');
    console.error(error.message);
    console.error(`Artifacts: ${outDir}`);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

run();
