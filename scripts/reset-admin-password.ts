import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function resetAdminPassword() {
    const email = 'vjuanan@gmail.com';
    const newPassword = 'Admin2026!';

    console.log(`\n🔍 Looking for user: ${email}...\n`);

    // 1. List all users and find ours
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();

    if (listError) {
        console.error('❌ Error listing users:', listError.message);
        return;
    }

    console.log(`Total users in Supabase: ${users.length}`);
    users.forEach(u => {
        console.log(`  - ${u.email} (ID: ${u.id}, confirmed: ${!!u.email_confirmed_at})`);
    });

    const existingUser = users.find(u => u.email === email);

    if (!existingUser) {
        console.log(`\n⚠️ User ${email} does NOT exist. Creating it now...`);
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password: newPassword,
            email_confirm: true,
            user_metadata: { full_name: 'Super Admin Juanan', role: 'admin' }
        });

        if (createError) {
            console.error('❌ Error creating user:', createError.message);
            return;
        }

        console.log(`✅ User created! ID: ${newUser.user.id}`);

        // Ensure profile exists with coach role for dashboard access
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .upsert({
                id: newUser.user.id,
                email: email,
                role: 'coach',
                full_name: 'Super Admin Juanan'
            });

        if (profileError) {
            console.error('❌ Error creating profile:', profileError.message);
        } else {
            console.log('✅ Profile created with role: coach');
        }
    } else {
        console.log(`\n✅ User found! ID: ${existingUser.id}`);
        console.log(`   Email confirmed: ${!!existingUser.email_confirmed_at}`);

        // Reset password
        console.log(`\n🔑 Resetting password...`);
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            existingUser.id,
            { password: newPassword, email_confirm: true }
        );

        if (updateError) {
            console.error('❌ Error resetting password:', updateError.message);
            return;
        }
        console.log('✅ Password reset successfully!');

        // Ensure profile has coach role
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('id', existingUser.id)
            .single();

        console.log('\n📋 Current profile:', profile);

        if (!profile || profile.role !== 'coach') {
            const { error: profileError } = await supabaseAdmin
                .from('profiles')
                .upsert({
                    id: existingUser.id,
                    email: email,
                    role: 'coach',
                    full_name: profile?.full_name || 'Super Admin Juanan'
                });

            if (profileError) {
                console.error('❌ Error updating profile:', profileError.message);
            } else {
                console.log('✅ Profile updated with role: coach');
            }
        }
    }

    console.log('\n🎉 Done! Login credentials:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${newPassword}`);
    console.log(`   URL: https://ainutrition.epnstore.com.ar`);
}

resetAdminPassword().catch(console.error);
