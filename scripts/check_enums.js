const https = require('https');

const PROJECT_REF = 'jkuhzdicmfjvnrdznvoh';
const ACCESS_TOKEN = 'sbp_c72c8c9fa74ffb292fb7f64ec3adccdded492506';

const sql = `
SELECT column_name, data_type, udt_name, column_default, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND table_schema = 'public'
ORDER BY ordinal_position;
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
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        console.log('Status:', res.statusCode);
        const parsed = JSON.parse(data);
        console.table(parsed);
    });
});

req.on('error', console.error);
req.write(JSON.stringify({ query: sql }));
req.end();
