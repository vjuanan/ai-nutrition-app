'use server';

import { createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

/**
 * Legacy compatibility: fetch clinic list for assignment dropdowns.
 */
export async function getCoaches() {
    const supabase = createServerClient();

    const { data: clinics, error } = await supabase
        .from('clients')
        .select('id, name, user_id')
        .eq('type', 'clinic')
        .order('name');

    if (error) {
        console.error('Error fetching clinics:', error);
        return [];
    }

    return (clinics || []).map((clinic) => ({
        id: clinic.id,
        full_name: clinic.name,
        business_name: clinic.name,
        user_id: clinic.user_id
    }));
}

/**
 * Legacy compatibility: assigns a clinic to a patient client row
 */
export async function assignCoach(clientId: string, coachId: string) {
    const supabase = createServerClient();
    const { error } = await supabase
        .from('clients')
        .update({ clinic_id: coachId })
        .eq('id', clientId);

    if (error) {
        console.error('Error assigning clinic:', error);
        throw new Error('No se pudo asignar la clínica.');
    }

    revalidatePath(`/patients/${clientId}`);
    revalidatePath('/patients');
    revalidatePath('/clinics');
    return { success: true };
}
