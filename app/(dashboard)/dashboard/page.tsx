'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/lib/context/AppContext';
import { 
    Users, Apple, Activity, Sparkles, Plus, ArrowRight, UserPlus, Clipboard, 
    Calendar, FileText, CheckCircle, Flame, ShieldAlert, MessageSquare, 
    Building, Link2, Link2Off, Loader2, Sparkle
} from 'lucide-react';

export default function DashboardPage() {
    const { role } = useApp();

    if (role === 'patient') {
        return <PatientDashboard />;
    }

    if (role === 'clinic') {
        return <ClinicDashboard />;
    }

    if (role === 'admin') {
        return <SuperadminDashboard />;
    }

    return <NutritionistDashboard />;
}

// ==========================================================
// 1. DASHBOARD DE SUPERADMINISTRADOR (VINCULACIÓN JERÁRQUICA)
// ==========================================================
function SuperadminDashboard() {
    const { 
        allPatients, 
        allNutritionists, 
        allClinics, 
        clinicPatients, 
        clinicNutritionists, 
        linkPatientToClinic, 
        unlinkPatientFromClinic, 
        linkNutritionistToClinic, 
        unlinkNutritionistFromClinic, 
        refreshData 
    } = useApp();

    const [selectedPatient, setSelectedPatient] = useState('');
    const [selectedClinicForPat, setSelectedClinicForPat] = useState('');
    
    const [selectedNutri, setSelectedNutri] = useState('');
    const [selectedClinicForNut, setSelectedClinicForNut] = useState('');

    const [linkingPat, setLinkingPat] = useState(false);
    const [linkingNut, setLinkingNut] = useState(false);
    const [unlinkingId, setUnlinkingId] = useState<string | null>(null);

    const handleLinkPatient = async () => {
        if (!selectedPatient || !selectedClinicForPat) return;
        setLinkingPat(true);
        const success = await linkPatientToClinic(selectedPatient, selectedClinicForPat);
        setLinkingPat(false);
        if (success) {
            setSelectedPatient('');
            setSelectedClinicForPat('');
        }
    };

    const handleLinkNutri = async () => {
        if (!selectedNutri || !selectedClinicForNut) return;
        setLinkingNut(true);
        const success = await linkNutritionistToClinic(selectedNutri, selectedClinicForNut);
        setLinkingNut(false);
        if (success) {
            setSelectedNutri('');
            setSelectedClinicForNut('');
        }
    };

    const handleUnlinkPatient = async (patId: string, clinId: string) => {
        setUnlinkingId(patId + clinId);
        await unlinkPatientFromClinic(patId, clinId);
        setUnlinkingId(null);
    };

    const handleUnlinkNutri = async (nutriId: string, clinId: string) => {
        setUnlinkingId(nutriId + clinId);
        await unlinkNutritionistFromClinic(nutriId, clinId);
        setUnlinkingId(null);
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Consola de Superadmin</h1>
                    <p className="text-sm text-slate-500 font-semibold mt-1">Conexión de jerarquías y multitenancy en tiempo real (Supabase).</p>
                </div>
                <button 
                    onClick={() => refreshData()} 
                    className="cv-btn-secondary px-4 py-2 text-xs"
                >
                    Sincronizar Supabase
                </button>
            </div>

            {/* Metrics */}
            <div className="grid gap-6 sm:grid-cols-4">
                <MetricCard icon={<Building size={20} />} title="Consultorios" value={String(allClinics?.length || 0)} change="Instituciones registradas" />
                <MetricCard icon={<Users size={20} />} title="Nutricionistas" value={String(allNutritionists?.length || 0)} change="Profesionales del staff" />
                <MetricCard icon={<Clipboard size={20} />} title="Pacientes" value={String(allPatients?.length || 0)} change="Pacientes clínicos activos" />
                <MetricCard icon={<Activity size={20} />} title="Vinculaciones Clínicas" value={String((clinicPatients?.length || 0) + (clinicNutritionists?.length || 0))} change="Relaciones relacionales" success />
            </div>

            {/* Forms section */}
            <div className="grid gap-8 md:grid-cols-2">
                {/* Link Patient to Clinic */}
                <div className="rounded-[2rem] border border-olive-200 bg-white p-6 shadow-cv-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="p-2 rounded-xl bg-olive-50 text-olive-800">
                            <Link2 size={18} />
                        </span>
                        <h3 className="text-base font-black text-slate-900">Vincular Paciente con Consultorio</h3>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Seleccionar Paciente</label>
                            <select
                                value={selectedPatient}
                                onChange={(e) => setSelectedPatient(e.target.value)}
                                className="w-full h-11 px-3 bg-olive-50 border border-olive-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-olive-500"
                            >
                                <option value="">Seleccionar Paciente...</option>
                                {allPatients?.map(p => (
                                    <option key={p.id} value={p.id}>{p.name} ({p.email})</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Asociar a Consultorio</label>
                            <select
                                value={selectedClinicForPat}
                                onChange={(e) => setSelectedClinicForPat(e.target.value)}
                                className="w-full h-11 px-3 bg-olive-50 border border-olive-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-olive-500"
                            >
                                <option value="">Seleccionar Consultorio...</option>
                                {allClinics?.map(c => (
                                    <option key={c.id} value={c.id}>{c.clinic_profiles?.[0]?.clinic_name || c.name}</option>
                                ))}
                            </select>
                        </div>
                        <button
                            onClick={handleLinkPatient}
                            disabled={!selectedPatient || !selectedClinicForPat || linkingPat}
                            className="w-full h-11 bg-olive-800 hover:bg-olive-700 text-white rounded-xl text-xs font-black transition disabled:bg-slate-100 disabled:text-slate-400 flex items-center justify-center gap-2 shadow-cv-sm"
                        >
                            {linkingPat ? <Loader2 className="animate-spin" size={14} /> : 'Crear Enlace Clínico'}
                        </button>
                    </div>
                </div>

                {/* Link Nutritionist to Clinic */}
                <div className="rounded-[2rem] border border-olive-200 bg-white p-6 shadow-cv-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="p-2 rounded-xl bg-olive-50 text-olive-800">
                            <UserPlus size={18} />
                        </span>
                        <h3 className="text-base font-black text-slate-900">Vincular Nutricionista con Consultorio</h3>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Seleccionar Nutricionista</label>
                            <select
                                value={selectedNutri}
                                onChange={(e) => setSelectedNutri(e.target.value)}
                                className="w-full h-11 px-3 bg-olive-50 border border-olive-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-olive-500"
                            >
                                <option value="">Seleccionar Nutricionista...</option>
                                {allNutritionists?.map(n => (
                                    <option key={n.id} value={n.id}>{n.name} ({n.email})</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Asociar a Consultorio</label>
                            <select
                                value={selectedClinicForNut}
                                onChange={(e) => setSelectedClinicForNut(e.target.value)}
                                className="w-full h-11 px-3 bg-olive-50 border border-olive-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-olive-500"
                            >
                                <option value="">Seleccionar Consultorio...</option>
                                {allClinics?.map(c => (
                                    <option key={c.id} value={c.id}>{c.clinic_profiles?.[0]?.clinic_name || c.name}</option>
                                ))}
                            </select>
                        </div>
                        <button
                            onClick={handleLinkNutri}
                            disabled={!selectedNutri || !selectedClinicForNut || linkingNut}
                            className="w-full h-11 bg-olive-800 hover:bg-olive-700 text-white rounded-xl text-xs font-black transition disabled:bg-slate-100 disabled:text-slate-400 flex items-center justify-center gap-2 shadow-cv-sm"
                        >
                            {linkingNut ? <Loader2 className="animate-spin" size={14} /> : 'Contratar en Staff Clínico'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Lists Section */}
            <div className="grid gap-8 md:grid-cols-2">
                {/* Linked Patients List */}
                <div className="rounded-[2rem] border border-olive-200 bg-white p-6 shadow-cv-sm">
                    <h3 className="text-sm font-black text-slate-900 mb-4">Relaciones Pacientes ↔ Consultorios</h3>
                    <div className="overflow-y-auto max-h-80">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-olive-100 text-[10px] font-bold text-slate-400 uppercase">
                                    <th className="pb-2">Paciente</th>
                                    <th className="pb-2">Consultorio</th>
                                    <th className="pb-2 text-right">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-olive-50">
                                {clinicPatients?.length > 0 ? (
                                    clinicPatients.map((cp, idx) => (
                                        <tr key={idx} className="text-xs font-semibold text-slate-700">
                                            <td className="py-2.5 font-black text-slate-900">{cp.patient?.name}</td>
                                            <td className="py-2.5 text-slate-500">{cp.clinic?.name}</td>
                                            <td className="py-2.5 text-right">
                                                <button
                                                    onClick={() => handleUnlinkPatient(cp.patient_id, cp.clinic_id)}
                                                    disabled={unlinkingId === cp.patient_id + cp.clinic_id}
                                                    className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-100 hover:bg-rose-600 hover:text-white transition"
                                                >
                                                    {unlinkingId === cp.patient_id + cp.clinic_id ? 'Desconectando...' : 'Desvincular'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={3} className="py-6 text-center text-slate-400 text-xs font-bold">
                                            No hay pacientes vinculados en el sistema aún.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Linked Nutritionists List */}
                <div className="rounded-[2rem] border border-olive-200 bg-white p-6 shadow-cv-sm">
                    <h3 className="text-sm font-black text-slate-900 mb-4">Relaciones Nutricionistas ↔ Consultorios</h3>
                    <div className="overflow-y-auto max-h-80">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-olive-100 text-[10px] font-bold text-slate-400 uppercase">
                                    <th className="pb-2">Nutricionista</th>
                                    <th className="pb-2">Consultorio</th>
                                    <th className="pb-2 text-right">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-olive-50">
                                {clinicNutritionists?.length > 0 ? (
                                    clinicNutritionists.map((cn, idx) => (
                                        <tr key={idx} className="text-xs font-semibold text-slate-700">
                                            <td className="py-2.5 font-black text-slate-900">{cn.nutritionist?.name}</td>
                                            <td className="py-2.5 text-slate-500">{cn.clinic?.name}</td>
                                            <td className="py-2.5 text-right">
                                                <button
                                                    onClick={() => handleUnlinkNutri(cn.nutritionist_id, cn.clinic_id)}
                                                    disabled={unlinkingId === cn.nutritionist_id + cn.clinic_id}
                                                    className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-100 hover:bg-rose-600 hover:text-white transition"
                                                >
                                                    {unlinkingId === cn.nutritionist_id + cn.clinic_id ? 'Despidiendo...' : 'Desvincular'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={3} className="py-6 text-center text-slate-400 text-xs font-bold">
                                            No hay nutricionistas vinculados en el sistema aún.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ==========================================
// 2. DASHBOARD DEL NUTRICIONISTA (PROFESIONAL)
// ==========================================
function NutritionistDashboard() {
    const { patients } = useApp();
    const activePatientsCount = patients.filter((p) => p.status === 'active').length;
    const avgAdherence = patients.length > 0 
        ? Math.round(patients.reduce((acc, p) => acc + p.adherence, 0) / patients.length)
        : 0;

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Bienvenido, Profesional</h1>
                    <p className="text-sm text-slate-500 font-semibold mt-1">Este es el estado clínico de tus pacientes hoy.</p>
                </div>
                <div className="flex gap-2">
                    <Link
                        href="/builder"
                        className="cv-btn-accent px-5"
                    >
                        <Plus size={18} />
                        Crear Plan Nutricional
                    </Link>
                </div>
            </div>

            {/* Quick Metrics Cards */}
            <div className="grid gap-6 sm:grid-cols-3">
                <MetricCard icon={<Users size={20} />} title="Pacientes Visibles" value={String(patients?.length || 0)} change="Vinculados por clínica" />
                <MetricCard icon={<Activity size={20} />} title="Adherencia Promedio" value={`${avgAdherence}%`} change="Excelente nivel de cumplimiento" success />
                <MetricCard icon={<Flame size={20} />} title="Metabolismo Target" value="2,150 Kcal" change="Promedio diario recomendado" />
            </div>

            {/* Patients and Actions split layout */}
            <div className="grid gap-8 lg:grid-cols-[1.8fr_1.2fr]">
                {/* Pacientes Activos */}
                <div className="rounded-[2rem] border border-olive-200 bg-white p-6 shadow-cv-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-base font-black text-slate-900">Listado de Pacientes</h3>
                        <span className="text-xs font-bold text-slate-400">Pacientes asignados institucionalmente</span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-olive-100 text-xs font-bold text-slate-400 uppercase">
                                    <th className="pb-3">Nombre</th>
                                    <th className="pb-3">Objetivo principal</th>
                                    <th className="pb-3">Fisiología</th>
                                    <th className="pb-3">Adherencia</th>
                                    <th className="pb-3 text-right">Planificar</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-olive-50">
                                {patients.length > 0 ? (
                                    patients.map((patient) => (
                                        <tr key={patient.id} className="text-sm font-semibold text-slate-700 hover:bg-olive-50/50 transition">
                                            <td className="py-4">
                                                <div className="flex items-center gap-3">
                                                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-olive-100 text-olive-800 text-xs font-black">
                                                        {patient.name.charAt(0)}
                                                    </span>
                                                    <div>
                                                        <span className="block font-black text-slate-900 leading-none">{patient.name}</span>
                                                        <span className="text-[10px] text-slate-400">{patient.email}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 text-xs font-bold text-slate-500">{patient.objective}</td>
                                            <td className="py-4 text-xs font-mono font-bold text-slate-400">{patient.weight}Kg / {patient.height}cm</td>
                                            <td className="py-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-mono font-bold text-slate-800">{patient.adherence}%</span>
                                                    <div className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                                        <div className={`h-full rounded-full transition-all duration-500 bg-emerald-500`} style={{ width: `${patient.adherence}%` }} />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 text-right">
                                                <Link
                                                    href={`/builder?patientId=${patient.id}`}
                                                    className="inline-flex h-8 items-center justify-center rounded-lg border border-olive-200 bg-white px-3 text-xs font-bold text-olive-800 hover:bg-olive-50 transition shadow-cv-sm"
                                                >
                                                    Editar Dieta
                                                </Link>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="py-12 text-center">
                                            <div className="flex flex-col items-center justify-center gap-3">
                                                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-olive-50 text-olive-800 border border-olive-100">
                                                    <Users size={20} />
                                                </span>
                                                <div>
                                                    <p className="text-xs font-black text-slate-900">Aún no tenés pacientes asignados</p>
                                                    <p className="text-[11px] text-slate-400 font-semibold mt-1">El superadmin o una clínica vinculada te asociarán pacientes.</p>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Actividades e Invitaciones pendientes */}
                <div className="space-y-6">
                    <div className="rounded-[2rem] border border-olive-200 bg-white p-6 shadow-cv-sm">
                        <h3 className="text-base font-black text-slate-900 mb-4">Prescripción de Alta Gama</h3>
                        <p className="text-xs text-slate-500 leading-relaxed mb-4">
                            Los macronutrientes calculados en el Builder de Planes impactarán en tiempo real sobre el portal del paciente una vez que el Consultorio valide la asignación.
                        </p>
                        <div className="p-4 bg-olive-50/50 rounded-2xl border border-olive-200/40 text-[11px] font-semibold text-olive-800">
                            💡 Tip: Puedes configurar comidas trampa (refeed days) marcando el switch del día específico en el editor.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ==========================================
// 3. DASHBOARD DEL PACIENTE
// ==========================================
function PatientDashboard() {
    const { currentPlan, foods, recipes, habits, setHabits, shoppingList } = useApp();
    const activeDay = currentPlan?.days?.[0] || { name: 'Día de Plan', meals: [] };

    // Calculate macros totals
    let calories = 0;
    let protein = 0;
    let carbs = 0;
    let fat = 0;

    activeDay.meals?.forEach((meal) => {
        meal.items?.forEach((item) => {
            if (item.foodId) {
                const food = foods.find((f) => f.id === item.foodId);
                if (food) {
                    const qtyGrams = parseFloat(item.qty) || 0;
                    protein += (food.protein * qtyGrams) / 100;
                    carbs += (food.carbs * qtyGrams) / 100;
                    fat += (food.fat * qtyGrams) / 100;
                    calories += (food.calories * qtyGrams) / 100;
                }
            } else if (item.recipeId) {
                const recipe = recipes.find((r) => r.id === item.recipeId);
                if (recipe) {
                    protein += recipe.protein;
                    carbs += recipe.carbs;
                    fat += recipe.fat;
                    calories += recipe.calories;
                }
            }
        });
    });

    const displayCalories = Math.round(calories) || 2150;
    const displayProtein = Math.round(protein) || 138;
    const displayCarbs = Math.round(carbs) || 220;
    const displayFat = Math.round(fat) || 65;

    const toggleHabit = (id: string) => {
        setHabits(habits.map(h => h.id === id ? { ...h, completed: !h.completed } : h));
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Portal del Paciente</h1>
                <p className="text-sm text-slate-500 font-semibold mt-1">Tu alimentación diaria de precisión y adherencia clínica.</p>
            </div>

            {/* Target Calórico y Macros */}
            <div className="rounded-[2rem] border border-olive-200 bg-white p-6 shadow-cv-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <span className="text-[10px] font-black text-olive-800 uppercase tracking-wider">Plan Activo Prescrito</span>
                        <h3 className="text-2xl font-black text-slate-900 mt-1">{currentPlan?.name || 'Mi Dieta de Precisión'}</h3>
                        <p className="text-xs text-slate-400 font-bold mt-1">Controlado en vivo · Sincronizado con Supabase</p>
                    </div>
                    <div className="grid grid-cols-4 gap-4 md:gap-8 font-mono text-center">
                        <div className="bg-olive-50 px-4 py-3 rounded-2xl border border-olive-200/50">
                            <span className="block text-[10px] font-bold text-slate-400 font-sans uppercase">Kcal</span>
                            <span className="text-lg font-black text-olive-800">{displayCalories}</span>
                        </div>
                        <div className="bg-olive-50 px-4 py-3 rounded-2xl border border-olive-200/50">
                            <span className="block text-[10px] font-bold text-slate-400 font-sans uppercase">Prot</span>
                            <span className="text-lg font-black text-slate-800">{displayProtein}g</span>
                        </div>
                        <div className="bg-olive-50 px-4 py-3 rounded-2xl border border-olive-200/50">
                            <span className="block text-[10px] font-bold text-slate-400 font-sans uppercase">Carbs</span>
                            <span className="text-lg font-black text-amber-600">{displayCarbs}g</span>
                        </div>
                        <div className="bg-olive-50 px-4 py-3 rounded-2xl border border-olive-200/50">
                            <span className="block text-[10px] font-bold text-slate-400 font-sans uppercase">Grasa</span>
                            <span className="text-lg font-black text-rose-500">{displayFat}g</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Meals and Habits */}
            <div className="grid gap-8 lg:grid-cols-[1.8fr_1.2fr]">
                {/* Comidas Diarias */}
                <div className="rounded-[2rem] border border-olive-200 bg-white p-6 shadow-cv-sm">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-base font-black text-slate-900">Mis Ingestas de Hoy</h3>
                        <Link href="/builder" className="text-xs font-bold text-olive-800 hover:underline flex items-center gap-1">
                            Ver PDF Completo <ArrowRight size={14} />
                        </Link>
                    </div>

                    <div className="space-y-4">
                        {activeDay.meals && activeDay.meals.length > 0 ? (
                            activeDay.meals.map((meal, idx) => {
                                const desc = meal.items.map(item => {
                                    const food = foods.find((f) => f.id === item.foodId);
                                    const recipe = recipes.find((r) => r.id === item.recipeId);
                                    return food ? `${food.name} (${item.qty}g)` : recipe ? recipe.name : '';
                                }).filter(Boolean).join(' + ');

                                let mealKcal = 0;
                                let mealProt = 0;
                                meal.items.forEach((item) => {
                                    if (item.foodId) {
                                        const food = foods.find((f) => f.id === item.foodId);
                                        if (food) {
                                            const qtyGrams = parseFloat(item.qty) || 0;
                                            mealKcal += (food.calories * qtyGrams) / 100;
                                            mealProt += (food.protein * qtyGrams) / 100;
                                        }
                                    } else if (item.recipeId) {
                                        const recipe = recipes.find((r) => r.id === item.recipeId);
                                        if (recipe) {
                                            mealKcal += recipe.calories;
                                            mealProt += recipe.protein;
                                        }
                                    }
                                });

                                return (
                                    <div key={meal.id} className="flex items-start gap-4 p-4 rounded-2xl border border-olive-100 hover:bg-olive-50/30 transition">
                                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-olive-800 text-white text-xs font-black font-mono">
                                            {meal.time}
                                        </span>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start gap-2">
                                                <div>
                                                    <span className="text-[10px] font-black text-olive-800 uppercase tracking-wider">{meal.type}</span>
                                                    <h4 className="text-sm font-black text-slate-900 mt-0.5">{meal.name}</h4>
                                                </div>
                                                <div className="flex gap-2 text-[10px] font-mono font-bold text-slate-500">
                                                    <span className="bg-white px-2.5 py-0.5 rounded-md border border-olive-200/50">{Math.round(mealKcal)} Kcal</span>
                                                    <span className="bg-white px-2.5 py-0.5 rounded-md border border-olive-200/50">{Math.round(mealProt)}g Prot</span>
                                                </div>
                                            </div>
                                            <p className="text-xs text-slate-500 mt-2 font-semibold leading-relaxed">{desc}</p>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="text-center py-12 px-6 border border-dashed border-olive-200 rounded-[2rem] bg-olive-50/20">
                                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-olive-50 text-olive-800 border border-olive-100 mx-auto mb-4">
                                    <Apple size={20} />
                                </span>
                                <h4 className="text-xs font-black text-slate-900 mb-1">Tu Plan Nutricional está siendo diseñado</h4>
                                <p className="text-[11px] text-slate-400 font-semibold mb-5 max-w-sm mx-auto leading-relaxed">
                                    Tu consultorio médico está gestionando las vinculaciones. Tu plan calórico personalizado se cargará en este panel automáticamente.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Habits */}
                <div className="space-y-6">
                    <div className="rounded-[2rem] border border-olive-200 bg-white p-6 shadow-cv-sm">
                        <h3 className="text-base font-black text-slate-900 mb-4">Check-in de Hábitos</h3>
                        <div className="space-y-3">
                            {habits.map((habit) => (
                                <button
                                    key={habit.id}
                                    onClick={() => toggleHabit(habit.id)}
                                    className="w-full flex items-center justify-between p-3.5 bg-olive-50/50 hover:bg-olive-100/50 rounded-2xl border border-olive-200/40 text-left transition"
                                >
                                    <span className={`text-xs font-bold ${habit.completed ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                                        {habit.name}
                                    </span>
                                    <span className={`flex h-6 w-6 items-center justify-center rounded-lg border transition ${
                                        habit.completed ? 'bg-olive-800 text-white border-olive-800' : 'bg-white border-olive-300'
                                    }`}>
                                        {habit.completed && <CheckCircle size={14} />}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ==========================================
// 4. DASHBOARD DE LA CLÍNICA (CONSULTORIO)
// ==========================================
function ClinicDashboard() {
    const { 
        allPatients, 
        allNutritionists, 
        sharedPlans, 
        assignPlanToPatient, 
        refreshData 
    } = useApp();

    const [selectedPatientForPlan, setSelectedPatientForPlan] = useState<Record<string, string>>({});
    const [assigningPlanId, setAssigningPlanId] = useState<string | null>(null);
    const [successPlanId, setSuccessPlanId] = useState<string | null>(null);

    const handleAssignPlan = async (planId: string) => {
        const patientId = selectedPatientForPlan[planId];
        if (!patientId) return;

        setAssigningPlanId(planId);
        const success = await assignPlanToPatient(planId, patientId);
        setAssigningPlanId(null);

        if (success) {
            setSuccessPlanId(planId);
            setTimeout(() => setSuccessPlanId(null), 3000);
            await refreshData();
        }
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Consola de Clínica</h1>
                    <p className="text-sm text-slate-500 font-semibold mt-1">Gestión organizacional, staff y asignaciones institucionales.</p>
                </div>
                <button 
                    onClick={() => refreshData()} 
                    className="cv-btn-secondary px-4 py-2 text-xs"
                >
                    Sincronizar Supabase
                </button>
            </div>

            {/* Metrics */}
            <div className="grid gap-6 sm:grid-cols-3">
                <MetricCard icon={<Users size={20} />} title="Personal Nutricional" value={String(allNutritionists?.length || 0)} change="Médicos registrados en staff" />
                <MetricCard icon={<Clipboard size={20} />} title="Pacientes Afiliados" value={String(allPatients?.length || 0)} change="Pacientes del centro médico" />
                <MetricCard icon={<Activity size={20} />} title="Planes Compartidos" value={String(sharedPlans?.length || 0)} change="Programas en inventario clínico" success />
            </div>

            {/* Clinic Staff & Patient lists */}
            <div className="grid gap-8 md:grid-cols-[1.2fr_1.8fr]">
                {/* Staff list */}
                <div className="rounded-[2rem] border border-olive-200 bg-white p-6 shadow-cv-sm space-y-6">
                    <div>
                        <h3 className="text-base font-black text-slate-900">Staff de Nutricionistas</h3>
                        <p className="text-xs text-slate-400 font-bold mt-1">Profesionales adscriptos al establecimiento</p>
                    </div>
                    <div className="divide-y divide-olive-50">
                        {allNutritionists?.length > 0 ? (
                            allNutritionists.map((nutri) => (
                                <div key={nutri.id} className="py-3 flex items-center gap-3">
                                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-olive-800 text-white text-xs font-black">
                                        {nutri.name.charAt(0)}
                                    </span>
                                    <div>
                                        <p className="text-xs font-black text-slate-950">{nutri.name}</p>
                                        <p className="text-[10px] text-slate-400">{nutri.email}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-xs text-slate-400 py-4 font-bold text-center">No hay nutricionistas en el staff clínico.</p>
                        )}
                    </div>
                </div>

                {/* Patients List */}
                <div className="rounded-[2rem] border border-olive-200 bg-white p-6 shadow-cv-sm space-y-6">
                    <div>
                        <h3 className="text-base font-black text-slate-900">Listado de Pacientes</h3>
                        <p className="text-xs text-slate-400 font-bold mt-1">Pacientes registrados en este consultorio</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-olive-100 text-[10px] font-bold text-slate-400 uppercase">
                                    <th className="pb-2">Paciente</th>
                                    <th className="pb-2">Objetivo</th>
                                    <th className="pb-2 text-right">Contacto</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-olive-50">
                                {allPatients?.length > 0 ? (
                                    allPatients.map((pat) => (
                                        <tr key={pat.id} className="text-xs font-semibold text-slate-700">
                                            <td className="py-3">
                                                <div>
                                                    <span className="block font-black text-slate-950">{pat.name}</span>
                                                    <span className="text-[9px] text-slate-400">{pat.email}</span>
                                                </div>
                                            </td>
                                            <td className="py-3 font-bold text-slate-500">{pat.objective}</td>
                                            <td className="py-3 text-right text-[10px] font-mono text-slate-400">+54 11 5555-0101</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={3} className="py-6 text-center text-slate-400 text-xs font-bold">
                                            No hay pacientes registrados en este consultorio aún.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Triangulated Assignment Section */}
            <div className="rounded-[2rem] border border-olive-200 bg-white p-6 shadow-cv-sm">
                <div className="flex items-center gap-2 mb-6">
                    <span className="p-2 rounded-xl bg-emerald-50 text-emerald-800">
                        <Sparkle size={18} />
                    </span>
                    <div>
                        <h3 className="text-base font-black text-slate-900 leading-none">Planes Compartidos por Nutricionistas</h3>
                        <p className="text-xs text-slate-400 font-bold mt-1">Consola de Triangulación y Asignación de Dieta</p>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-olive-100 text-xs font-bold text-slate-400 uppercase">
                                <th className="pb-3">Nombre del Plan</th>
                                <th className="pb-3">Descripción</th>
                                <th className="pb-3">Creado por</th>
                                <th className="pb-3 text-right">Asignar a Paciente</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-olive-50">
                            {sharedPlans?.length > 0 ? (
                                sharedPlans.map((plan) => (
                                    <tr key={plan.id} className="text-sm font-semibold text-slate-700 hover:bg-olive-50/50 transition">
                                        <td className="py-4 font-black text-slate-950">{plan.name}</td>
                                        <td className="py-4 text-xs text-slate-400 max-w-[200px] truncate">{plan.description || 'Sin descripción'}</td>
                                        <td className="py-4">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-olive-100 text-olive-800 text-[10px] font-black uppercase">
                                                {plan.creator?.name || 'Nutricionista'}
                                            </span>
                                        </td>
                                        <td className="py-4 text-right">
                                            <div className="inline-flex items-center gap-2">
                                                <select
                                                    value={selectedPatientForPlan[plan.id] || ''}
                                                    onChange={(e) => setSelectedPatientForPlan({
                                                        ...selectedPatientForPlan,
                                                        [plan.id]: e.target.value
                                                    })}
                                                    className="h-9 px-3 bg-olive-50 border border-olive-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-olive-500"
                                                >
                                                    <option value="">Seleccionar Paciente...</option>
                                                    {allPatients?.map(p => (
                                                        <option key={p.id} value={p.id}>{p.name}</option>
                                                    ))}
                                                </select>
                                                <button
                                                    onClick={() => handleAssignPlan(plan.id)}
                                                    disabled={!selectedPatientForPlan[plan.id] || assigningPlanId === plan.id}
                                                    className="h-9 px-4 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-black transition disabled:bg-slate-100 disabled:text-slate-400 shadow-cv-sm"
                                                >
                                                    {assigningPlanId === plan.id ? 'Asignando...' : successPlanId === plan.id ? '✓ Asignado' : 'Asignar'}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="py-8 text-center text-slate-400 font-bold text-xs">
                                        No hay planes compartidos con este consultorio hoy.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// ==========================================
// COMPONENTE DE TARJETA MÉTRICA
// ==========================================
function MetricCard({ icon, title, value, change, success = false, warning = false }: { icon: React.ReactNode; title: string; value: string; change: string; success?: boolean; warning?: boolean }) {
    return (
        <div className="rounded-3xl border border-olive-200 bg-white p-6 shadow-cv-sm hover:shadow-cv-md transition duration-200">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                warning ? 'bg-amber-50 text-amber-600' : success ? 'bg-emerald-50 text-emerald-600' : 'bg-olive-50 text-olive-800'
            }`}>
                {icon}
            </div>
            <p className="mt-4 text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</p>
            <h3 className="mt-1.5 text-2xl font-black text-slate-900 font-mono tracking-tight">{value}</h3>
            <span className={`block text-[10px] font-black mt-2 uppercase tracking-wide ${
                warning ? 'text-amber-600' : success ? 'text-emerald-600' : 'text-slate-400'
            }`}>
                {change}
            </span>
        </div>
    );
}
