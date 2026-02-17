
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// SCRIPT: Fix Super Admin Permissions
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function fixSuperAdminPermissions() {
    const email = 'vjuanan@gmail.com';
    const password = 'password123'; // Reset password to ensure access

    console.log(`\n🔍 Fixing permissions for: ${email}...\n`);

    // 1. Get User ID
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) { console.error('Error listing users:', listError); return; }

    const user = users.find(u => u.email === email);

    if (!user) {
        console.error('❌ User not found! Please run create-superadmin.ts first.');
        return;
    }

    console.log(`✅ User found! ID: ${user.id}`);

    // 2. Force Update Profile
    // We update 'role' to 'admin' AND 'onboarding_completed' to TRUE
    const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
            role: 'admin',
            onboarding_completed: true,
            full_name: 'Super Admin Juanan'
        })
        .eq('id', user.id);

    if (updateError) {
        console.error('❌ Error updating profile:', updateError.message);
    } else {
        console.log('✅ Profile updated successfully:');
        console.log('   - Role: admin');
        console.log('   - Onboarding Completed: true');
    }

    // 3. Reset Password (Just in case)
    const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(
        user.id,
        { password: password, email_confirm: true }
    );

    if (passwordError) {
        console.error('❌ Error resetting password:', passwordError.message);
    } else {
        console.log(`✅ Password reset to: ${password}`);
    }

    console.log('\n🎉 Fix Complete! Try logging in now at https://ainutrition.epnstore.com.ar');
}

fixSuperAdminPermissions().catch(console.error);
