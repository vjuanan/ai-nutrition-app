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

function slugNow() {
  return new Date().toISOString().replace(/[\-:.TZ]/g, '').slice(0, 14);
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
  const normalized = email.toLowerCase();
  const users = await listAllUsers(adminSupabase);
  return users.find((u) => (u.email || '').toLowerCase() === normalized) || null;
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

  const profilePayload = {
    id: user.id,
    email: user.email || email,
    full_name: fullName,
    role: 'admin',
    onboarding_completed: true,
  };

  const { error: profileError } = await adminSupabase
    .from('profiles')
    .upsert(profilePayload, { onConflict: 'id' });

  if (profileError) {
    const { error: fallbackError } = await adminSupabase
      .from('profiles')
      .update({ role: 'admin', onboarding_completed: true })
      .eq('id', user.id);

    if (fallbackError) throw fallbackError;
  }

  return user;
}

function assertOrThrow(condition, message) {
  if (!condition) throw new Error(message);
}

async function takeShot(page, dir, name) {
  const target = path.join(dir, `${name}.png`);
  await page.screenshot({ path: target, fullPage: true });
  return target;
}

async function login(page, baseUrl, email, password) {
  let lastError = '';
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle' });
    await wait(1200);

    const emailInput = page.locator('input[name="email"]');
    const passwordInput = page.locator('input[name="password"]');

    await emailInput.waitFor({ state: 'visible', timeout: 15000 });
    await emailInput.click();
    await emailInput.fill(email);
    await passwordInput.fill(password);

    // Guard against hydration reset wiping typed values.
    await retry(async () => {
      const currentEmail = await emailInput.inputValue();
      const currentPassword = await passwordInput.inputValue();
      return currentEmail === email && currentPassword === password;
    }, { timeoutMs: 5000, intervalMs: 250, label: 'login form hydrated values' });

    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForLoadState('networkidle')
    ]);
    await wait(1200);

    let currentUrl = page.url();
    if (!currentUrl.includes('/login')) {
      return;
    }

    // Some successful logins briefly remain in /login before redirecting.
    await wait(2000);
    currentUrl = page.url();
    if (!currentUrl.includes('/login')) return;

    const errorText = await page.locator('text=/Credenciales|verificá|Error|error/i').first().textContent().catch(() => 'Sin mensaje');
    lastError = (errorText || '').trim() || 'Sin mensaje';

    if (lastError.toLowerCase().includes('credenciales incorrectas') && attempt < 5) {
      await wait(2000 * attempt);
      continue;
    }

    throw new Error(`Login falló para ${email}. URL=${currentUrl} Msg=${lastError}`);
  }

  throw new Error(`Login falló para ${email}. Reintentos agotados. Último error: ${lastError}`);
}

async function run() {
  const env = loadEnv(path.join(process.cwd(), '.env.local'));
  const baseUrl = process.env.E2E_BASE_URL || 'https://aicoach.epnstore.com.ar';
  const runId = slugNow();
  const outDir = path.join(process.cwd(), 'e2e-screenshots', `prod-e2e-${runId}`);
  fs.mkdirSync(outDir, { recursive: true });

  const adminSupabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  const clinic = {
    name: `Clinica E2E ${runId}`,
    email: `clinic.e2e.${runId}@epnstore.com.ar`,
    password: `Clinic!${runId.slice(-6)}A`,
  };

  const patient = {
    name: `Paciente E2E ${runId}`,
    email: `patient.e2e.${runId}@epnstore.com.ar`,
    password: `Patient!${runId.slice(-6)}B`,
  };

  const admin = {
    name: `Admin E2E ${runId}`,
    email: `admin.e2e.${runId}@epnstore.com.ar`,
    password: `Admin!${runId.slice(-6)}C`,
  };

  const report = {
    runId,
    baseUrl,
    startedAt: new Date().toISOString(),
    artifactsDir: outDir,
    steps: [],
    entities: {
      clinic,
      patient,
      admin,
      planId: null,
      clinicClientId: null,
      patientClientId: null,
    },
    accessChecks: {
      patientBlocked: {},
      patientAllowed: {},
      clinicBlockedAdminUsers: null,
      adminUsersAccess: null,
    }
  };

  const browser = await chromium.launch({ headless: true });

  const markStep = (name, ok, details = {}) => {
    report.steps.push({ name, ok, at: new Date().toISOString(), ...details });
    console.log(`${ok ? '✅' : '❌'} ${name}`);
  };

  try {
    // Step 1: Clinic signup from browser
    {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();

      await page.goto(`${baseUrl}/auth/signup`, { waitUntil: 'networkidle' });
      await wait(1200);
      const fullNameInput = page.locator('input[placeholder="Ej: Juan Pérez"]');
      const emailInput = page.locator('input[placeholder="usuario@ejemplo.com"]');

      await fullNameInput.waitFor({ state: 'visible', timeout: 15000 });
      await fullNameInput.click();
      await fullNameInput.fill(clinic.name);
      await emailInput.fill(clinic.email);
      await page.locator('input[type="password"]').nth(0).fill(clinic.password);
      await page.locator('input[type="password"]').nth(1).fill(clinic.password);

      await retry(async () => {
        const formState = await Promise.all([
          fullNameInput.inputValue(),
          emailInput.inputValue(),
          page.locator('input[type="password"]').nth(0).inputValue(),
          page.locator('input[type="password"]').nth(1).inputValue(),
        ]);
        return formState[0] === clinic.name && formState[1] === clinic.email && formState[2] === clinic.password && formState[3] === clinic.password;
      }, { timeoutMs: 5000, intervalMs: 250, label: 'signup form hydrated values' });

      await page.click('button[type="submit"]');

      let signupUiSuccess = false;
      let signupFailureReason = '';
      try {
        await page.waitForSelector('text=/Revisa tu Email|¡Revisa tu Email!/i', { timeout: 15000 });
        signupUiSuccess = true;
      } catch (_) {
        signupUiSuccess = false;
        const bodyText = await page.locator('body').innerText();
        if (/email rate limit exceeded/i.test(bodyText)) {
          signupFailureReason = 'email rate limit exceeded';
        }
      }

      await takeShot(page, outDir, signupUiSuccess ? '01_signup_clinic_success' : '01_signup_clinic_unverified');
      markStep('Signup clínica desde navegador', signupUiSuccess, {
        screenshot: signupUiSuccess ? '01_signup_clinic_success.png' : '01_signup_clinic_unverified.png',
        finalUrl: page.url(),
        reason: signupFailureReason || undefined
      });

      await context.close();
    }

    // Confirm clinic email and complete onboarding as nutritionist.
    let clinicAuthUser = await retry(
      async () => await findUserByEmail(adminSupabase, clinic.email),
      { timeoutMs: 30000, intervalMs: 2000, label: 'find clinic auth user' }
    );

    if (!clinicAuthUser) {
      markStep('Fallback: creación admin de clínica (signup bloqueado)', false, {
        detail: 'No se encontró usuario auth tras signup; se continuó flujo con alta admin para completar QA E2E.'
      });

      const { data: fallbackUserData, error: fallbackCreateError } = await adminSupabase.auth.admin.createUser({
        email: clinic.email,
        password: clinic.password,
        email_confirm: true,
        user_metadata: { full_name: clinic.name }
      });
      if (fallbackCreateError) throw fallbackCreateError;
      clinicAuthUser = fallbackUserData.user;
    }

    assertOrThrow(!!clinicAuthUser, 'No se pudo obtener usuario auth de clínica');

    const { error: confirmError } = await adminSupabase.auth.admin.updateUserById(clinicAuthUser.id, {
      email_confirm: true
    });
    if (confirmError) throw confirmError;

    {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();

      await login(page, baseUrl, clinic.email, clinic.password);

      if (page.url().includes('/onboarding')) {
        await page.getByRole('button', { name: /Soy Nutricionista/i }).click();

        for (let i = 0; i < 8; i += 1) {
          if (!page.url().includes('/onboarding')) break;
          const nextButton = page.getByRole('button', { name: /Siguiente|Finalizar/i }).last();
          await nextButton.click();
          await wait(900);
        }

        await retry(async () => !page.url().includes('/onboarding'), {
          timeoutMs: 30000,
          intervalMs: 1000,
          label: 'wait onboarding finish'
        });
      }

      await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
      await takeShot(page, outDir, '02_clinic_dashboard_after_onboarding');

      const sidebarUsersVisible = await page.locator('nav a:has-text("Usuarios")').count();
      assertOrThrow(sidebarUsersVisible === 0, 'La clínica no debería ver la sección Usuarios en sidebar');
      markStep('Onboarding clínica + acceso dashboard', true, {
        screenshot: '02_clinic_dashboard_after_onboarding.png',
        usersSectionVisible: sidebarUsersVisible
      });

      await context.close();
    }

    // Verify clinic persisted in DB.
    const clinicUser = await findUserByEmail(adminSupabase, clinic.email);
    assertOrThrow(!!clinicUser, 'No existe auth user de clínica para validación DB');

    const { data: clinicProfile, error: clinicProfileError } = await adminSupabase
      .from('profiles')
      .select('id, role, onboarding_completed')
      .eq('id', clinicUser.id)
      .single();
    if (clinicProfileError) throw clinicProfileError;

    const { data: clinicClient, error: clinicClientError } = await adminSupabase
      .from('clients')
      .select('id, type, user_id, name')
      .eq('user_id', clinicUser.id)
      .eq('type', 'clinic')
      .maybeSingle();
    if (clinicClientError) throw clinicClientError;

    assertOrThrow(clinicProfile.role === 'nutritionist', `Role clínica inválido: ${clinicProfile.role}`);
    assertOrThrow(clinicProfile.onboarding_completed === true, 'Clínica debería tener onboarding_completed=true');
    assertOrThrow(!!clinicClient, 'No se encontró clients(type=clinic) para la clínica');

    report.entities.clinicClientId = clinicClient.id;
    markStep('Validación DB clínica (profiles + clients)', true, {
      clinicUserId: clinicUser.id,
      clinicClientId: clinicClient.id,
      role: clinicProfile.role,
      onboardingCompleted: clinicProfile.onboarding_completed,
    });

    // Step 2: Admin creates patient and assigns clinic.
    const adminUser = await ensureAdminUser(adminSupabase, admin.email, admin.password, admin.name);
    assertOrThrow(!!adminUser, 'No se pudo preparar usuario admin');

    {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      await login(page, baseUrl, admin.email, admin.password);

      await page.goto(`${baseUrl}/admin/users`, { waitUntil: 'networkidle' });
      assertOrThrow(page.url().includes('/admin/users'), `Admin no accedió a /admin/users. URL=${page.url()}`);
      await takeShot(page, outDir, '03_admin_users_page');

      await page.locator('button[title="Crear Usuario"]').click();
      const modal = page.locator('div.fixed.inset-0').filter({ hasText: 'Crear Nuevo Usuario' });
      await modal.waitFor({ state: 'visible', timeout: 15000 });

      await modal.locator('input[type="text"]').first().fill(patient.name);
      await modal.locator('input[type="email"]').fill(patient.email);
      await modal.locator('input[type="password"]').fill(patient.password);
      await modal.locator('select').first().selectOption('patient');
      await modal.locator('select').nth(1).selectOption({ label: clinic.name });
      await modal.getByRole('button', { name: /Crear Usuario/i }).click();

      await retry(async () => {
        const isVisible = await modal.isVisible().catch(() => false);
        return !isVisible;
      }, { timeoutMs: 20000, intervalMs: 500, label: 'wait create user modal close' });

      await page.waitForTimeout(1500);
      await takeShot(page, outDir, '04_admin_created_patient');

      const row = page.locator('tr').filter({ hasText: patient.email });
      const rowCount = await row.count();
      assertOrThrow(rowCount > 0, 'No se encontró paciente creado en tabla de usuarios');

      markStep('Admin crea paciente y asigna clínica (UI)', true, {
        screenshot: '04_admin_created_patient.png'
      });

      await context.close();
    }

    const patientUser = await retry(
      async () => await findUserByEmail(adminSupabase, patient.email),
      { timeoutMs: 60000, intervalMs: 2000, label: 'find patient auth user' }
    );
    assertOrThrow(!!patientUser, 'No se encontró auth user del paciente');

    const { data: patientProfile, error: patientProfileError } = await adminSupabase
      .from('profiles')
      .select('id, role, onboarding_completed')
      .eq('id', patientUser.id)
      .single();
    if (patientProfileError) throw patientProfileError;

    const { data: patientClient, error: patientClientError } = await adminSupabase
      .from('clients')
      .select('id, type, user_id, clinic_id')
      .eq('user_id', patientUser.id)
      .eq('type', 'patient')
      .maybeSingle();
    if (patientClientError) throw patientClientError;

    assertOrThrow(patientProfile.role === 'patient', `Role paciente inválido: ${patientProfile.role}`);
    assertOrThrow(patientProfile.onboarding_completed === true, 'Paciente creado por admin debe quedar onboarding_completed=true');
    assertOrThrow(!!patientClient, 'No existe clients(type=patient) para el paciente');
    assertOrThrow(patientClient.clinic_id === clinicClient.id, `clinic_id paciente inválido: ${patientClient.clinic_id}`);

    report.entities.patientClientId = patientClient.id;
    markStep('Validación DB paciente (role + clinic_id)', true, {
      patientUserId: patientUser.id,
      patientClientId: patientClient.id,
      clinicId: patientClient.clinic_id,
    });

    // Step 3: Clinic creates plan and assigns patient from editor
    let createdPlanId = null;
    {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      await login(page, baseUrl, clinic.email, clinic.password);

      await page.goto(`${baseUrl}/meal-plans`, { waitUntil: 'networkidle' });
      await page.locator('button[title="Crear..."]').click();

      await page.waitForSelector('text=Configurar Plan Nutricional', { timeout: 15000 });
      const planName = `Plan E2E ${runId}`;
      await page.locator('input[placeholder*="High Protein"]').fill(planName);
      await page.locator('textarea').first().fill('Plan creado por flujo E2E producción');
      await page.getByRole('button', { name: /Crear Plan/i }).click();

      await page.waitForURL(/\/editor\//, { timeout: 30000 });
      const currentUrl = page.url();
      createdPlanId = currentUrl.split('/editor/')[1]?.split('?')[0] || null;
      assertOrThrow(!!createdPlanId, `No se pudo extraer planId de URL ${currentUrl}`);
      report.entities.planId = createdPlanId;

      await takeShot(page, outDir, '05_editor_after_plan_create');

      // Assign patient
      const assignButton = page.getByRole('button', { name: /Asignar|Sin asignar/i }).first();
      await assignButton.click();
      await page.waitForSelector('text=Asignar Plan Nutricional', { timeout: 15000 });

      const searchInput = page.locator('input[placeholder*="Buscar paciente"]').first();
      await searchInput.fill(patient.name);
      await page.locator('button').filter({ hasText: patient.name }).first().click();

      await page.waitForTimeout(2000);
      await takeShot(page, outDir, '06_editor_plan_assigned');

      // Add one meal block and save to ensure persistence path works.
      const addButtons = page.locator('button[title="Añadir al plan"]');
      const addCount = await addButtons.count();
      assertOrThrow(addCount > 0, 'No se encontraron botones de añadir bloque en editor');
      await addButtons.first().click();
      await page.waitForSelector('text=Desayuno', { timeout: 15000 });

      // New meal can open MealEditModal by default; close it before clicking topbar save.
      const mealDoneButton = page.getByRole('button', { name: /^Listo$/ }).first();
      if (await mealDoneButton.isVisible().catch(() => false)) {
        await mealDoneButton.click();
        await wait(600);
      }

      const saveButton = page.getByRole('button', { name: /^Guardar$/ }).first();
      await saveButton.click();
      await page.waitForTimeout(2500);
      await takeShot(page, outDir, '07_editor_saved_by_clinic');

      markStep('Clínica crea plan, asigna paciente y guarda cambios', true, {
        screenshot: '07_editor_saved_by_clinic.png',
        planId: createdPlanId,
      });

      await context.close();
    }

    // DB validation for plan assignment and meals persisted.
    const { data: assignedPlan, error: assignedPlanError } = await adminSupabase
      .from('nutritional_plans')
      .select('id, client_id, user_id')
      .eq('id', createdPlanId)
      .single();
    if (assignedPlanError) throw assignedPlanError;

    assertOrThrow(assignedPlan.client_id === patientClient.id, `Plan client_id inválido: ${assignedPlan.client_id}`);

    const { data: firstDay, error: firstDayError } = await adminSupabase
      .from('plan_days')
      .select('id')
      .eq('plan_id', createdPlanId)
      .order('order', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (firstDayError) throw firstDayError;

    const { count: dayMealsCount, error: dayMealsError } = await adminSupabase
      .from('meals')
      .select('*', { count: 'exact', head: true })
      .eq('day_id', firstDay.id);
    if (dayMealsError) throw dayMealsError;

    assertOrThrow((dayMealsCount || 0) > 0, 'No se persistieron comidas en el día tras guardar desde editor');
    markStep('Validación DB plan asignado + comidas persistidas', true, {
      planId: createdPlanId,
      mealsInFirstDay: dayMealsCount,
    });

    // Step 4 + 5: Patient can view/edit assigned plan and access restrictions.
    {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      await login(page, baseUrl, patient.email, patient.password);

      await page.goto(`${baseUrl}/meal-plans`, { waitUntil: 'networkidle' });
      await page.waitForSelector('text=/Plan E2E|No hay planes creados/i', { timeout: 15000 });
      const planVisible = await page.locator(`text=Plan E2E ${runId}`).count();
      assertOrThrow(planVisible > 0, 'Paciente no visualiza su plan asignado en /meal-plans');

      await page.goto(`${baseUrl}/editor/${createdPlanId}`, { waitUntil: 'networkidle' });
      await page.waitForSelector('text=Objetivos', { timeout: 15000 });

      // Edit as patient: add another block and save.
      const addButtons = page.locator('button[title="Añadir al plan"]');
      await addButtons.nth(1).click();
      await page.waitForTimeout(1000);

      const patientMealDoneButton = page.getByRole('button', { name: /^Listo$/ }).first();
      if (await patientMealDoneButton.isVisible().catch(() => false)) {
        await patientMealDoneButton.click();
        await wait(600);
      }

      await page.getByRole('button', { name: /^Guardar$/ }).first().click();
      await page.waitForTimeout(2500);
      await takeShot(page, outDir, '08_patient_editor_save');

      // Sidebar restriction quick checks
      const sidebarHasUsers = await page.locator('nav a:has-text("Usuarios")').count();
      const sidebarHasPatients = await page.locator('nav a:has-text("Pacientes")').count();
      assertOrThrow(sidebarHasUsers === 0 && sidebarHasPatients === 0, 'Paciente ve secciones restringidas en sidebar');

      const blockedRoutes = ['/admin/users', '/clinics', '/patients', '/foods', '/knowledge'];
      for (const route of blockedRoutes) {
        await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded' });
        await wait(900);
        const finalPath = new URL(page.url()).pathname;
        report.accessChecks.patientBlocked[route] = finalPath;
        assertOrThrow(finalPath.startsWith('/meal-plans'), `Paciente no fue bloqueado en ${route}; terminó en ${finalPath}`);
      }

      const allowedRoutes = ['/settings', `/editor/${createdPlanId}`, '/meal-plans', '/'];
      for (const route of allowedRoutes) {
        await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded' });
        await wait(900);
        const finalPath = new URL(page.url()).pathname;
        report.accessChecks.patientAllowed[route] = finalPath;
        assertOrThrow(finalPath === route || (route === '/' && finalPath === '/'), `Paciente no pudo acceder a ${route}; terminó en ${finalPath}`);
      }

      markStep('Paciente visualiza y edita plan + RBAC paciente', true, {
        screenshot: '08_patient_editor_save.png'
      });
      await context.close();
    }

    // Step 6: Clinic blocked from /admin/users
    {
      const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const page = await context.newPage();
      await login(page, baseUrl, clinic.email, clinic.password);
      await page.goto(`${baseUrl}/admin/users`, { waitUntil: 'domcontentloaded' });
      await wait(1000);
      const finalPath = new URL(page.url()).pathname;
      report.accessChecks.clinicBlockedAdminUsers = finalPath;
      assertOrThrow(finalPath === '/', `Clínica no fue bloqueada en /admin/users; terminó en ${finalPath}`);
      await takeShot(page, outDir, '09_clinic_blocked_admin_users');
      markStep('RBAC clínica bloqueada de /admin/users', true, {
        screenshot: '09_clinic_blocked_admin_users.png'
      });
      await context.close();
    }

    // Admin can access /admin/users
    {
      const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const page = await context.newPage();
      await login(page, baseUrl, admin.email, admin.password);
      await page.goto(`${baseUrl}/admin/users`, { waitUntil: 'domcontentloaded' });
      await wait(1000);
      const finalPath = new URL(page.url()).pathname;
      report.accessChecks.adminUsersAccess = finalPath;
      assertOrThrow(finalPath === '/admin/users', `Admin no accedió a /admin/users; terminó en ${finalPath}`);
      await takeShot(page, outDir, '10_admin_access_admin_users');
      markStep('RBAC admin acceso total /admin/users', true, {
        screenshot: '10_admin_access_admin_users.png'
      });
      await context.close();
    }

    report.finishedAt = new Date().toISOString();
    report.success = true;
    fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));

    console.log('\n✅ E2E producción completado');
    console.log(`Artifacts: ${outDir}`);
    console.log(`Report: ${path.join(outDir, 'report.json')}`);
  } catch (error) {
    report.finishedAt = new Date().toISOString();
    report.success = false;
    report.error = {
      message: error.message,
      stack: error.stack,
    };
    fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));
    console.error('\n❌ E2E producción falló');
    console.error(error);
    console.error(`Artifacts parciales: ${outDir}`);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

run();
