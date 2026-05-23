'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { Apple, Mail, Lock, User, ArrowRight, Loader2, AlertCircle, Heart, Award, Building } from 'lucide-react';

type UserRole = 'patient' | 'nutritionist' | 'clinic';

export default function RegisterPage() {
    const router = useRouter();
    const [role, setRole] = useState<UserRole>('patient');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Patient specific fields
    const [weight, setWeight] = useState('70');
    const [height, setHeight] = useState('170');
    const [objective, setObjective] = useState('Pérdida de grasa');

    // Nutritionist specific fields
    const [specialty, setSpecialty] = useState('Nutrición Deportiva');
    const [licenseNumber, setLicenseNumber] = useState('');

    // Clinic specific fields
    const [clinicName, setClinicName] = useState('');
    const [address, setAddress] = useState('');
    const [clinicPhone, setClinicPhone] = useState('');

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Prepare metadata based on selected role
            const metadata: Record<string, any> = {
                name,
                role,
            };

            if (role === 'patient') {
                metadata.weight = parseFloat(weight) || 70;
                metadata.height = parseFloat(height) || 170;
                metadata.objective = objective;
            } else if (role === 'nutritionist') {
                metadata.specialty = specialty;
                metadata.license_number = licenseNumber || 'MN-9999';
            } else if (role === 'clinic') {
                metadata.clinic_name = clinicName || name;
                metadata.address = address || 'Dirección no especificada';
                metadata.phone = clinicPhone || '-';
            }

            const { data, error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: metadata,
                },
            });

            if (signUpError) throw signUpError;

            if (data?.user) {
                setSuccess(true);
                setTimeout(() => {
                    router.push('/login');
                }, 3000);
            }
        } catch (err: any) {
            console.error('Error in signup:', err);
            setError(err.message || 'Error al registrar la cuenta.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <main className="min-h-screen bg-olive-50 flex items-center justify-center p-4 font-sans">
                <div className="w-full max-w-md bg-white rounded-[2.5rem] border border-olive-200 p-8 sm:p-10 shadow-cv-lg text-center">
                    <span className="flex h-16 w-16 items-center justify-center rounded-[2rem] bg-emerald-50 text-emerald-600 mx-auto mb-6 shadow-cv-sm">
                        <Heart size={28} className="animate-pulse" />
                    </span>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2">¡Registro Exitoso!</h2>
                    <p className="text-sm font-semibold text-slate-500 mb-6">
                        Tu cuenta ha sido creada. Se ha inicializado tu perfil real en la base de datos de producción.
                    </p>
                    <div className="flex justify-center gap-2 text-xs font-black text-olive-800 uppercase tracking-widest items-center">
                        <Loader2 className="animate-spin" size={16} />
                        Redireccionando al login...
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-olive-50 flex items-center justify-center p-4 py-12 font-sans">
            <div className="w-full max-w-xl bg-white rounded-[2.5rem] border border-olive-200 p-8 sm:p-10 shadow-cv-lg relative overflow-hidden">
                
                {/* Decorative glow */}
                <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full bg-olive-100/50 blur-3xl pointer-events-none" />
                <div className="absolute -bottom-24 -left-24 w-48 h-48 rounded-full bg-olive-100/50 blur-3xl pointer-events-none" />

                <div className="relative">
                    {/* Brand Logo */}
                    <div className="flex flex-col items-center text-center mb-8">
                        <Link href="/" className="flex h-11 w-11 items-center justify-center rounded-xl bg-olive-800 text-white shadow-cv-sm mb-4">
                            <Apple size={22} />
                        </Link>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-none">AI Nutrition</h2>
                        <p className="text-xs text-slate-400 font-bold mt-1.5 uppercase tracking-wider">Crear Nueva Cuenta</p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-xs font-semibold text-rose-700">
                            <AlertCircle className="shrink-0 mt-0.5" size={16} />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Step 1: Select Role */}
                    <div className="mb-6">
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-3 text-center">¿Cómo vas a usar la plataforma?</label>
                        <div className="grid grid-cols-3 gap-3">
                            <button
                                type="button"
                                onClick={() => setRole('patient')}
                                className={`p-3 rounded-2xl border text-left transition duration-200 flex flex-col items-start gap-2 h-36 justify-between ${
                                    role === 'patient'
                                        ? 'border-olive-500 bg-olive-100/20 shadow-cv-sm ring-1 ring-olive-500'
                                        : 'border-olive-200 hover:bg-olive-50/50'
                                }`}
                            >
                                <span className={`p-1.5 rounded-xl border ${role === 'patient' ? 'bg-white text-olive-800 border-olive-300' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                                    <Heart size={16} />
                                </span>
                                <div>
                                    <span className="block text-[11px] font-black text-slate-900 leading-none">Paciente</span>
                                    <span className="text-[9px] text-slate-400 font-medium mt-1 block leading-tight">Seguir mi plan nutricional</span>
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => setRole('nutritionist')}
                                className={`p-3 rounded-2xl border text-left transition duration-200 flex flex-col items-start gap-2 h-36 justify-between ${
                                    role === 'nutritionist'
                                        ? 'border-olive-500 bg-olive-100/20 shadow-cv-sm ring-1 ring-olive-500'
                                        : 'border-olive-200 hover:bg-olive-50/50'
                                }`}
                            >
                                <span className={`p-1.5 rounded-xl border ${role === 'nutritionist' ? 'bg-white text-olive-800 border-olive-300' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                                    <Award size={16} />
                                </span>
                                <div>
                                    <span className="block text-[11px] font-black text-slate-900 leading-none">Nutricionista</span>
                                    <span className="text-[9px] text-slate-400 font-medium mt-1 block leading-tight">Prescribir planes calóricos</span>
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => setRole('clinic')}
                                className={`p-3 rounded-2xl border text-left transition duration-200 flex flex-col items-start gap-2 h-36 justify-between ${
                                    role === 'clinic'
                                        ? 'border-olive-500 bg-olive-100/20 shadow-cv-sm ring-1 ring-olive-500'
                                        : 'border-olive-200 hover:bg-olive-50/50'
                                }`}
                            >
                                <span className={`p-1.5 rounded-xl border ${role === 'clinic' ? 'bg-white text-olive-800 border-olive-300' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                                    <Building size={16} />
                                </span>
                                <div>
                                    <span className="block text-[11px] font-black text-slate-900 leading-none">Consultorio</span>
                                    <span className="text-[9px] text-slate-400 font-medium mt-1 block leading-tight">Clínica, staff y vinculaciones</span>
                                </div>
                            </button>
                        </div>
                    </div>

                    <form onSubmit={handleRegister} className="space-y-4">
                        {/* Generic Fields */}
                        <div>
                            <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Nombre del Responsable</label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400">
                                    <User size={16} />
                                </span>
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Juan Pérez"
                                    className="w-full h-12 pl-11 pr-4 bg-olive-50/50 border border-olive-200 rounded-2xl text-sm font-semibold placeholder-slate-400 text-slate-900 focus:outline-none focus:border-olive-500 focus:bg-white transition duration-200"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Correo Electrónico</label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400">
                                    <Mail size={16} />
                                </span>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="ejemplo@correo.com"
                                    className="w-full h-12 pl-11 pr-4 bg-olive-50/50 border border-olive-200 rounded-2xl text-sm font-semibold placeholder-slate-400 text-slate-900 focus:outline-none focus:border-olive-500 focus:bg-white transition duration-200"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Contraseña</label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400">
                                    <Lock size={16} />
                                </span>
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Mínimo 6 caracteres"
                                    className="w-full h-12 pl-11 pr-4 bg-olive-50/50 border border-olive-200 rounded-2xl text-sm font-semibold placeholder-slate-400 text-slate-900 focus:outline-none focus:border-olive-500 focus:bg-white transition duration-200"
                                />
                            </div>
                        </div>

                        {/* Role Specific Forms */}
                        {role === 'patient' && (
                            <div className="pt-2 grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Peso (Kg)</label>
                                    <input
                                        type="number"
                                        required
                                        value={weight}
                                        onChange={(e) => setWeight(e.target.value)}
                                        className="w-full h-12 px-4 bg-olive-50/50 border border-olive-200 rounded-2xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-olive-500 focus:bg-white transition duration-200"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Altura (cm)</label>
                                    <input
                                        type="number"
                                        required
                                        value={height}
                                        onChange={(e) => setHeight(e.target.value)}
                                        className="w-full h-12 px-4 bg-olive-50/50 border border-olive-200 rounded-2xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-olive-500 focus:bg-white transition duration-200"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Objetivo Nutricional</label>
                                    <select
                                        value={objective}
                                        onChange={(e) => setObjective(e.target.value)}
                                        className="w-full h-12 px-4 bg-olive-50/50 border border-olive-200 rounded-2xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-olive-500 focus:bg-white transition duration-200"
                                    >
                                        <option value="Pérdida de grasa">Pérdida de grasa / Recomposición</option>
                                        <option value="Ganancia muscular">Ganancia de masa muscular / Hipertrofia</option>
                                        <option value="Rendimiento deportivo">Rendimiento y energía deportiva</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        {role === 'nutritionist' && (
                            <div className="pt-2 grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Especialidad</label>
                                    <input
                                        type="text"
                                        required
                                        value={specialty}
                                        onChange={(e) => setSpecialty(e.target.value)}
                                        placeholder="Nutrición Clínica / Deportiva"
                                        className="w-full h-12 px-4 bg-olive-50/50 border border-olive-200 rounded-2xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-olive-500 focus:bg-white transition duration-200"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Matrícula Profesional</label>
                                    <input
                                        type="text"
                                        required
                                        value={licenseNumber}
                                        onChange={(e) => setLicenseNumber(e.target.value)}
                                        placeholder="MN-1234 o MP-5678"
                                        className="w-full h-12 px-4 bg-olive-50/50 border border-olive-200 rounded-2xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-olive-500 focus:bg-white transition duration-200"
                                    />
                                </div>
                            </div>
                        )}

                        {role === 'clinic' && (
                            <div className="pt-2 grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Nombre del Consultorio / Clínica</label>
                                    <input
                                        type="text"
                                        required
                                        value={clinicName}
                                        onChange={(e) => setClinicName(e.target.value)}
                                        placeholder="Centro Médico MedSalud"
                                        className="w-full h-12 px-4 bg-olive-50/50 border border-olive-200 rounded-2xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-olive-500 focus:bg-white transition duration-200"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Dirección Física</label>
                                    <input
                                        type="text"
                                        required
                                        value={address}
                                        onChange={(e) => setAddress(e.target.value)}
                                        placeholder="Av. del Libertador 1420, CABA"
                                        className="w-full h-12 px-4 bg-olive-50/50 border border-olive-200 rounded-2xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-olive-500 focus:bg-white transition duration-200"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Teléfono de Contacto</label>
                                    <input
                                        type="text"
                                        required
                                        value={clinicPhone}
                                        onChange={(e) => setClinicPhone(e.target.value)}
                                        placeholder="+54 11 5555-0100"
                                        className="w-full h-12 px-4 bg-olive-50/50 border border-olive-200 rounded-2xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-olive-500 focus:bg-white transition duration-200"
                                    />
                                </div>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full h-12 mt-4 bg-olive-800 hover:bg-olive-700 text-white rounded-2xl font-black text-sm transition duration-200 flex items-center justify-center gap-2 disabled:bg-olive-800/50 shadow-cv-sm"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="animate-spin" size={16} />
                                    Registrando cuenta real...
                                </>
                            ) : (
                                <>
                                    Crear Cuenta y Guardar en Producción
                                    <ArrowRight size={16} />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-olive-100 text-center text-xs font-bold text-slate-500">
                        ¿Ya tenés una cuenta?{' '}
                        <Link href="/login" className="text-olive-800 hover:underline">
                            Iniciá sesión
                        </Link>
                    </div>
                </div>
            </div>
        </main>
    );
}
