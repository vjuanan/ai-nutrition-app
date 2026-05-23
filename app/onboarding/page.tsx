
'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
    ChevronRight, ChevronLeft, Calendar, Ruler, Weight, Target,
    AlertCircle, MessageSquare, Camera, Upload, Check,
    Phone, LogOut, Heart, Apple, Stethoscope, Activity,
    UtensilsCrossed, ShieldAlert, Leaf, GraduationCap,
    MapPin, Globe, Building2, Clock, Instagram, User
} from 'lucide-react';
import { refreshUserRoleReference, syncOnboardingClient } from '../auth/actions';

// --- Shared UI Helpers ---

const InputLabel = ({ icon: Icon, label, color = 'text-emerald-600' }: { icon: any, label: string, color?: string }) => (
    <div className="flex items-center gap-2 mb-4 text-gray-900 font-semibold">
        <Icon className={`w-5 h-5 ${color}`} />
        <span>{label}</span>
    </div>
);

const OptionButton = ({ selected, onClick, children, accentColor = 'emerald' }: {
    selected: boolean, onClick: () => void, children: React.ReactNode, accentColor?: string
}) => {
    const colors: Record<string, string> = {
        emerald: selected ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-100 hover:bg-gray-50',
        teal: selected ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-gray-100 hover:bg-gray-50',
    };
    return (
        <button
            onClick={onClick}
            className={`p-4 rounded-xl text-left border-2 transition-all ${colors[accentColor]}`}
        >
            {children}
        </button>
    );
};

const CheckboxOption = ({ checked, onChange, label, accentColor = 'emerald' }: {
    checked: boolean, onChange: (v: boolean) => void, label: string, accentColor?: string
}) => {
    const colors: Record<string, string> = {
        emerald: checked ? 'border-emerald-500 bg-emerald-50' : 'border-gray-100 hover:bg-gray-50',
        teal: checked ? 'border-teal-500 bg-teal-50' : 'border-gray-100 hover:bg-gray-50',
    };
    const checkColors: Record<string, string> = {
        emerald: 'text-emerald-600 focus:ring-emerald-500',
        teal: 'text-teal-600 focus:ring-teal-500',
    };
    return (
        <label className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${colors[accentColor]}`}>
            <input
                type="checkbox"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
                className={`w-5 h-5 rounded border-gray-300 ${checkColors[accentColor]}`}
            />
            <span className="font-medium">{label}</span>
        </label>
    );
};

// --- Step 0: Role Selection ---

const Step0RoleSelection = ({ onSelect, isLoading }: { onSelect: (role: 'patient' | 'nutritionist') => void, isLoading: boolean }) => (
    <div className="space-y-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="mb-2">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/20">
                <Apple className="text-white" size={32} />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Bienvenido a AI Nutrition</h1>
            <p className="text-gray-500 mt-2">¿Cómo quieres usar la plataforma?</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <button
                disabled={isLoading}
                onClick={() => onSelect('patient')}
                className="group p-8 border-2 border-gray-100 rounded-3xl hover:border-emerald-500 hover:bg-emerald-50 transition-all text-left flex flex-col gap-4 disabled:opacity-50 h-full shadow-sm hover:shadow-md"
            >
                <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform shadow-inner">
                    <Heart size={28} />
                </div>
                <div>
                    <h3 className="font-bold text-xl text-gray-900 mb-2">Soy Paciente</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">Quiero recibir mi plan nutricional personalizado y hacer seguimiento de mi alimentación.</p>
                </div>
            </button>
            <button
                disabled={isLoading}
                onClick={() => onSelect('nutritionist')}
                className="group p-8 border-2 border-gray-100 rounded-3xl hover:border-teal-500 hover:bg-teal-50 transition-all text-left flex flex-col gap-4 disabled:opacity-50 h-full shadow-sm hover:shadow-md"
            >
                <div className="w-14 h-14 bg-teal-100 rounded-2xl flex items-center justify-center text-teal-600 group-hover:scale-110 transition-transform shadow-inner">
                    <Stethoscope size={28} />
                </div>
                <div>
                    <h3 className="font-bold text-xl text-gray-900 mb-2">Soy Nutricionista</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">Quiero crear planes nutricionales para mis pacientes y gestionar consultas.</p>
                </div>
            </button>
        </div>
    </div>
);

// --- Wizard Steps ---

export default function OnboardingPage() {
    const router = useRouter();
    const supabase = createClient();
    const [step, setStep] = useState(0);
    const [role, setRole] = useState<'patient' | 'nutritionist' | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    // Patient Form State
    const [patientData, setPatientData] = useState({
        birth_date: '',
        gender: '',
        height: 170,
        weight: 70.0,
        nutrition_goal: '',
        medical_conditions: [] as string[],
        medical_notes: '',
        food_allergies: [] as string[],
        other_allergies: '',
        activity_level: '',
        meals_per_day: 4,
        diet_preference: '',
        whatsapp_number: '',
        avatar_url: '',
    });

    // Nutritionist Form State
    const [nutritionistData, setNutritionistData] = useState({
        full_name: '',
        professional_title: '',
        license_number: '',
        specialization: '',
        clinic_name: '',
        clinic_address: '',
        consultation_modality: '',
        approach: [] as string[],
        experience_years: 5,
        contact_phone: '',
        website_url: '',
        instagram_handle: '',
        avatar_url: '',
    });

    const updatePatientField = (field: string, value: any) => {
        setPatientData(prev => ({ ...prev, [field]: value }));
    };

    const updateNutritionistField = (field: string, value: any) => {
        setNutritionistData(prev => ({ ...prev, [field]: value }));
    };

    const toggleArrayItem = (arr: string[], item: string): string[] => {
        return arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item];
    };

    const extractUnknownColumn = (errorMessage: string, allowedKeys: string[]) => {
        const patterns = [
            /could not find the ['"]?([a-zA-Z0-9_]+)['"]?\s+column/i,
            /'([a-zA-Z0-9_]+)'\s+column/i,
            /column\s+["']([a-zA-Z0-9_]+)["']/i,
            /column\s+([a-zA-Z0-9_]+)/i,
        ];

        for (const pattern of patterns) {
            const match = errorMessage.match(pattern);
            const column = match?.[1];
            if (column && allowedKeys.includes(column)) return column;
        }

        return null;
    };

    const updateProfileWithFallback = async (userId: string, payload: Record<string, any>) => {
        let currentPayload = { ...payload };

        for (let attempt = 0; attempt < 10; attempt += 1) {
            const { error } = await supabase
                .from('profiles')
                .update(currentPayload)
                .eq('id', userId);

            if (!error) return null;

            const unknownColumn = extractUnknownColumn(error.message || '', Object.keys(currentPayload));
            if (!unknownColumn || !(unknownColumn in currentPayload)) {
                return error;
            }

            const { [unknownColumn]: _removed, ...rest } = currentPayload;
            currentPayload = rest;
        }

        return new Error('Profile update fallback exceeded attempts');
    };

    // Save Patient to DB
    const savePatientProfile = async () => {
        setSaveError(null);
        setIsLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setSaveError('No se encontró sesión activa.');
                return false;
            }

            const { avatar_url, ...dataToSave } = patientData;
            const error = await updateProfileWithFallback(user.id, {
                ...dataToSave,
                medical_conditions: dataToSave.medical_conditions,
                food_allergies: dataToSave.food_allergies,
            });

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error saving patient:', error);
            setSaveError('No se pudieron guardar los datos. Revisa los campos e intenta de nuevo.');
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    // Save Nutritionist to DB
    const saveNutritionistProfile = async () => {
        setSaveError(null);
        setIsLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setSaveError('No se encontró sesión activa.');
                return false;
            }

            const { avatar_url, ...dataToSave } = nutritionistData;
            const error = await updateProfileWithFallback(user.id, {
                ...dataToSave,
                approach: dataToSave.approach,
            });

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error saving nutritionist:', error);
            setSaveError('No se pudieron guardar los datos. Revisa los campos e intenta de nuevo.');
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    const handleRoleSelect = async (selectedRole: 'patient' | 'nutritionist') => {
        setIsLoading(true);
        setSaveError(null);
        setRole(selectedRole);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase.from('profiles').update({ role: selectedRole }).eq('id', user.id);
                await refreshUserRoleReference();
            }
            setStep(1);
        } catch (e) { console.error(e); }
        setIsLoading(false);
    };

    const finishOnboarding = async (redirectTo: string) => {
        setIsLoading(true);
        setSaveError(null);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase.from('profiles').update({ onboarding_completed: true }).eq('id', user.id);

                if (role === 'nutritionist') {
                    await syncOnboardingClient('nutritionist', {
                        clinicName: nutritionistData.clinic_name,
                        fullName: nutritionistData.full_name || user.user_metadata?.full_name,
                        email: user.email
                    });
                }

                if (role === 'patient') {
                    await syncOnboardingClient('patient', {
                        fullName: user.user_metadata?.full_name,
                        email: user.email
                    });
                }

                await refreshUserRoleReference();
            }
            router.push(redirectTo);
        } catch (e) {
            console.error(e);
            setSaveError('No se pudo finalizar el onboarding. Intenta nuevamente.');
        }
        setIsLoading(false);
    };

    const nextPatientStep = async () => {
        const saved = await savePatientProfile();
        if (!saved) return;
        if (step === 6) {
            await finishOnboarding('/');
        } else {
            setStep(s => s + 1);
        }
    };

    const nextNutritionistStep = async () => {
        const saved = await saveNutritionistProfile();
        if (!saved) return;
        if (step === 5) {
            await finishOnboarding('/');
        } else {
            setStep(s => s + 1);
        }
    };

    const prevStep = () => setStep(s => s - 1);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    // ==========================================
    // PATIENT STEPS (6 steps)
    // ==========================================
    const renderPatientStep = () => {
        switch (step) {
            // Step 1: Datos Personales
            case 1:
                return (
                    <div className="space-y-6">
                        <InputLabel icon={User} label="Datos Personales" />

                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-2">Fecha de Nacimiento</label>
                            <input
                                type="date"
                                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 outline-none"
                                value={patientData.birth_date}
                                onChange={(e) => updatePatientField('birth_date', e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-2">Género</label>
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { id: 'male', label: '♂ Masculino' },
                                    { id: 'female', label: '♀ Femenino' },
                                    { id: 'other', label: '⚧ Otro' },
                                ].map(opt => (
                                    <OptionButton key={opt.id} selected={patientData.gender === opt.id} onClick={() => updatePatientField('gender', opt.id)}>
                                        <span className="font-medium text-sm">{opt.label}</span>
                                    </OptionButton>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-2">Altura: <strong className="text-gray-900">{patientData.height} cm</strong></label>
                            <input
                                type="range" min="120" max="220"
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                value={patientData.height}
                                onChange={(e) => updatePatientField('height', parseInt(e.target.value))}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-2">Peso</label>
                            <div className="flex justify-center items-center gap-6">
                                <button onClick={() => updatePatientField('weight', Math.max(20, patientData.weight - 0.5))} className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 text-lg font-bold">-</button>
                                <div className="text-center">
                                    <span className="text-3xl font-bold text-emerald-600">{patientData.weight.toFixed(1)}</span>
                                    <span className="text-gray-400 ml-1">kg</span>
                                </div>
                                <button onClick={() => updatePatientField('weight', Math.min(300, patientData.weight + 0.5))} className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 text-lg font-bold">+</button>
                            </div>
                        </div>
                    </div>
                );

            // Step 2: Objetivo Nutricional
            case 2:
                return (
                    <div>
                        <InputLabel icon={Target} label="¿Cuál es tu objetivo nutricional?" />
                        <div className="grid grid-cols-1 gap-3">
                            {[
                                { id: 'weight_loss', label: '🔥 Perder Peso', desc: 'Reducir grasa corporal de forma saludable' },
                                { id: 'muscle_gain', label: '💪 Ganar Masa Muscular', desc: 'Aumentar masa muscular con nutrición adecuada' },
                                { id: 'maintain', label: '⚖️ Mantener Peso', desc: 'Mantener mi peso y mejorar hábitos' },
                                { id: 'health', label: '🌿 Salud General', desc: 'Mejorar mi alimentación y bienestar' },
                                { id: 'pathology', label: '🏥 Control de Patología', desc: 'Diabetes, hipertensión, colesterol, etc.' },
                            ].map(opt => (
                                <OptionButton key={opt.id} selected={patientData.nutrition_goal === opt.id} onClick={() => updatePatientField('nutrition_goal', opt.id)}>
                                    <span className="font-bold block">{opt.label}</span>
                                    <span className="text-sm opacity-75">{opt.desc}</span>
                                </OptionButton>
                            ))}
                        </div>
                    </div>
                );

            // Step 3: Condiciones Médicas
            case 3:
                return (
                    <div className="space-y-4">
                        <InputLabel icon={ShieldAlert} label="¿Tienes condiciones médicas?" />
                        <p className="text-sm text-gray-500 -mt-2 mb-2">Selecciona todas las que apliquen. Es importante para tu plan.</p>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { id: 'diabetes', label: '🩸 Diabetes' },
                                { id: 'hypertension', label: '❤️‍🩹 Hipertensión' },
                                { id: 'hypothyroidism', label: '🦋 Hipotiroidismo' },
                                { id: 'high_cholesterol', label: '🫀 Colesterol Alto' },
                                { id: 'celiac', label: '🌾 Celiaquía' },
                                { id: 'gastritis', label: '🔥 Gastritis / Reflujo' },
                                { id: 'kidney', label: '🫘 Enfermedad Renal' },
                                { id: 'none', label: '✅ Ninguna' },
                            ].map(item => (
                                <CheckboxOption
                                    key={item.id}
                                    checked={patientData.medical_conditions.includes(item.id)}
                                    onChange={() => {
                                        if (item.id === 'none') {
                                            updatePatientField('medical_conditions', ['none']);
                                        } else {
                                            const filtered = patientData.medical_conditions.filter(i => i !== 'none');
                                            updatePatientField('medical_conditions', toggleArrayItem(filtered, item.id));
                                        }
                                    }}
                                    label={item.label}
                                />
                            ))}
                        </div>
                        <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-600 mb-1">Notas médicas adicionales (opcional)</label>
                            <textarea
                                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 outline-none h-20 text-sm"
                                placeholder="Ej: Tomo medicación para tiroides, tengo resistencia a la insulina..."
                                value={patientData.medical_notes}
                                onChange={(e) => updatePatientField('medical_notes', e.target.value)}
                            />
                        </div>
                    </div>
                );

            // Step 4: Alergias e Intolerancias
            case 4:
                return (
                    <div className="space-y-4">
                        <InputLabel icon={AlertCircle} label="Alergias e Intolerancias Alimentarias" />
                        <p className="text-sm text-gray-500 -mt-2 mb-2">Selecciona todas las que tengas para evitarlas en tu plan.</p>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { id: 'gluten', label: '🌾 Gluten' },
                                { id: 'lactose', label: '🥛 Lactosa' },
                                { id: 'nuts', label: '🥜 Frutos Secos' },
                                { id: 'shellfish', label: '🦐 Mariscos' },
                                { id: 'egg', label: '🥚 Huevo' },
                                { id: 'soy', label: '🫘 Soja' },
                                { id: 'fructose', label: '🍎 Fructosa' },
                                { id: 'none', label: '✅ Ninguna' },
                            ].map(item => (
                                <CheckboxOption
                                    key={item.id}
                                    checked={patientData.food_allergies.includes(item.id)}
                                    onChange={() => {
                                        if (item.id === 'none') {
                                            updatePatientField('food_allergies', ['none']);
                                        } else {
                                            const filtered = patientData.food_allergies.filter(i => i !== 'none');
                                            updatePatientField('food_allergies', toggleArrayItem(filtered, item.id));
                                        }
                                    }}
                                    label={item.label}
                                />
                            ))}
                        </div>
                        <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-600 mb-1">Otras alergias (opcional)</label>
                            <input
                                type="text"
                                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 outline-none text-sm"
                                placeholder="Ej: Piña, kiwi, colorantes..."
                                value={patientData.other_allergies}
                                onChange={(e) => updatePatientField('other_allergies', e.target.value)}
                            />
                        </div>
                    </div>
                );

            // Step 5: Estilo de Vida
            case 5:
                return (
                    <div className="space-y-6">
                        <InputLabel icon={Activity} label="Tu Estilo de Vida" />

                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-2">Nivel de Actividad Física</label>
                            <div className="grid grid-cols-1 gap-2">
                                {[
                                    { id: 'sedentary', label: '🪑 Sedentario', desc: 'Sin ejercicio, trabajo de oficina' },
                                    { id: 'light', label: '🚶 Ligero', desc: 'Camino o hago ejercicio 1-2 veces/semana' },
                                    { id: 'moderate', label: '🏃 Moderado', desc: 'Ejercicio 3-4 veces/semana' },
                                    { id: 'active', label: '💪 Activo', desc: 'Ejercicio intenso 5-6 veces/semana' },
                                    { id: 'very_active', label: '🔥 Muy Activo', desc: 'Ejercicio intenso diario o trabajo físico' },
                                ].map(opt => (
                                    <OptionButton key={opt.id} selected={patientData.activity_level === opt.id} onClick={() => updatePatientField('activity_level', opt.id)}>
                                        <span className="font-medium text-sm">{opt.label}</span>
                                        <span className="text-xs text-gray-500 ml-1">{opt.desc}</span>
                                    </OptionButton>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-2">Comidas por día: <strong className="text-gray-900">{patientData.meals_per_day}</strong></label>
                            <div className="flex gap-2">
                                {[2, 3, 4, 5, 6].map(m => (
                                    <button
                                        key={m}
                                        onClick={() => updatePatientField('meals_per_day', m)}
                                        className={`flex-1 px-3 py-2 rounded-lg text-sm border transition-all ${patientData.meals_per_day === m ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
                                    >
                                        {m}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-2">Preferencia Alimentaria</label>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { id: 'none', label: '🍽️ Sin preferencia' },
                                    { id: 'vegetarian', label: '🥬 Vegetariano' },
                                    { id: 'vegan', label: '🌱 Vegano' },
                                    { id: 'keto', label: '🥑 Keto / Low Carb' },
                                    { id: 'mediterranean', label: '🫒 Mediterránea' },
                                    { id: 'other', label: '📝 Otra' },
                                ].map(opt => (
                                    <OptionButton key={opt.id} selected={patientData.diet_preference === opt.id} onClick={() => updatePatientField('diet_preference', opt.id)}>
                                        <span className="font-medium text-sm">{opt.label}</span>
                                    </OptionButton>
                                ))}
                            </div>
                        </div>
                    </div>
                );

            // Step 6: Contacto y Foto
            case 6:
                return (
                    <div className="space-y-6">
                        <InputLabel icon={Phone} label="Contacto" />

                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">WhatsApp (para tu nutricionista)</label>
                            <input
                                type="tel"
                                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 outline-none"
                                placeholder="+54 9 11 1234 5678"
                                value={patientData.whatsapp_number}
                                onChange={(e) => updatePatientField('whatsapp_number', e.target.value)}
                            />
                        </div>

                        <div className="text-center pt-4">
                            <InputLabel icon={Camera} label="Foto de Perfil (Opcional)" />
                            <div className="w-28 h-28 bg-emerald-50 rounded-full mx-auto mb-4 flex items-center justify-center border-4 border-dashed border-emerald-200">
                                <Upload className="text-emerald-400 w-7 h-7" />
                            </div>
                        </div>
                    </div>
                );

            default: return null;
        }
    };

    // ==========================================
    // NUTRITIONIST STEPS (5 steps)
    // ==========================================
    const renderNutritionistStep = () => {
        switch (step) {
            // Step 1: Datos Profesionales
            case 1:
                return (
                    <div className="space-y-5">
                        <InputLabel icon={GraduationCap} label="Datos Profesionales" color="text-teal-600" />

                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Nombre Completo</label>
                            <input
                                type="text"
                                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-teal-500 outline-none"
                                placeholder="Lic. María García"
                                value={nutritionistData.full_name}
                                onChange={(e) => updateNutritionistField('full_name', e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-2">Título Profesional</label>
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { id: 'lic', label: 'Lic.' },
                                    { id: 'dr', label: 'Dr/Dra.' },
                                    { id: 'nutricionista', label: 'Nutricionista' },
                                ].map(opt => (
                                    <OptionButton key={opt.id} selected={nutritionistData.professional_title === opt.id} onClick={() => updateNutritionistField('professional_title', opt.id)} accentColor="teal">
                                        <span className="font-medium text-sm text-center block">{opt.label}</span>
                                    </OptionButton>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Matrícula Profesional</label>
                            <input
                                type="text"
                                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-teal-500 outline-none"
                                placeholder="MN 12345"
                                value={nutritionistData.license_number}
                                onChange={(e) => updateNutritionistField('license_number', e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-2">Especialización</label>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { id: 'sports', label: '🏋️ Deportiva' },
                                    { id: 'clinical', label: '🏥 Clínica' },
                                    { id: 'pediatric', label: '👶 Pediátrica' },
                                    { id: 'aesthetic', label: '✨ Estética' },
                                    { id: 'general', label: '🍎 General' },
                                ].map(opt => (
                                    <OptionButton key={opt.id} selected={nutritionistData.specialization === opt.id} onClick={() => updateNutritionistField('specialization', opt.id)} accentColor="teal">
                                        <span className="font-medium text-sm">{opt.label}</span>
                                    </OptionButton>
                                ))}
                            </div>
                        </div>
                    </div>
                );

            // Step 2: Consulta
            case 2:
                return (
                    <div className="space-y-5">
                        <InputLabel icon={Building2} label="Datos de tu Consulta" color="text-teal-600" />

                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Nombre del Consultorio / Clínica (opcional)</label>
                            <input
                                type="text"
                                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-teal-500 outline-none"
                                placeholder="Consultorio Nutrición Integral"
                                value={nutritionistData.clinic_name}
                                onChange={(e) => updateNutritionistField('clinic_name', e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Dirección (opcional)</label>
                            <input
                                type="text"
                                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-teal-500 outline-none"
                                placeholder="Av. Corrientes 1234, CABA"
                                value={nutritionistData.clinic_address}
                                onChange={(e) => updateNutritionistField('clinic_address', e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-2">Modalidad de Consulta</label>
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { id: 'in_person', label: '🏢 Presencial' },
                                    { id: 'online', label: '💻 Online' },
                                    { id: 'both', label: '🔄 Ambas' },
                                ].map(opt => (
                                    <OptionButton key={opt.id} selected={nutritionistData.consultation_modality === opt.id} onClick={() => updateNutritionistField('consultation_modality', opt.id)} accentColor="teal">
                                        <span className="font-medium text-sm text-center block">{opt.label}</span>
                                    </OptionButton>
                                ))}
                            </div>
                        </div>
                    </div>
                );

            // Step 3: Metodología
            case 3:
                return (
                    <div className="space-y-5">
                        <InputLabel icon={Leaf} label="Tu Enfoque de Trabajo" color="text-teal-600" />

                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-2">Metodologías que usas (selecciona varias)</label>
                            <div className="grid grid-cols-1 gap-3">
                                {[
                                    { id: 'calorie_counting', label: '📊 Conteo Calórico' },
                                    { id: 'intuitive', label: '🧘 Alimentación Intuitiva' },
                                    { id: 'portions', label: '🍽️ Método por Porciones' },
                                    { id: 'exchanges', label: '🔄 Sistema de Intercambios' },
                                    { id: 'flexible', label: '🎯 Dieta Flexible (IIFYM)' },
                                    { id: 'meal_plans', label: '📋 Planes de Comida Estructurados' },
                                ].map(item => (
                                    <CheckboxOption
                                        key={item.id}
                                        checked={nutritionistData.approach.includes(item.id)}
                                        onChange={() => updateNutritionistField('approach', toggleArrayItem(nutritionistData.approach, item.id))}
                                        label={item.label}
                                        accentColor="teal"
                                    />
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-2">
                                Años de Experiencia: <strong className="text-gray-900">{nutritionistData.experience_years}</strong>
                            </label>
                            <input
                                type="range" min="0" max="40"
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-500"
                                value={nutritionistData.experience_years}
                                onChange={(e) => updateNutritionistField('experience_years', parseInt(e.target.value))}
                            />
                            <div className="flex justify-between text-xs text-gray-400 mt-1">
                                <span>0</span>
                                <span>10</span>
                                <span>20</span>
                                <span>30</span>
                                <span>40</span>
                            </div>
                        </div>
                    </div>
                );

            // Step 4: Contacto Profesional
            case 4:
                return (
                    <div className="space-y-5">
                        <InputLabel icon={Phone} label="Contacto Profesional" color="text-teal-600" />

                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Teléfono de Contacto</label>
                            <input
                                type="tel"
                                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-teal-500 outline-none"
                                placeholder="+54 9 11 1234 5678"
                                value={nutritionistData.contact_phone}
                                onChange={(e) => updateNutritionistField('contact_phone', e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Sitio Web (opcional)</label>
                            <input
                                type="url"
                                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-teal-500 outline-none"
                                placeholder="https://www.minutricionista.com"
                                value={nutritionistData.website_url}
                                onChange={(e) => updateNutritionistField('website_url', e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Instagram (opcional)</label>
                            <div className="relative">
                                <span className="absolute left-3 top-3 text-gray-400">@</span>
                                <input
                                    type="text"
                                    className="w-full p-3 pl-8 border-2 border-gray-200 rounded-xl focus:border-teal-500 outline-none"
                                    placeholder="nutricionista_maria"
                                    value={nutritionistData.instagram_handle}
                                    onChange={(e) => updateNutritionistField('instagram_handle', e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                );

            // Step 5: Foto de Perfil
            case 5:
                return (
                    <div className="text-center space-y-6">
                        <InputLabel icon={Camera} label="Foto de Perfil" color="text-teal-600" />
                        <div className="w-32 h-32 bg-teal-50 rounded-full mx-auto mb-4 flex items-center justify-center border-4 border-dashed border-teal-200">
                            <Upload className="text-teal-400 w-8 h-8" />
                        </div>
                        <p className="text-gray-500">Sube tu foto profesional (opcional)</p>
                        <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 text-left">
                            <p className="text-sm text-teal-700">
                                <strong>¡Casi listo!</strong> Al finalizar, podrás empezar a crear planes nutricionales para tus pacientes.
                            </p>
                        </div>
                    </div>
                );

            default: return null;
        }
    };

    const isNutritionist = role === 'nutritionist';
    const totalSteps = isNutritionist ? 5 : 6;
    const accentGradient = isNutritionist
        ? 'from-teal-500 to-cyan-500'
        : 'from-emerald-500 to-green-500';
    const accentBg = isNutritionist ? 'bg-teal-600 hover:bg-teal-700 shadow-teal-600/20' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20';
    const progressBg = isNutritionist ? 'bg-teal-600' : 'bg-emerald-600';

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative">
            {/* Logout Button */}
            <div className="absolute top-4 right-4 sm:top-8 sm:right-8 z-10">
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 text-gray-500 hover:text-red-600 font-medium px-4 py-2 rounded-lg hover:bg-red-50 transition-colors"
                >
                    <LogOut size={20} />
                    <span className="hidden sm:inline">Cerrar Sesión</span>
                </button>
            </div>

            <div className="max-w-xl mx-auto w-full">
                {step === 0 ? (
                    <Step0RoleSelection onSelect={handleRoleSelect} isLoading={isLoading} />
                ) : (
                    <div className="space-y-8 animate-in zoom-in-95 duration-300">
                        {/* Progress Bar */}
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                                className={`h-2 rounded-full transition-all duration-500 ease-out ${progressBg}`}
                                style={{ width: `${((step - 1) / (totalSteps - 1)) * 100}%` }}
                            ></div>
                        </div>
                        <div className="text-right text-xs text-gray-400 font-medium">
                            Paso {step} de {totalSteps}
                        </div>

                        {/* Card */}
                        <div className="bg-white shadow-xl shadow-gray-900/5 rounded-3xl p-8 border border-white min-h-[400px] flex flex-col relative overflow-hidden">
                            <div className="flex-1 overflow-y-auto max-h-[60vh] pr-1">
                                {isNutritionist ? renderNutritionistStep() : renderPatientStep()}
                            </div>
                            {saveError && (
                                <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                                    {saveError}
                                </div>
                            )}

                            {/* Navigation Buttons */}
                            <div className="flex justify-between mt-8 pt-6 border-t border-gray-50">
                                <button
                                    onClick={prevStep}
                                    className="flex items-center gap-2 text-gray-400 hover:text-gray-600 font-medium px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    <ChevronLeft size={20} /> Atrás
                                </button>
                                <button
                                    onClick={isNutritionist ? nextNutritionistStep : nextPatientStep}
                                    disabled={isLoading}
                                    className={`flex items-center gap-2 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg active:scale-95 disabled:opacity-50 ${accentBg}`}
                                >
                                    {isLoading ? 'Guardando...' : step === totalSteps ? '✨ Finalizar' : 'Siguiente'}
                                    {!isLoading && <ChevronRight size={20} />}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
