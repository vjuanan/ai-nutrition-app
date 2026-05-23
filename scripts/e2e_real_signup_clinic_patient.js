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

const SIGNUP_RATE_LIMIT_RE = /rate limit|l[ií]mite temporal de registros/i;

function isSignupRateLimitedText(text) {
  return SIGNUP_RATE_LIMIT_RE.test(text || '');
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

function parseInboxEmail(value) {
  const normalized = (value || '').trim().toLowerCase();
  if (!normalized || !normalized.includes('@')) return null;
  const [localPart, domainPart] = normalized.split('@');
  if (!localPart || !domainPart) return null;
  return { localPart, domainPart };
}

function aliasFromInbox(inboxEmail, tag, stamp) {
  const parsed = parseInboxEmail(inboxEmail);
  if (!parsed) return null;
  return `${parsed.localPart}+${tag}.${stamp}@${parsed.domainPart}`;
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
  const normalized = email.toLowerCase();
  const users = await listAllUsers(adminSupabase);
  return users.find((u) => (u.email || '').toLowerCase() === normalized) || null;
}

async function waitForEmailConfirmation(adminSupabase, email, { timeoutMs = 15 * 60 * 1000 } = {}) {
  const normalized = (email || '').toLowerCase();
  const confirmedUser = await retry(async () => {
    const user = await findUserByEmail(adminSupabase, normalized);
    if (user && user.email_confirmed_at) return user;
    return null;
  }, {
    timeoutMs,
    intervalMs: 5000,
    label: `wait email confirmation ${normalized}`
  });

  return confirmedUser || null;
}

async function takeShot(page, dir, name) {
  const target = path.join(dir, `${name}.png`);
  await page.screenshot({ path: target, fullPage: true });
  return target;
}

async function signupFromUI(page, baseUrl, actor, dir, shotPrefix) {
  await page.goto(`${baseUrl}/auth/signup`, { waitUntil: 'networkidle' });
  await wait(1200);

  const fullNameInput = page.locator('input[placeholder="Ej: Juan Pérez"]');
  const emailInput = page.locator('input[placeholder="usuario@ejemplo.com"]');
  const passwordInput = page.locator('input[type="password"]').nth(0);
  const confirmPasswordInput = page.locator('input[type="password"]').nth(1);

  await fullNameInput.waitFor({ state: 'visible', timeout: 15000 });
  await fullNameInput.fill(actor.name);
  await emailInput.fill(actor.email);
  await passwordInput.fill(actor.password);
  await confirmPasswordInput.fill(actor.password);

  await page.click('button[type="submit"]');
  await wait(800);

  const outcome = await retry(async () => {
    const bodyText = await page.locator('body').innerText();
    if (/revisa tu email/i.test(bodyText)) return { status: 'success', bodyText };
    if (isSignupRateLimitedText(bodyText)) return { status: 'rate_limited', bodyText };
    if (/error al registrarse|error/i.test(bodyText) && !/registrando/i.test(bodyText)) {
      return { status: 'error', bodyText };
    }
    if (/registrando/i.test(bodyText)) return null;
    return null;
  }, { timeoutMs: 60000, intervalMs: 1000, label: `signup wait ${actor.email}` });

  const bodyText = outcome?.bodyText || await page.locator('body').innerText();
  const success = outcome?.status === 'success';
  const rateLimited = outcome?.status === 'rate_limited';
  const genericError = outcome?.status === 'error';

  await takeShot(page, dir, `${shotPrefix}_${success ? 'ok' : 'fail'}`);

  if (!success) {
    if (rateLimited) {
      throw new Error(`[RATE_LIMIT_SIGNUP] Signup bloqueado por rate limit para ${actor.email}`);
    }
    if (genericError) {
      throw new Error(`Signup falló para ${actor.email}. Mensaje visible: ${bodyText.slice(0, 220)}`);
    }
    throw new Error(`Signup no llegó a estado de éxito para ${actor.email}`);
  }
}

async function signupWithRateLimitRetries(page, baseUrl, actor, dir, shotPrefix, {
  maxAttempts = 8,
  cooldownMs = 65000,
} = {}) {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const attemptPrefix = `${shotPrefix}_try${attempt}`;
    try {
      await signupFromUI(page, baseUrl, actor, dir, attemptPrefix);
      return { attempts: attempt, screenshotBase: attemptPrefix };
    } catch (error) {
      const message = error?.message || '';
      const rateLimited = message.includes('[RATE_LIMIT_SIGNUP]');

      if (!rateLimited || attempt >= maxAttempts) {
        throw error;
      }

      console.log(`⏳ Signup rate-limited (${actor.email}), reintentando en ${Math.round(cooldownMs / 1000)}s (intento ${attempt}/${maxAttempts})`);
      await wait(cooldownMs);
    }
  }

  throw new Error(`No se logró signup para ${actor.email} tras ${maxAttempts} intentos`);
}

async function login(page, baseUrl, email, password) {
  let lastError = '';
  for (let attempt = 1; attempt <= 5; attempt += 1) {
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

    const loginInputsReady = await emailInput.waitFor({ state: 'visible', timeout: 30000 })
      .then(() => true)
      .catch(() => false);
    if (!loginInputsReady) {
      lastError = 'Login form no visible';
      await wait(2000 * attempt);
      continue;
    }

    await emailInput.fill(email);
    await passwordInput.fill(password);

    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForLoadState('networkidle')
    ]);

    await wait(1600);

    let currentUrl = page.url();
    if (!currentUrl.includes('/login')) return;

    await wait(2200);
    currentUrl = page.url();
    if (!currentUrl.includes('/login')) return;

    const errorText = await page.locator('text=/Credenciales|verificá|Error|error/i').first().textContent().catch(() => '');
    lastError = (errorText || '').trim();

    if (attempt < 5 && (!lastError || /credenciales incorrectas|verificá/i.test(lastError))) {
      await wait(2000 * attempt);
      continue;
    }

    throw new Error(`Login falló para ${email}. URL=${currentUrl} Msg=${lastError || 'Sin mensaje'}`);
  }

  throw new Error(`Login falló para ${email}. Reintentos agotados. Último error: ${lastError}`);
}

async function completeOnboarding(page, targetRole) {
  if (!page.url().includes('/onboarding')) return;

  if (targetRole === 'nutritionist') {
    await page.getByRole('button', { name: /Soy Nutricionista/i }).click();
  } else {
    await page.getByRole('button', { name: /Soy Paciente/i }).click();
  }
  await wait(1800);

  for (let i = 0; i < 28; i += 1) {
    if (!page.url().includes('/onboarding')) break;

    const nextButton = page.getByRole('button', { name: /Siguiente|Finalizar/i }).last();
    const exists = await nextButton.isVisible().catch(() => false);
    if (!exists) {
      await wait(1200);
      continue;
    }

    await nextButton.click();
    await wait(1600);
  }

  const completed = await retry(async () => (
    !page.url().includes('/onboarding') ? true : null
  ), {
    timeoutMs: 40000,
    intervalMs: 1000,
    label: `wait onboarding finish (${targetRole})`
  });
  assertOrThrow(!!completed, `Onboarding no se completó para ${targetRole}`);
}

async function closeMealEditModalIfOpen(page) {
  const modalRoot = page.locator('div.fixed.inset-0.z-\\[100\\]').first();
  for (let i = 0; i < 6; i += 1) {
    const modalVisible = await modalRoot.isVisible().catch(() => false);
    if (!modalVisible) return;

    const doneButton = page.getByRole('button', { name: /^Listo$/ }).first();
    if (await doneButton.isVisible().catch(() => false)) {
      await doneButton.click({ force: true }).catch(() => {});
    } else {
      await page.keyboard.press('Escape').catch(() => {});
    }
    await wait(700);
  }
}

async function ensureAdminUser(adminSupabase, email, password, fullName) {
  let user = await findUserByEmail(adminSupabase, email);
  if (!user) {
    const { data, error } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName }
    });
    if (error) throw error;
    user = data.user;
  }

  const { error: profileError } = await adminSupabase
    .from('profiles')
    .upsert({
      id: user.id,
      email: user.email || email,
      full_name: fullName,
      role: 'admin',
      onboarding_completed: true,
    }, { onConflict: 'id' });

  if (profileError) throw profileError;
  return user;
}

async function cleanupTestData(adminSupabase, ids, planId) {
  const { clinicUserId, patientUserId, adminUserId } = ids;
  const userIds = [clinicUserId, patientUserId, adminUserId].filter(Boolean);

  if (planId) {
    await adminSupabase.from('nutritional_plans').delete().eq('id', planId);
  }

  if (userIds.length) {
    await adminSupabase.from('clients').delete().in('user_id', userIds);
    await adminSupabase.from('profiles').delete().in('id', userIds);

    for (const userId of userIds) {
      await adminSupabase.auth.admin.deleteUser(userId);
    }
  }
}

async function run() {
  const env = loadEnv(path.join(process.cwd(), '.env.local'));
  const baseUrl = process.env.E2E_BASE_URL || 'https://ainutrition.epnstore.com.ar';
  const signupMaxAttempts = Number(process.env.E2E_SIGNUP_MAX_ATTEMPTS || '8');
  const signupCooldownMs = Number(process.env.E2E_SIGNUP_COOLDOWN_MS || '65000');
  const useExistingSignups = process.env.E2E_USE_EXISTING_SIGNUPS === '1';
  const skipCleanup = process.env.E2E_SKIP_CLEANUP === '1' || useExistingSignups;
  const manualEmailConfirm = process.env.E2E_MANUAL_EMAIL_CONFIRM === '1';
  const confirmInbox = process.env.E2E_CONFIRM_INBOX || '';
  const superadminEmail = process.env.E2E_SUPERADMIN_EMAIL || '';
  const superadminPassword = process.env.E2E_SUPERADMIN_PASSWORD || '';
  const stamp = runStamp();
  const outDir = path.join(process.cwd(), 'e2e-screenshots', `real-signup-${stamp}`);
  fs.mkdirSync(outDir, { recursive: true });

  const adminSupabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  const clinicAliasFromInbox = aliasFromInbox(confirmInbox, 'clinic.real', stamp);
  const patientAliasFromInbox = aliasFromInbox(confirmInbox, 'patient.real', stamp);

  const clinic = {
    name: process.env.E2E_CLINIC_NAME || `Clinica Real ${stamp}`,
    email: process.env.E2E_CLINIC_EMAIL || clinicAliasFromInbox || `clinic.real.${stamp}@epnstore.com.ar`,
    password: process.env.E2E_CLINIC_PASSWORD || `Clinic!${stamp.slice(-6)}A`,
  };

  const patient = {
    name: process.env.E2E_PATIENT_NAME || `Paciente Real ${stamp}`,
    email: process.env.E2E_PATIENT_EMAIL || patientAliasFromInbox || `patient.real.${stamp}@epnstore.com.ar`,
    password: process.env.E2E_PATIENT_PASSWORD || `Patient!${stamp.slice(-6)}B`,
  };

  const adminActor = {
    name: `Admin Real ${stamp}`,
    email: `admin.real.${stamp}@epnstore.com.ar`,
    password: `Admin!${stamp.slice(-6)}C`,
  };

  const report = {
    baseUrl,
    startedAt: new Date().toISOString(),
    artifactsDir: outDir,
    signupRetryConfig: {
      maxAttempts: signupMaxAttempts,
      cooldownMs: signupCooldownMs,
    },
    mode: useExistingSignups ? 'real-assisted-existing-signups' : 'real-signup-full',
    skipCleanup,
    manualEmailConfirm,
    confirmInbox: confirmInbox || null,
    entities: { clinic, patient, admin: adminActor },
    checks: [],
    success: false,
  };

  let clinicUserId = null;
  let patientUserId = null;
  let adminUserId = null;
  let createdPlanId = null;

  const browser = await chromium.launch({ headless: true });
  const mark = (name, ok, extra = {}) => {
    report.checks.push({ name, ok, at: new Date().toISOString(), ...extra });
    console.log(`${ok ? '✅' : '❌'} ${name}`);
  };

  try {
    // 1) Real signup clinic
    if (!useExistingSignups) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      const clinicSignup = await signupWithRateLimitRetries(page, baseUrl, clinic, outDir, '01_clinic_signup', {
        maxAttempts: signupMaxAttempts,
        cooldownMs: signupCooldownMs,
      });
      mark('Signup clínica (UI real)', true, {
        screenshot: `${clinicSignup.screenshotBase}_ok.png`,
        attempts: clinicSignup.attempts,
      });
      await context.close();
    } else {
      mark('Signup clínica (UI real) omitido: uso cuenta ya creada', true, {
        clinicEmail: clinic.email
      });
    }

    let clinicUser = await retry(
      async () => await findUserByEmail(adminSupabase, clinic.email),
      { timeoutMs: 40000, intervalMs: 2000, label: 'find clinic auth user' }
    );
    assertOrThrow(!!clinicUser, 'No se encontró user auth de clínica tras signup');

    clinicUserId = clinicUser.id;
    if (manualEmailConfirm) {
      console.log(`\n⚠️ ACCIÓN REQUERIDA: Confirmá el email de CLÍNICA en ${clinic.email} (inbox: ${confirmInbox || clinic.email})`);
      const confirmed = await waitForEmailConfirmation(adminSupabase, clinic.email, { timeoutMs: 20 * 60 * 1000 });
      assertOrThrow(!!confirmed, `No se confirmó el email de clínica a tiempo (${clinic.email})`);
      mark('Email clínica confirmado manualmente', true, { clinicEmail: clinic.email });
    } else {
      await adminSupabase.auth.admin.updateUserById(clinicUserId, { email_confirm: true });
    }

    // Clinic onboarding + visualization
    {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      await login(page, baseUrl, clinic.email, clinic.password);
      await completeOnboarding(page, 'nutritionist');

      await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
      await takeShot(page, outDir, '02_clinic_dashboard');

      const usersVisible = await page.locator('nav a:has-text("Usuarios")').count();
      const adminVisible = await page.locator('nav a:has-text("Administración")').count();
      assertOrThrow(usersVisible === 0, 'Clínica no debería ver sección Usuarios');
      assertOrThrow(adminVisible === 0, 'Clínica no debería ver sección Administración');

      const clinicsVisible = await page.locator('nav a:has-text("Clínicas")').count();
      const patientsVisible = await page.locator('nav a:has-text("Pacientes")').count();
      const foodsVisible = await page.locator('nav a:has-text("Alimentos")').count();
      const plansVisible = await page.locator('nav a:has-text("Planes")').count();
      const templatesVisible = await page.locator('nav a:has-text("Plantillas")').count();
      const knowledgeVisible = await page.locator('nav a:has-text("Conocimiento")').count();
      const profileVisible = await page.locator('nav a:has-text("Perfil")').count();

      assertOrThrow(
        clinicsVisible === 0 &&
        patientsVisible > 0 &&
        foodsVisible > 0 &&
        plansVisible > 0 &&
        templatesVisible > 0 &&
        knowledgeVisible > 0 &&
        profileVisible > 0,
        'Clínica debe ver Pacientes/Alimentos/Planes/Plantillas/Conocimiento/Perfil y NO Clínicas'
      );

      mark('Onboarding clínica + navegación correcta', true, { screenshot: '02_clinic_dashboard.png' });
      await context.close();
    }

    const { data: clinicProfile } = await adminSupabase
      .from('profiles')
      .select('role,onboarding_completed')
      .eq('id', clinicUserId)
      .single();

    const { data: clinicClient } = await adminSupabase
      .from('clients')
      .select('id,type,user_id')
      .eq('user_id', clinicUserId)
      .eq('type', 'clinic')
      .maybeSingle();

    assertOrThrow(clinicProfile?.role === 'nutritionist', `Role clínica inválido: ${clinicProfile?.role}`);
    assertOrThrow(clinicProfile?.onboarding_completed === true, 'Onboarding clínica no persistió');
    assertOrThrow(!!clinicClient, 'No existe clients(type=clinic) para clínica');

    mark('Persistencia clínica en DB (profiles + clients)', true, { clinicClientId: clinicClient.id });

    // 2) Real signup patient
    if (!useExistingSignups) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      const patientSignup = await signupWithRateLimitRetries(page, baseUrl, patient, outDir, '03_patient_signup', {
        maxAttempts: signupMaxAttempts,
        cooldownMs: signupCooldownMs,
      });
      mark('Signup paciente (UI real)', true, {
        screenshot: `${patientSignup.screenshotBase}_ok.png`,
        attempts: patientSignup.attempts,
      });
      await context.close();
    } else {
      mark('Signup paciente (UI real) omitido: uso cuenta ya creada', true, {
        patientEmail: patient.email
      });
    }

    let patientUser = await retry(
      async () => await findUserByEmail(adminSupabase, patient.email),
      { timeoutMs: 40000, intervalMs: 2000, label: 'find patient auth user' }
    );
    assertOrThrow(!!patientUser, 'No se encontró user auth de paciente tras signup');

    patientUserId = patientUser.id;
    if (manualEmailConfirm) {
      console.log(`\n⚠️ ACCIÓN REQUERIDA: Confirmá el email de PACIENTE en ${patient.email} (inbox: ${confirmInbox || patient.email})`);
      const confirmed = await waitForEmailConfirmation(adminSupabase, patient.email, { timeoutMs: 20 * 60 * 1000 });
      assertOrThrow(!!confirmed, `No se confirmó el email de paciente a tiempo (${patient.email})`);
      mark('Email paciente confirmado manualmente', true, { patientEmail: patient.email });
    } else {
      await adminSupabase.auth.admin.updateUserById(patientUserId, { email_confirm: true });
    }

    // Patient onboarding + visibility restrictions
    {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      await login(page, baseUrl, patient.email, patient.password);
      await completeOnboarding(page, 'patient');

      await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
      await takeShot(page, outDir, '04_patient_dashboard');

      const hasUsers = await page.locator('nav a:has-text("Usuarios")').count();
      const hasPatients = await page.locator('nav a:has-text("Pacientes")').count();
      const hasClinics = await page.locator('nav a:has-text("Clínicas")').count();
      const hasFoods = await page.locator('nav a:has-text("Alimentos")').count();
      const hasPlans = await page.locator('nav a:has-text("Planes")').count();
      const hasTemplates = await page.locator('nav a:has-text("Plantillas")').count();
      const hasKnowledge = await page.locator('nav a:has-text("Conocimiento")').count();
      const hasProfile = await page.locator('nav a:has-text("Perfil")').count();
      const hasAdministration = await page.locator('nav a:has-text("Administración")').count();

      assertOrThrow(
        hasUsers === 0 &&
        hasPatients === 0 &&
        hasClinics === 0 &&
        hasPlans === 0 &&
        hasTemplates === 0 &&
        hasAdministration === 0 &&
        hasFoods > 0 &&
        hasKnowledge > 0 &&
        hasProfile > 0,
        'Paciente debe ver solo Mi Panel, Alimentos, Conocimiento y Perfil'
      );

      mark('Onboarding paciente + navegación restringida correcta', true, { screenshot: '04_patient_dashboard.png' });
      await context.close();
    }

    const { data: patientProfile } = await adminSupabase
      .from('profiles')
      .select('role,onboarding_completed')
      .eq('id', patientUserId)
      .single();

    const { data: patientClient } = await adminSupabase
      .from('clients')
      .select('id,type,user_id,clinic_id')
      .eq('user_id', patientUserId)
      .eq('type', 'patient')
      .maybeSingle();

    assertOrThrow(patientProfile?.role === 'patient', `Role paciente inválido: ${patientProfile?.role}`);
    assertOrThrow(patientProfile?.onboarding_completed === true, 'Onboarding paciente no persistió');
    assertOrThrow(!!patientClient, 'No existe clients(type=patient) para paciente');

    mark('Persistencia paciente en DB (profiles + clients)', true, { patientClientId: patientClient.id });

    // 3) Visual check administración (solo si se proveen credenciales de superadmin)
    if (superadminEmail && superadminPassword) {
      {
        const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
        const page = await context.newPage();
        await login(page, baseUrl, superadminEmail, superadminPassword);
        await page.goto(`${baseUrl}/administration`, { waitUntil: 'networkidle' });

        const clinicRow = await page.locator('tr').filter({ hasText: clinic.email }).count();
        const patientRow = await page.locator('tr').filter({ hasText: patient.email }).count();
        assertOrThrow(clinicRow > 0 && patientRow > 0, 'Superadmin no visualiza usuarios recién registrados');

        await takeShot(page, outDir, '05_superadmin_users_visual_check');
        mark('Visualización en app: superadmin ve clínica + paciente', true, { screenshot: '05_superadmin_users_visual_check.png' });
        await context.close();
      }
    } else {
      mark('Visualización superadmin omitida (faltan credenciales E2E_SUPERADMIN_*)', true);
    }

    // 4) Flow real cliente: clínica crea plan y lo asigna al paciente signup
    {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      await login(page, baseUrl, clinic.email, clinic.password);

      await page.goto(`${baseUrl}/meal-plans`, { waitUntil: 'networkidle' });
      const createPlanButton = page.locator('main button[title="Crear..."]').first();
      const createPlanButtonVisible = await createPlanButton.isVisible().catch(() => false);
      if (createPlanButtonVisible) {
        await createPlanButton.click();
      } else {
        await page.locator('button[title="Crear..."]').first().click();
      }

      await page.waitForSelector('text=Configurar Plan Nutricional', { timeout: 20000 });
      await page.locator('text=Cargando defaults...').first().waitFor({ state: 'detached', timeout: 15000 }).catch(() => {});
      const planName = `Plan Real Signup ${stamp}`;
      await page.locator('input[placeholder*="High Protein"]').fill(planName);
      await page.locator('textarea').first().fill('Plan generado en flujo real de signup clínica + paciente');
      await page.locator('input[placeholder="Nombre de la clínica"]').fill(clinic.name);
      await page.locator('input[placeholder="https://.../logo.png"]').fill('https://ainutrition.epnstore.com.ar/images/ai-nutrition-logo.png');
      await page.locator('input[placeholder="#0ea5e9"]').fill('#22c1c3');
      await page.locator('input[placeholder="#10b981"]').fill('#4f9cf9');
      await page.getByRole('button', { name: /Crear Plan/i }).click();

      await page.waitForURL(/\/editor\//, { timeout: 30000 });
      createdPlanId = page.url().split('/editor/')[1]?.split('?')[0] || null;
      assertOrThrow(!!createdPlanId, 'No se pudo extraer planId del editor');

      await page.getByRole('button', { name: /Asignar|Sin asignar/i }).first().click();
      await page.waitForSelector('text=Asignar Plan Nutricional', { timeout: 15000 });
      await page.locator('input[placeholder*="Buscar paciente"]').first().fill(patient.name);
      await page.locator('button').filter({ hasText: patient.name }).first().click();

      const addButtons = page.locator('button[title="Añadir al plan"]');
      await addButtons.first().click();
      await wait(1000);
      await closeMealEditModalIfOpen(page);
      await page.getByRole('button', { name: /^Guardar$/ }).first().click({ force: true });
      await wait(1800);

      await takeShot(page, outDir, '06_clinic_editor_saved');
      mark('Clínica crea y asigna plan al paciente signup', true, { screenshot: '06_clinic_editor_saved.png', planId: createdPlanId });
      await context.close();
    }

    // 5) Patient sees assigned plan
    {
      assertOrThrow(!!createdPlanId, 'No hay plan creado para validar restricciones del paciente');
      const { data: assignedPlan } = await adminSupabase
        .from('nutritional_plans')
        .select('id, client_id')
        .eq('id', createdPlanId)
        .single();
      assertOrThrow(assignedPlan?.client_id === patientClient.id, 'El plan no quedó asignado al paciente en DB');

      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      await login(page, baseUrl, patient.email, patient.password);

      await page.goto(`${baseUrl}/meal-plans`, { waitUntil: 'networkidle' });
      await wait(1200);
      assertOrThrow(!page.url().includes('/meal-plans'), 'Paciente no debería acceder a /meal-plans');

      await page.goto(`${baseUrl}/editor/${createdPlanId}`, { waitUntil: 'networkidle' });
      await wait(1200);
      assertOrThrow(!page.url().includes(`/editor/${createdPlanId}`), 'Paciente no debería acceder a /editor/:id');

      await takeShot(page, outDir, '07_patient_sees_assigned_plan');
      mark('Paciente restringido correctamente + plan asignado persistido en DB', true, {
        screenshot: '07_patient_sees_assigned_plan.png',
        planId: createdPlanId
      });
      await context.close();
    }

    report.success = true;
    report.finishedAt = new Date().toISOString();
    fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));

    console.log(`\n✅ E2E real completado. Reporte: ${path.join(outDir, 'report.json')}`);

    if (!skipCleanup) {
      await cleanupTestData(adminSupabase, { clinicUserId, patientUserId, adminUserId }, createdPlanId);
      console.log('🧹 Datos de prueba eliminados');
    } else {
      console.log('ℹ️ Cleanup omitido por configuración (E2E_SKIP_CLEANUP/E2E_USE_EXISTING_SIGNUPS)');
    }
  } catch (error) {
    report.success = false;
    report.finishedAt = new Date().toISOString();
    report.error = { message: error.message, stack: error.stack };
    fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));

    console.error('\n❌ E2E real falló');
    console.error(error.message);
    console.error(`Artifacts: ${outDir}`);

    // Cleanup best-effort on failures too
    if (!skipCleanup) {
      try {
        await cleanupTestData(adminSupabase, { clinicUserId, patientUserId, adminUserId }, createdPlanId);
      } catch (_) {}
    }

    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

run();
