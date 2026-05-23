const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRole) {
    console.error('Error: Faltan variables de entorno NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local');
    process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function confirmAndPromoteUsers() {
    console.log('=== INICIANDO AUTO-CONFIRMACIÓN Y ASCENSO DE USUARIOS EN SUPABASE ===');
    try {
        const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
        if (error) throw error;

        console.log(`Encontrados ${users.length} usuarios en Supabase Auth.`);

        for (const user of users) {
            // 1. Confirm email if unconfirmed
            if (!user.email_confirmed_at) {
                console.log(`Confirmando email para: ${user.email}...`);
                const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
                    user.id,
                    { email_confirm: true }
                );
                if (updateError) {
                    console.error(`❌ Error al confirmar ${user.email}:`, updateError.message);
                } else {
                    console.log(`✅ Usuario ${user.email} confirmado con éxito.`);
                }
            } else {
                console.log(`🔹 Usuario ${user.email} ya estaba confirmado.`);
            }

            // 2. Automatically elevate vjuanan@gmail.com to Superadmin (role = 'admin')
            if (user.email === 'vjuanan@gmail.com') {
                console.log(`👑 Detectado vjuanan@gmail.com! Asegurando rol 'admin' en la base de datos...`);
                
                // Update profile role in public.profiles table
                const { data: profile, error: profileErr } = await supabaseAdmin
                    .from('profiles')
                    .update({ role: 'admin' })
                    .eq('id', user.id)
                    .select();

                if (profileErr) {
                    console.error(`❌ Error al actualizar rol de vjuanan@gmail.com:`, profileErr.message);
                } else {
                    console.log(`✅ vjuanan@gmail.com elevado a 'admin' con éxito en base de datos.`);
                }
            }
        }
        console.log('=== PROCESO DE AUTO-CONFIRMACIÓN Y CONFIGURACIÓN COMPLETADO ===');
    } catch (err) {
        console.error('❌ Error general en la confirmación:', err.message);
    }
}

confirmAndPromoteUsers();
