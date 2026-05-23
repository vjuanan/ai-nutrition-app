'use client';

import { Topbar } from '@/components/app-shell/Topbar';
import { getAdministrationUserDetail, updateAdministrationUser } from '@/lib/actions';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, ArrowLeft, Save } from 'lucide-react';

type EditableRole = 'patient' | 'nutritionist' | 'admin';

interface ProfileAttributes {
  birth_date: string;
  gender: string;
  height: number | '';
  weight: number | '';
  nutrition_goal: string;
  medical_conditions: string;
  medical_notes: string;
  food_allergies: string;
  other_allergies: string;
  activity_level: string;
  meals_per_day: number | '';
  diet_preference: string;
  whatsapp_number: string;
  avatar_url: string;
  professional_title: string;
  license_number: string;
  specialization: string;
  clinic_name: string;
  clinic_address: string;
  consultation_modality: string;
  approach: string;
  experience_years: number | '';
  contact_phone: string;
  website_url: string;
  instagram_handle: string;
}

interface UserDetailState {
  id: string;
  email: string;
  full_name: string;
  role: EditableRole;
  onboarding_completed: boolean;
  clinic_id: string | null;
  profileAttributes: ProfileAttributes;
}

const DEFAULT_PROFILE_ATTRIBUTES: ProfileAttributes = {
  birth_date: '',
  gender: '',
  height: '',
  weight: '',
  nutrition_goal: '',
  medical_conditions: '',
  medical_notes: '',
  food_allergies: '',
  other_allergies: '',
  activity_level: '',
  meals_per_day: '',
  diet_preference: '',
  whatsapp_number: '',
  avatar_url: '',
  professional_title: '',
  license_number: '',
  specialization: '',
  clinic_name: '',
  clinic_address: '',
  consultation_modality: '',
  approach: '',
  experience_years: '',
  contact_phone: '',
  website_url: '',
  instagram_handle: '',
};

function toCsvValue(value: unknown) {
  if (Array.isArray(value)) {
    return value.filter(Boolean).join(', ');
  }
  return typeof value === 'string' ? value : '';
}

function toNumberOrNull(value: number | '') {
  if (value === '') return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function toArrayFromCsv(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function AdministrationUserDetailPage() {
  const params = useParams<{ userId: string }>();
  const router = useRouter();
  const userId = params.userId;

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [clinics, setClinics] = useState<Array<{ id: string; name: string }>>([]);
  const [form, setForm] = useState<UserDetailState | null>(null);
  const [password, setPassword] = useState('');

  const canSelectClinic = useMemo(() => form?.role === 'patient', [form?.role]);
  const isPatient = useMemo(() => form?.role === 'patient', [form?.role]);
  const isNutritionist = useMemo(() => form?.role === 'nutritionist', [form?.role]);

  useEffect(() => {
    let active = true;
    async function loadDetail() {
      setIsLoading(true);
      setError(null);
      const res = await getAdministrationUserDetail(userId);
      if (!active) return;

      if (res.error || !res.data) {
        setError(res.error || 'No se pudo cargar el usuario');
        setIsLoading(false);
        return;
      }

      setClinics((res.clinics || []) as Array<{ id: string; name: string }>);
      setForm({
        id: res.data.id,
        email: res.data.email || '',
        full_name: res.data.full_name || '',
        role: (res.data.role as EditableRole) || 'patient',
        onboarding_completed: !!res.data.onboarding_completed,
        clinic_id: res.data.clinic_id || null,
        profileAttributes: {
          birth_date: res.data.birth_date || '',
          gender: res.data.gender || '',
          height: typeof res.data.height === 'number' ? res.data.height : '',
          weight: typeof res.data.weight === 'number' ? res.data.weight : '',
          nutrition_goal: res.data.nutrition_goal || '',
          medical_conditions: toCsvValue(res.data.medical_conditions),
          medical_notes: res.data.medical_notes || '',
          food_allergies: toCsvValue(res.data.food_allergies),
          other_allergies: res.data.other_allergies || '',
          activity_level: res.data.activity_level || '',
          meals_per_day: typeof res.data.meals_per_day === 'number' ? res.data.meals_per_day : '',
          diet_preference: res.data.diet_preference || '',
          whatsapp_number: res.data.whatsapp_number || '',
          avatar_url: res.data.avatar_url || '',
          professional_title: res.data.professional_title || '',
          license_number: res.data.license_number || '',
          specialization: res.data.specialization || '',
          clinic_name: res.data.clinic_name || res.data.client_name || '',
          clinic_address: res.data.clinic_address || res.data.client_details?.clinic_address || '',
          consultation_modality: res.data.consultation_modality || res.data.client_details?.consultation_modality || '',
          approach: toCsvValue(res.data.approach || res.data.client_details?.approach),
          experience_years: typeof res.data.experience_years === 'number'
            ? res.data.experience_years
            : (typeof res.data.client_details?.experience_years === 'number' ? res.data.client_details.experience_years : ''),
          contact_phone: res.data.contact_phone || res.data.client_details?.contact_phone || '',
          website_url: res.data.website_url || res.data.client_details?.website_url || '',
          instagram_handle: res.data.instagram_handle || res.data.client_details?.instagram_handle || '',
        },
      });
      setIsLoading(false);
    }

    loadDetail();
    return () => { active = false; };
  }, [userId]);

  function updateProfileField<K extends keyof ProfileAttributes>(key: K, value: ProfileAttributes[K]) {
    if (!form) return;
    setForm({
      ...form,
      profileAttributes: {
        ...form.profileAttributes,
        [key]: value,
      },
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    const profileAttributesPayload = {
      ...form.profileAttributes,
      medical_conditions: toArrayFromCsv(form.profileAttributes.medical_conditions),
      food_allergies: toArrayFromCsv(form.profileAttributes.food_allergies),
      approach: toArrayFromCsv(form.profileAttributes.approach),
      height: toNumberOrNull(form.profileAttributes.height),
      weight: toNumberOrNull(form.profileAttributes.weight),
      meals_per_day: toNumberOrNull(form.profileAttributes.meals_per_day),
      experience_years: toNumberOrNull(form.profileAttributes.experience_years),
      birth_date: form.profileAttributes.birth_date || null,
    };

    const res = await updateAdministrationUser({
      userId: form.id,
      fullName: form.full_name,
      email: form.email,
      role: form.role,
      clinicId: form.role === 'patient' ? form.clinic_id : null,
      password: password.trim() || undefined,
      profileAttributes: profileAttributesPayload as any,
    });

    if (!res.success) {
      setError(res.error || 'No se pudo guardar');
      setIsSaving(false);
      return;
    }

    setPassword('');
    setSuccess('Usuario actualizado correctamente');
    setIsSaving(false);
  }

  return (
    <>
      <Topbar />
      <div className="max-w-5xl mx-auto py-4 space-y-4">
        <div className="flex items-center gap-3">
          <Link
            href="/administration"
            className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft size={16} />
            Volver a Administración
          </Link>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
          {isLoading && (
            <div className="py-16 flex justify-center">
              <Loader2 className="animate-spin text-emerald-500" />
            </div>
          )}

          {!isLoading && error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700 px-4 py-3 text-sm">
              {error}
            </div>
          )}

          {!isLoading && form && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold text-slate-900">Perfil de Usuario</h1>
                <button
                  type="button"
                  onClick={() => router.push('/administration')}
                  className="text-sm text-slate-500 hover:text-slate-800"
                >
                  Cerrar
                </button>
              </div>

              {success && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 px-4 py-3 text-sm">
                  {success}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="space-y-1">
                  <span className="text-xs uppercase tracking-wide text-slate-500">Nombre completo</span>
                  <input
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                    required
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-xs uppercase tracking-wide text-slate-500">Email</span>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                    required
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-xs uppercase tracking-wide text-slate-500">Rol</span>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value as EditableRole })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  >
                    <option value="patient">Paciente</option>
                    <option value="nutritionist">Nutricionista / Clínica</option>
                    <option value="admin">Administrador</option>
                  </select>
                </label>

                <label className="space-y-1">
                  <span className="text-xs uppercase tracking-wide text-slate-500">Nueva contraseña (opcional)</span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  />
                </label>
              </div>

              {canSelectClinic && (
                <label className="space-y-1 block">
                  <span className="text-xs uppercase tracking-wide text-slate-500">Clínica asignada</span>
                  <select
                    value={form.clinic_id || ''}
                    onChange={(e) => setForm({ ...form, clinic_id: e.target.value || null })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  >
                    <option value="">Sin asignar</option>
                    {clinics.map((clinic) => (
                      <option key={clinic.id} value={clinic.id}>{clinic.name}</option>
                    ))}
                  </select>
                </label>
              )}

              {isPatient && (
                <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
                  <h2 className="text-sm font-semibold text-slate-700">Atributos de Paciente (signup)</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <label className="space-y-1">
                      <span className="text-xs text-slate-500">Fecha de nacimiento</span>
                      <input type="date" value={form.profileAttributes.birth_date} onChange={(e) => updateProfileField('birth_date', e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs text-slate-500">Género</span>
                      <input value={form.profileAttributes.gender} onChange={(e) => updateProfileField('gender', e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs text-slate-500">Altura (cm)</span>
                      <input type="number" value={form.profileAttributes.height} onChange={(e) => updateProfileField('height', e.target.value === '' ? '' : Number(e.target.value))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs text-slate-500">Peso (kg)</span>
                      <input type="number" step="0.1" value={form.profileAttributes.weight} onChange={(e) => updateProfileField('weight', e.target.value === '' ? '' : Number(e.target.value))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs text-slate-500">Objetivo nutricional</span>
                      <input value={form.profileAttributes.nutrition_goal} onChange={(e) => updateProfileField('nutrition_goal', e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs text-slate-500">Nivel de actividad</span>
                      <input value={form.profileAttributes.activity_level} onChange={(e) => updateProfileField('activity_level', e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs text-slate-500">Comidas por día</span>
                      <input type="number" value={form.profileAttributes.meals_per_day} onChange={(e) => updateProfileField('meals_per_day', e.target.value === '' ? '' : Number(e.target.value))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs text-slate-500">Preferencia alimentaria</span>
                      <input value={form.profileAttributes.diet_preference} onChange={(e) => updateProfileField('diet_preference', e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs text-slate-500">WhatsApp</span>
                      <input value={form.profileAttributes.whatsapp_number} onChange={(e) => updateProfileField('whatsapp_number', e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs text-slate-500">Avatar URL</span>
                      <input value={form.profileAttributes.avatar_url} onChange={(e) => updateProfileField('avatar_url', e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs text-slate-500">Condiciones médicas (CSV)</span>
                      <input value={form.profileAttributes.medical_conditions} onChange={(e) => updateProfileField('medical_conditions', e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs text-slate-500">Alergias alimentarias (CSV)</span>
                      <input value={form.profileAttributes.food_allergies} onChange={(e) => updateProfileField('food_allergies', e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                    </label>
                    <label className="space-y-1 md:col-span-2">
                      <span className="text-xs text-slate-500">Notas médicas</span>
                      <textarea value={form.profileAttributes.medical_notes} onChange={(e) => updateProfileField('medical_notes', e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm min-h-[70px]" />
                    </label>
                    <label className="space-y-1 md:col-span-2">
                      <span className="text-xs text-slate-500">Otras alergias</span>
                      <input value={form.profileAttributes.other_allergies} onChange={(e) => updateProfileField('other_allergies', e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                    </label>
                  </div>
                </div>
              )}

              {isNutritionist && (
                <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
                  <h2 className="text-sm font-semibold text-slate-700">Atributos de Nutricionista/Clínica (signup)</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <label className="space-y-1">
                      <span className="text-xs text-slate-500">Nombre de clínica</span>
                      <input value={form.profileAttributes.clinic_name} onChange={(e) => updateProfileField('clinic_name', e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs text-slate-500">Título profesional</span>
                      <input value={form.profileAttributes.professional_title} onChange={(e) => updateProfileField('professional_title', e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs text-slate-500">Matrícula</span>
                      <input value={form.profileAttributes.license_number} onChange={(e) => updateProfileField('license_number', e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs text-slate-500">Especialización</span>
                      <input value={form.profileAttributes.specialization} onChange={(e) => updateProfileField('specialization', e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs text-slate-500">Dirección clínica</span>
                      <input value={form.profileAttributes.clinic_address} onChange={(e) => updateProfileField('clinic_address', e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs text-slate-500">Modalidad consulta</span>
                      <input value={form.profileAttributes.consultation_modality} onChange={(e) => updateProfileField('consultation_modality', e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs text-slate-500">Enfoque (CSV)</span>
                      <input value={form.profileAttributes.approach} onChange={(e) => updateProfileField('approach', e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs text-slate-500">Años experiencia</span>
                      <input type="number" value={form.profileAttributes.experience_years} onChange={(e) => updateProfileField('experience_years', e.target.value === '' ? '' : Number(e.target.value))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs text-slate-500">Teléfono</span>
                      <input value={form.profileAttributes.contact_phone} onChange={(e) => updateProfileField('contact_phone', e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs text-slate-500">Website</span>
                      <input value={form.profileAttributes.website_url} onChange={(e) => updateProfileField('website_url', e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs text-slate-500">Instagram</span>
                      <input value={form.profileAttributes.instagram_handle} onChange={(e) => updateProfileField('instagram_handle', e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs text-slate-500">Avatar / Logo URL</span>
                      <input value={form.profileAttributes.avatar_url} onChange={(e) => updateProfileField('avatar_url', e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                    </label>
                  </div>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 text-sm font-medium disabled:opacity-60"
                >
                  {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                  Guardar cambios
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}

