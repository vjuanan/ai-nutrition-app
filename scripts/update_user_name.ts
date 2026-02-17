
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updateUserName() {
    console.log('Updating user name...');

    // 1. Find the user by searching profiles (we don't have the ID, so we might need to search by email or name)
    // The user said "Super Admin Juanan" -> "Licenciado Juanan".
    // Let's try to find "Super Admin Juanan" first.

    const { data: profiles, error: searchError } = await supabase
        .from('profiles')
        .select('*')
        .ilike('full_name', '%Juanan%');

    if (searchError) {
        console.error('Error searching profiles:', searchError);
        return;
    }

    if (!profiles || profiles.length === 0) {
        console.log('No profiles found matching "Juanan".');
        return;
    }

    console.log(`Found ${profiles.length} profiles.`);

    for (const profile of profiles) {
        console.log(`Checking profile: ${profile.full_name} (${profile.email})`);

        // We want to update "Super Admin Juanan" OR just "Juanan" if that's what it is.
        // The user specifically mentioned "Super Admin Juanan".
        // But let's be safe and update the specific user the user is logging in as: vjuanan@gmail.com

        if (profile.email === 'vjuanan@gmail.com') {
            console.log(`Updating profile for ${profile.email}...`);
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ full_name: 'Licenciado Juanan' })
                .eq('id', profile.id);

            if (updateError) {
                console.error(`Error updating profile ${profile.id}:`, updateError);
            } else {
                console.log(`Successfully updated profile ${profile.id} to "Licenciado Juanan".`);
            }

            // Also update user metadata if possible (optional but good for consistency)
            const { error: authError } = await supabase.auth.admin.updateUserById(
                profile.id,
                { user_metadata: { full_name: 'Licenciado Juanan' } }
            );
            if (authError) {
                console.error(`Error updating auth metadata for ${profile.id}:`, authError);
            } else {
                console.log(`Successfully updated auth metadata for ${profile.id}.`);
            }
        }
    }
}

updateUserName().catch(console.error);
