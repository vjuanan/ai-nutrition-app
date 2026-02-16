const https = require('https');
const fs = require('fs');
const path = require('path');

const PROJECT_REF = 'jkuhzdicmfjvnrdznvoh';
const ACCESS_TOKEN = 'sbp_c72c8c9fa74ffb292fb7f64ec3adccdded492506';

// Read both migration files
const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
const files = [
    '20260216_onboarding_nutrition_redesign.sql',
    '20260216_fix_onboarding_trigger_nutrition.sql'
];

async function runMigration(filename) {
    const sql = fs.readFileSync(path.join(migrationsDir, filename), 'utf8');

    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.supabase.com',
            path: `/v1/projects/${PROJECT_REF}/database/query`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${ACCESS_TOKEN}`
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    console.log(`✅ ${filename}: SUCCESS`);
                    resolve(data);
                } else {
                    console.error(`❌ ${filename}: FAILED (${res.statusCode})`);
                    console.error(data);
                    reject(new Error(data));
                }
            });
        });

        req.on('error', reject);
        req.write(JSON.stringify({ query: sql }));
        req.end();
    });
}

(async () => {
    for (const file of files) {
        console.log(`\nRunning migration: ${file}...`);
        try {
            await runMigration(file);
        } catch (e) {
            console.error('Migration failed, stopping.', e.message);
            process.exit(1);
        }
    }
    console.log('\n🎉 All migrations completed successfully!');
})();
