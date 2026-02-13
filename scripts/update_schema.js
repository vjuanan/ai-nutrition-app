const https = require('https');

// Read from .env.local or hardcoded for this session
const PROJECT_REF = 'jkuhzdicmfjvnrdznvoh';
const ACCESS_TOKEN = 'sbp_c72c8c9fa74ffb292fb7f64ec3adccdded492506';

const sql = `
-- Restore Clients Table (if dropped unintentionally or needed for logic)
CREATE TABLE IF NOT EXISTS "clients" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "created_at" timestamptz DEFAULT now(),
  "name" text NOT NULL,
  "type" text NOT NULL DEFAULT 'athlete', -- 'athlete' or 'gym'
  "email" text,
  "user_id" uuid REFERENCES auth.users(id) ON DELETE SET NULL, -- Link to real user if applicable
  "notes" text
);

ALTER TABLE "clients" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Coaches can view clients" ON "clients"; 
CREATE POLICY "Coaches can view clients" ON "clients" FOR SELECT USING (true); -- Simplify for now
DROP POLICY IF EXISTS "Coaches can manage clients" ON "clients"; 
CREATE POLICY "Coaches can manage clients" ON "clients" FOR ALL USING (true); -- Simplify for now

-- Add client_id to Nutritional Plans
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='nutritional_plans' AND column_name='client_id') THEN
        ALTER TABLE "nutritional_plans" ADD COLUMN "client_id" uuid REFERENCES "clients"("id") ON DELETE SET NULL;
    END IF;
END
$$;

-- Seed some clients for testing
INSERT INTO clients (name, type, email) VALUES
('Juan Pérez', 'athlete', 'juan@example.com'),
('Gimnasio Central', 'gym', 'info@centralgym.com'),
('María López', 'athlete', 'maria@example.com')
ON CONFLICT DO NOTHING; -- No conflict clause on ID, but names might duplicate. It's fine for dev.
`;

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

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log('Status Code:', res.statusCode);
        if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log('Schema update successful!');
        } else {
            console.error('Schema update failed:', data);
            process.exit(1);
        }
    });
});

req.on('error', (error) => {
    console.error('Error executing migration:', error);
    process.exit(1);
});

req.write(JSON.stringify({ query: sql }));
req.end();
