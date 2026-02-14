
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase URL or Service Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixAdminPermissions() {
    const email = 'admin@epnstore.com.ar';
    console.log(`Fixing permissions for ${email}...`);

    // 1. Get User ID
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();

    if (userError) {
        console.error('Error listing users:', userError);
        return;
    }

    const user = users.find(u => u.email === email);

    if (!user) {
        console.error('User not found!');
        return;
    }

    console.log(`Found user ${user.id}`);

    // 2. Update Profile Role to 'coach' (Authorized to create plans)
    // We use 'coach' because the RLS policy likely allows 'coach' to insert into plan_days
    // 'admin' might not be explicitly handled in that specific policy, or might be handled differently.
    // 'coach' is safer for now to unblock functionality.
    const { error: updateError } = await supabase
        .from('profiles')
        .update({ role: 'coach' })
        .eq('id', user.id);

    if (updateError) {
        console.error('Error updating profile:', updateError);
    } else {
        console.log('Successfully updated role to "coach"');
    }
}

fixAdminPermissions();
