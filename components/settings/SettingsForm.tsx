'use client';

import Image from 'next/image';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
    User,
    Camera,
    LogOut,
    Save,
    Loader2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ProfileDetailsEditor } from '@/components/athletes/ProfileDetailsEditor';

interface SettingsFormProps {
    user: any;
    initialProfile: any;
}

export function SettingsForm({ user, initialProfile }: SettingsFormProps) {
    const [saving, setSaving] = useState(false);
    const [profile, setProfile] = useState<any>(initialProfile || {});

    const supabase = createClient();
    const router = useRouter();

    const handleSaveProfile = async () => {
        setSaving(true);
        try {
            // 1. Update Profile in Database
            // We use spread to include all dynamic fields (athlete stats, etc)
            const payload = {
                full_name: profile.full_name,
                whatsapp_number: profile.whatsapp_number,
                birth_date: profile.birth_date,
                height: profile.height,
                weight: profile.weight,
                main_goal: profile.main_goal,
                training_place: profile.training_place,
                days_per_week: profile.days_per_week,
                minutes_per_session: profile.minutes_per_session,
                experience_level: profile.experience_level,
                injuries: profile.injuries,
                training_preferences: profile.training_preferences,
                equipment_list: profile.equipment_list
            };

            const { error } = await supabase
                .from('profiles')
                .update(payload)
                .eq('id', user.id);

            if (error) throw error;

            // 2. Update Auth Metadata (so headers/dashboard update instantly)
            const { error: authError } = await supabase.auth.updateUser({
                data: { full_name: profile.full_name }
            });

            if (authError) {
                console.error('Error syncing auth metadata:', authError);
                // We don't throw here to avoid rollback of the DB update, 
                // but we log it. The DB is the source of truth, but Auth is used for UI.
            }

            router.refresh(); // Refresh server data
        } catch (error) {
            console.error('Error updating profile:', error);
        } finally {
            setSaving(false);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.refresh();
        router.push('/login');
    };

    return (
        <div className="h-full">
            {/* 2-Column Layout Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
                {/* Left Column - Profile */}
                <div className="space-y-4">
                    <div className="cv-card h-fit">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="font-semibold text-cv-text-primary flex items-center gap-2">
                                <User size={18} />
                                Perfil
                            </h2>
                        </div>

                        <div className="space-y-4">
                            {/* Avatar and Photo Section - Inline */}
                            <div className="flex items-center gap-4 pb-4 border-b border-cv-border">
                                <div className="relative group flex-shrink-0">
                                    <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-cv-border bg-cv-bg-tertiary">
                                        {profile.avatar_url ? (
                                            <Image
                                                src={profile.avatar_url}
                                                alt="Profile"
                                                width={64}
                                                height={64}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-cv-accent/10 text-cv-accent text-xl font-bold">
                                                {profile.full_name
                                                    ? profile.full_name
                                                        .split(' ')
                                                        .map((n: string) => n[0])
                                                        .join('')
                                                        .substring(0, 2)
                                                        .toUpperCase()
                                                    : 'U'}
                                            </div>
                                        )}
                                        {/* Overlay for hover */}
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-full">
                                            <Camera size={18} className="text-white" />
                                        </div>
                                    </div>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;

                                            if (file.size > 5 * 1024 * 1024) {
                                                alert('La imagen no debe superar los 5MB');
                                                return;
                                            }

                                            setSaving(true);
                                            try {
                                                const fileExt = file.name.split('.').pop();
                                                const fileName = `${user.id}/${Math.random()}.${fileExt}`;
                                                const filePath = `${fileName}`;

                                                const { error: uploadError } = await supabase.storage
                                                    .from('avatars')
                                                    .upload(filePath, file);

                                                if (uploadError) throw uploadError;

                                                const { data: { publicUrl } } = supabase.storage
                                                    .from('avatars')
                                                    .getPublicUrl(filePath);

                                                const { error: updateError } = await supabase
                                                    .from('profiles')
                                                    .update({ avatar_url: publicUrl })
                                                    .eq('id', user.id);

                                                if (updateError) throw updateError;

                                                setProfile({ ...profile, avatar_url: publicUrl });
                                                router.refresh();

                                            } catch (error) {
                                                console.error('Error uploading avatar:', error);
                                                alert('Error al subir la imagen');
                                            } finally {
                                                setSaving(false);
                                            }
                                        }}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-medium text-cv-text-primary text-sm">Foto de Perfil</h3>
                                    <p className="text-xs text-cv-text-tertiary">
                                        Click para cambiar. Min 400x400px.
                                    </p>
                                </div>
                            </div>

                            {/* Form Fields - Generic */}
                            <div className="grid grid-cols-1 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-cv-text-secondary mb-1">Nombre completo</label>
                                    <input
                                        type="text"
                                        value={profile.full_name || ''}
                                        onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                                        className="cv-input py-2"
                                        placeholder="Tu nombre"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-cv-text-secondary mb-1">Correo</label>
                                    <input
                                        type="email"
                                        value={profile.email || user?.email || ''}
                                        className="cv-input py-2 opacity-60 cursor-not-allowed"
                                        disabled
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-cv-text-secondary mb-1">WhatsApp</label>
                                    <input
                                        type="tel"
                                        value={profile.whatsapp_number || ''}
                                        onChange={(e) => setProfile({ ...profile, whatsapp_number: e.target.value })}
                                        className="cv-input py-2"
                                        placeholder="+54 9 11 1234 5678"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Athlete Specific Fields */}
                    {profile.role === 'athlete' && (
                        <div className="h-fit">
                            <ProfileDetailsEditor
                                athleteId={user.id}
                                initialData={{
                                    dob: profile.birth_date,
                                    height: profile.height,
                                    weight: profile.weight,
                                    goal: profile.main_goal,
                                    training_place: profile.training_place,
                                    equipment: profile.equipment_list,
                                    days_per_week: profile.days_per_week,
                                    minutes_per_session: profile.minutes_per_session,
                                    level: profile.experience_level,
                                    injuries: profile.injuries,
                                    preferences: profile.training_preferences,
                                    whatsapp: profile.whatsapp_number,
                                    email: profile.email
                                }}
                            />
                        </div>
                    )}

                    {/* General Save Button (For top section only) */}
                    <div className="flex justify-end pt-1">
                        <button
                            onClick={handleSaveProfile}
                            disabled={saving}
                            className="cv-btn-primary flex items-center gap-2 px-4 py-2 text-sm w-full justify-center md:w-auto"
                        >
                            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            Guardar General
                        </button>
                    </div>
                </div>

                {/* Right Column - Session */}
                <div className="space-y-4">
                    {/* Logout Button */}
                    <div className="cv-card border-red-500/20">
                        <h2 className="font-semibold text-cv-text-primary mb-3 flex items-center gap-2">
                            <LogOut size={18} />
                            Sesión
                        </h2>
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors text-sm font-medium"
                        >
                            <LogOut size={16} />
                            Cerrar Sesión
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
