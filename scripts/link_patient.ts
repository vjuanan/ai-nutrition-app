
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);


async function linkPatient() {
    console.log('--- Starting Link Patient Script (Schema Corrected) ---');

    // 1. Get Patient User
    const { data: { users: allUsers } } = await supabase.auth.admin.listUsers();
    const patient = allUsers.find(u => u.email === 'test_israetel@epnstore.com.ar');

    if (!patient) {
        console.error('Patient user not found');
        return;
    }
    console.log(`Found Patient: ${patient.email} (${patient.id})`);

    // 2. Check if Client Record exists
    const { data: clientRecord, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('email', patient.email)
        .single();

    if (clientRecord) {
        console.log(`Client record already exists: ${clientRecord.id}`);
        if (!clientRecord.user_id) {
            console.log('Linking user_id...');
            const { error: linkError } = await supabase
                .from('clients')
                .update({ user_id: patient.id })
                .eq('id', clientRecord.id);
            if (linkError) console.log('Could not link user_id:', linkError.message);
            else console.log('Linked user_id successfully');
        }
    } else {
        console.log('Creating Client record...');
        // Create new client with VERIFIED columns only
        const { data: newClient, error: createClientError } = await supabase
            .from('clients')
            .insert({
                user_id: patient.id,
                name: 'Mike Israetel Test',
                email: patient.email,
                type: 'athlete',
                notes: 'Created via script'
            })
            .select()
            .single();

        if (createClientError) {
            console.error('Error creating client:', createClientError);
        } else {
            console.log('Created Client record:', newClient);
        }
    }

    // 3. Verify Profile Role is 'athlete'
    const { error: profileError } = await supabase
        .from('profiles')
        .update({ role: 'athlete' })
        .eq('id', patient.id);

    if (!profileError) console.log('Verified Profile Role is Athlete');
}

linkPatient();
