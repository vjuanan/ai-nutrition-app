// Force rebuild: solo MAS final - 2026-02-02-1125
'use client';

import { Topbar } from '@/components/app-shell/Topbar';
import { getProfiles, updateUserRole, resetUserPassword, createUser, deleteUser, getClients } from '@/lib/actions';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    Plus,
    Users,
    Lock,
    Loader2,
    CheckCircle2,
    AlertCircle,
    X,
    ChevronDown,
    Trash2
} from 'lucide-react';

interface Profile {
    id: string;
    email: string;
    full_name: string;
    role: 'nutritionist' | 'patient' | 'admin' | null;
    created_at: string;
    updated_at: string;
}

interface ProfileAttributesForm {
    birth_date: string;
    gender: string;
    height: string;
    weight: string;
    nutrition_goal: string;
    medical_conditions: string;
    medical_notes: string;
    food_allergies: string;
    other_allergies: string;
    activity_level: string;
    meals_per_day: string;
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
    experience_years: string;
    contact_phone: string;
    website_url: string;
    instagram_handle: string;
}

const DEFAULT_PROFILE_ATTRIBUTES: ProfileAttributesForm = {
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

function toArrayCsv(value: string) {
    return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
}

function toNumberOrNull(value: string) {
    if (value.trim() === '') return null;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
}

async function withTimeout<T>(promise: Promise<T>, ms: number, fallbackValue: T): Promise<T> {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<T>((resolve) => {
        timeoutId = setTimeout(() => resolve(fallbackValue), ms);
    });

    try {
        return await Promise.race([promise, timeoutPromise]);
    } finally {
        if (timeoutId) clearTimeout(timeoutId);
    }
}

export default function AdminUsersPage() {
    const router = useRouter();
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [clinics, setClinics] = useState<Array<{ id: string; name: string }>>([]);
    const [patientClinicByUserId, setPatientClinicByUserId] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(true);
    const searchParams = useSearchParams();
    const searchTerm = searchParams.get('q') || '';
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

    // Multi-select State
    const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);

    // Create Modal State
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [newUser, setNewUser] = useState({
        email: '',
        fullName: '',
        password: '',
        role: 'patient' as 'nutritionist' | 'patient' | 'admin',
        clinicId: '' as string,
        profileAttributes: { ...DEFAULT_PROFILE_ATTRIBUTES }
    });

    useEffect(() => {
        loadProfiles();
    }, []);

    async function loadProfiles() {
        setIsLoading(true);
        try {
            const [profilesResult, clinicsResult, patientsResult] = await Promise.allSettled([
                withTimeout(getProfiles(), 15000, []),
                withTimeout(getClients('clinic'), 15000, []),
                withTimeout(getClients('patient'), 15000, []),
            ]);

            const data = profilesResult.status === 'fulfilled' ? (profilesResult.value as Profile[]) : [];
            const clinicRows = clinicsResult.status === 'fulfilled' ? (clinicsResult.value as any[]) : [];
            const patientRows = patientsResult.status === 'fulfilled' ? (patientsResult.value as any[]) : [];

            setProfiles(data);
            const clinicList = clinicRows.map((c: any) => ({ id: c.id, name: c.name }));
            setClinics(clinicList);
            const clinicById = Object.fromEntries(clinicList.map((c) => [c.id, c.name]));

            const clinicByUser: Record<string, string> = {};
            for (const patient of patientRows) {
                if (!patient.user_id) continue;
                if (patient.clinic_id && clinicById[patient.clinic_id]) {
                    clinicByUser[patient.user_id] = clinicById[patient.clinic_id];
                } else {
                    clinicByUser[patient.user_id] = 'Sin asignar';
                }
            }
            setPatientClinicByUserId(clinicByUser);

            if (
                profilesResult.status === 'rejected' ||
                clinicsResult.status === 'rejected' ||
                patientsResult.status === 'rejected'
            ) {
                setMessage({
                    text: 'Se cargó la administración parcialmente. Reintenta en unos segundos.',
                    type: 'error'
                });
            }
        } catch (err) {
            console.error(err);
            setMessage({ text: 'Error al cargar usuarios', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    }

    async function handleRoleUpdate(userId: string, newRole: 'nutritionist' | 'patient' | 'admin') {
        if (!confirm(`¿Estás seguro de cambiar el rol a ${newRole}?`)) return;

        setUpdatingId(userId);
        try {
            await updateUserRole(userId, newRole);
            setMessage({ text: 'Rol actualizado correctamente', type: 'success' });
            loadProfiles(); // Reload to confirm
        } catch (err: any) {
            setMessage({ text: err.message || 'Error al actualizar rol', type: 'error' });
        } finally {
            setUpdatingId(null);
        }
    }

    async function handlePasswordReset(userId: string) {
        if (!confirm('¿Enviar correo de restablecimiento de contraseña a este usuario?')) return;

        setUpdatingId(userId);
        try {
            const res = await resetUserPassword(userId);
            setMessage({ text: res.message || 'Correo enviado', type: 'success' });
        } catch (err: any) {
            setMessage({ text: err.message || 'Error al enviar correo', type: 'error' });
        } finally {
            setUpdatingId(null);
        }
    }


    async function handleDeleteUser(userId: string) {
        if (!confirm('¿ESTÁS SEGURO? Esta acción eliminará permanentemente al usuario y todos sus datos. No se puede deshacer.')) return;

        setUpdatingId(userId);
        try {
            const res = await deleteUser(userId);
            if ((res as any)?.error || (res as any)?.success === false) {
                throw new Error((res as any)?.error || (res as any)?.message || 'Error al eliminar usuario');
            }
            setMessage({ text: 'Usuario eliminado correctamente', type: 'success' });
            loadProfiles();
        } catch (err: any) {
            setMessage({ text: err.message || 'Error al eliminar usuario', type: 'error' });
        } finally {
            setUpdatingId(null);
        }
    }

    // Multi-select Handlers
    const filteredProfiles = profiles.filter(p =>
        (p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || '') ||
        (p.email?.toLowerCase().includes(searchTerm.toLowerCase()) || '')
    );

    const toggleSelectAll = () => {
        if (selectedUsers.size === filteredProfiles.length) {
            setSelectedUsers(new Set());
        } else {
            setSelectedUsers(new Set(filteredProfiles.map(p => p.id)));
        }
    };

    const toggleSelectUser = (userId: string) => {
        const newSelected = new Set(selectedUsers);
        if (newSelected.has(userId)) {
            newSelected.delete(userId);
        } else {
            newSelected.add(userId);
        }
        setSelectedUsers(newSelected);
    };

    async function handleBulkDelete() {
        if (selectedUsers.size === 0) return;
        if (!confirm(`¿ESTÁS SEGURO? Se eliminarán ${selectedUsers.size} usuarios permanentemente. Esta acción no se puede deshacer.`)) return;

        setIsBulkDeleting(true);
        setMessage(null);

        try {
            const deletePromises = Array.from(selectedUsers).map(userId => deleteUser(userId));
            const results = await Promise.allSettled(deletePromises);

            const failures: any[] = [];
            const successes: any[] = [];
            for (const result of results) {
                if (result.status === 'rejected') {
                    failures.push(result.reason);
                    continue;
                }
                const value = result.value as any;
                if (value?.error || value?.success === false) {
                    failures.push(value?.error || value?.message || 'Error al eliminar usuario');
                } else {
                    successes.push(value);
                }
            }

            if (failures.length > 0) {
                setMessage({
                    text: `Se eliminaron ${successes.length} usuarios. Error al eliminar ${failures.length} usuarios.`,
                    type: 'error'
                });
            } else {
                setMessage({ text: `${successes.length} usuarios eliminados correctamente`, type: 'success' });
            }

            setSelectedUsers(new Set());
            loadProfiles();
        } catch (err: any) {
            setMessage({ text: 'Error crítico en eliminación masiva', type: 'error' });
            console.error(err);
        } finally {
            setIsBulkDeleting(false);
        }
    }

    function updateNewUserProfileField<K extends keyof ProfileAttributesForm>(key: K, value: ProfileAttributesForm[K]) {
        setNewUser((prev) => ({
            ...prev,
            profileAttributes: {
                ...prev.profileAttributes,
                [key]: value
            }
        }));
    }


    async function handleCreateUser(e: React.FormEvent) {
        e.preventDefault();
        setIsCreating(true);
        setMessage(null);

        try {
            const res = await createUser({
                email: newUser.email,
                password: newUser.password || undefined,
                fullName: newUser.fullName,
                role: newUser.role,
                clinicId: newUser.role === 'patient' ? (newUser.clinicId || null) : null,
                profileAttributes: {
                    ...newUser.profileAttributes,
                    medical_conditions: toArrayCsv(newUser.profileAttributes.medical_conditions),
                    food_allergies: toArrayCsv(newUser.profileAttributes.food_allergies),
                    approach: toArrayCsv(newUser.profileAttributes.approach),
                    height: toNumberOrNull(newUser.profileAttributes.height),
                    weight: toNumberOrNull(newUser.profileAttributes.weight),
                    meals_per_day: toNumberOrNull(newUser.profileAttributes.meals_per_day),
                    experience_years: toNumberOrNull(newUser.profileAttributes.experience_years),
                    birth_date: newUser.profileAttributes.birth_date || null,
                }
            });

            if (res.success) {
                setMessage({ text: res.message || 'Usuario creado', type: 'success' });
                setIsCreateOpen(false);
                setNewUser({
                    email: '',
                    fullName: '',
                    password: '',
                    role: 'patient',
                    clinicId: '',
                    profileAttributes: { ...DEFAULT_PROFILE_ATTRIBUTES }
                });
                loadProfiles();
            } else {
                setMessage({ text: 'Error desconocido', type: 'error' });
            }
        } catch (err: any) {
            console.error(err);
            setMessage({ text: err.message || 'Error al crear usuario', type: 'error' });
        } finally {
            setIsCreating(false);
        }
    }

    return (

        <>
            <Topbar />
            <div className="max-w-7xl mx-auto space-y-4">
                <div className="flex justify-end gap-2 py-4 mb-4">
                    <>
                        {selectedUsers.size > 0 && (
                            <button
                                onClick={handleBulkDelete}
                                disabled={isBulkDeleting}
                                className="bg-red-500/10 text-red-500 hover:bg-red-500/20 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                            >
                                {isBulkDeleting ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                                Eliminar ({selectedUsers.size})
                            </button>
                        )}
                        <div className="bg-slate-100 px-3 py-1.5 rounded-md flex items-center gap-2">
                            <Users className="text-cv-text-secondary" size={16} />
                            <span className="font-mono font-bold text-cv-text-primary text-sm">{filteredProfiles.length}</span>
                        </div>
                        <button
                            onClick={() => setIsCreateOpen(true)}
                            className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-500 text-white shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:scale-105 active:scale-95 transition-all duration-200"
                            title="Crear Usuario"
                        >
                            <Plus size={20} />
                        </button>
                    </>
                </div>

                {message && (
                    <div className={`p-3 rounded-lg flex items-center gap-2 text-sm ${message.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                        }`}>
                        {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                        {message.text}
                    </div>
                )}

                {/* Table */}
                <div className="bg-cv-bg-secondary rounded-xl overflow-hidden shadow-sm border border-cv-border-subtle">
                    {isLoading ? (
                        <div className="p-12 flex justify-center">
                            <Loader2 className="animate-spin text-cv-accent" size={32} />
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-cv-bg-tertiary border-b border-cv-border-subtle">
                                        <th className="p-4 w-10">
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 rounded border-cv-border-subtle text-cv-accent focus:ring-cv-accent bg-cv-bg-primary"
                                                checked={filteredProfiles.length > 0 && selectedUsers.size === filteredProfiles.length}
                                                onChange={toggleSelectAll}
                                            />
                                        </th>
                                        <th className="p-4 text-xs uppercase tracking-wider text-cv-text-tertiary font-semibold">Usuario</th>
                                        <th className="p-4 text-xs uppercase tracking-wider text-cv-text-tertiary font-semibold">Email</th>
                                        <th className="p-4 text-xs uppercase tracking-wider text-cv-text-tertiary font-semibold">Rol Actual</th>
                                        <th className="p-4 text-xs uppercase tracking-wider text-cv-text-tertiary font-semibold">Clínica</th>
                                        <th className="p-4 text-xs uppercase tracking-wider text-cv-text-tertiary font-semibold text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-cv-border-subtle">
                                    {filteredProfiles.map((user) => (
                                        <tr
                                            key={user.id}
                                            onClick={() => router.push(`/administration/users/${user.id}`)}
                                            className={`hover:bg-cv-bg-tertiary/50 transition-colors cursor-pointer ${selectedUsers.has(user.id) ? 'bg-cv-accent/5' : ''}`}
                                        >
                                            <td className="p-4">
                                                <input
                                                    type="checkbox"
                                                    className="w-4 h-4 rounded border-cv-border-subtle text-cv-accent focus:ring-cv-accent bg-cv-bg-primary"
                                                    checked={selectedUsers.has(user.id)}
                                                    onClick={(e) => e.stopPropagation()}
                                                    onChange={() => toggleSelectUser(user.id)}
                                                />
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-cv-accent-muted flex items-center justify-center text-cv-accent font-bold">
                                                        {user.full_name?.[0]?.toUpperCase() || '?'}
                                                    </div>
                                                    <span className="font-medium text-cv-text-primary">
                                                        {user.full_name || 'Sin nombre'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-4 text-cv-text-secondary font-mono text-sm">
                                                {user.email || 'N/A'}
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <select
                                                        value={user.role || ''}
                                                        onClick={(e) => e.stopPropagation()}
                                                        onChange={(e) => handleRoleUpdate(user.id, e.target.value as any)}
                                                        className={`bg-transparent text-sm font-medium border-none focus:ring-0 cursor-pointer py-1 px-2 rounded ${user.role === 'admin' ? 'text-purple-400 bg-purple-500/10' :
                                                            user.role === 'nutritionist' ? 'text-blue-400 bg-blue-500/10' :
                                                                user.role === 'patient' ? 'text-green-400 bg-green-500/10' :
                                                                    'text-yellow-400 bg-yellow-500/10'
                                                            }`}
                                                        disabled={updatingId === user.id}
                                                    >
                                                        <option value="" className="bg-cv-bg-primary">Sin Rol</option>
                                                        <option value="patient" className="bg-cv-bg-primary">Paciente</option>
                                                        <option value="nutritionist" className="bg-cv-bg-primary">Clínica</option>
                                                        <option value="admin" className="bg-cv-bg-primary">Administrador</option>
                                                    </select>
                                                </div>
                                            </td>
                                            <td className="p-4 text-cv-text-secondary text-sm">
                                                {user.role === 'patient' ? (patientClinicByUserId[user.id] || 'Sin asignar') : '-'}
                                            </td>
                                            <td className="p-4 text-right">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handlePasswordReset(user.id);
                                                    }}
                                                    disabled={updatingId === user.id}
                                                    className="p-2 hover:bg-cv-bg-elevated rounded-lg text-cv-text-tertiary hover:text-cv-text-primary transition-colors"
                                                    title="Resetear Contraseña"
                                                >
                                                    {updatingId === user.id ? (
                                                        <Loader2 size={18} className="animate-spin" />
                                                    ) : (
                                                        <Lock size={18} />
                                                    )}
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteUser(user.id);
                                                    }}
                                                    disabled={updatingId === user.id}
                                                    className="p-2 hover:bg-red-500/10 rounded-lg text-cv-text-tertiary hover:text-red-500 transition-colors"
                                                    title="Eliminar Usuario"
                                                >
                                                    {updatingId === user.id ? (
                                                        <Loader2 size={18} className="animate-spin" />
                                                    ) : (
                                                        <Trash2 size={18} />
                                                    )}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {filteredProfiles.length === 0 && (
                                <div className="p-8 text-center text-cv-text-tertiary">
                                    No se encontraron usuarios.
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Create User Modal */}
                {isCreateOpen && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-cv-bg-secondary rounded-xl shadow-xl w-full max-w-3xl border border-cv-border-subtle animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                            <div className="p-6 border-b border-cv-border-subtle flex justify-between items-center">
                                <h2 className="text-xl font-bold text-cv-text-primary">Crear Nuevo Usuario</h2>
                                <button onClick={() => setIsCreateOpen(false)} className="text-cv-text-tertiary hover:text-cv-text-primary">
                                    <X size={20} />
                                </button>
                            </div>
                            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-cv-text-secondary">Nombre Completo</label>
                                        <input
                                            type="text"
                                            required
                                            className="w-full p-2 rounded-lg bg-cv-bg-tertiary border border-cv-border-subtle text-cv-text-primary focus:outline-none focus:border-cv-accent"
                                            value={newUser.fullName}
                                            onChange={e => setNewUser({ ...newUser, fullName: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-cv-text-secondary">Email</label>
                                        <input
                                            type="email"
                                            required
                                            className="w-full p-2 rounded-lg bg-cv-bg-tertiary border border-cv-border-subtle text-cv-text-primary focus:outline-none focus:border-cv-accent"
                                            value={newUser.email}
                                            onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-cv-text-secondary">Contraseña (Opcional)</label>
                                        <input
                                            type="password"
                                            placeholder="Por defecto: tempPass123!"
                                            className="w-full p-2 rounded-lg bg-cv-bg-tertiary border border-cv-border-subtle text-cv-text-primary focus:outline-none focus:border-cv-accent"
                                            value={newUser.password}
                                            onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-cv-text-secondary">Rol Inicial</label>
                                        <div className="relative">
                                            <select
                                                className="w-full p-2 rounded-lg bg-cv-bg-tertiary border border-cv-border-subtle text-cv-text-primary focus:outline-none focus:border-cv-accent appearance-none"
                                                value={newUser.role}
                                                onChange={e => setNewUser({ ...newUser, role: e.target.value as any })}
                                            >
                                                <option value="patient">Paciente</option>
                                                <option value="nutritionist">Clínica</option>
                                                <option value="admin">Administrador</option>
                                            </select>
                                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-cv-text-tertiary pointer-events-none" size={16} />
                                        </div>
                                    </div>
                                </div>

                                {newUser.role === 'patient' && (
                                    <div className="rounded-lg border border-cv-border-subtle p-4 space-y-3">
                                        <h3 className="text-sm font-semibold text-cv-text-primary">Atributos de Paciente (signup)</h3>
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-cv-text-secondary">Clínica asignada</label>
                                            <div className="relative">
                                                <select
                                                    className="w-full p-2 rounded-lg bg-cv-bg-tertiary border border-cv-border-subtle text-cv-text-primary focus:outline-none focus:border-cv-accent appearance-none"
                                                    value={newUser.clinicId}
                                                    onChange={e => setNewUser({ ...newUser, clinicId: e.target.value })}
                                                >
                                                    <option value="">Sin asignar</option>
                                                    {clinics.map((clinic) => (
                                                        <option key={clinic.id} value={clinic.id}>{clinic.name}</option>
                                                    ))}
                                                </select>
                                                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-cv-text-tertiary pointer-events-none" size={16} />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <input type="date" className="w-full p-2 rounded-lg bg-cv-bg-tertiary border border-cv-border-subtle text-sm" value={newUser.profileAttributes.birth_date} onChange={e => updateNewUserProfileField('birth_date', e.target.value)} />
                                            <input placeholder="Género" className="w-full p-2 rounded-lg bg-cv-bg-tertiary border border-cv-border-subtle text-sm" value={newUser.profileAttributes.gender} onChange={e => updateNewUserProfileField('gender', e.target.value)} />
                                            <input placeholder="Altura (cm)" type="number" className="w-full p-2 rounded-lg bg-cv-bg-tertiary border border-cv-border-subtle text-sm" value={newUser.profileAttributes.height} onChange={e => updateNewUserProfileField('height', e.target.value)} />
                                            <input placeholder="Peso (kg)" type="number" step="0.1" className="w-full p-2 rounded-lg bg-cv-bg-tertiary border border-cv-border-subtle text-sm" value={newUser.profileAttributes.weight} onChange={e => updateNewUserProfileField('weight', e.target.value)} />
                                            <input placeholder="Objetivo nutricional" className="w-full p-2 rounded-lg bg-cv-bg-tertiary border border-cv-border-subtle text-sm" value={newUser.profileAttributes.nutrition_goal} onChange={e => updateNewUserProfileField('nutrition_goal', e.target.value)} />
                                            <input placeholder="Nivel de actividad" className="w-full p-2 rounded-lg bg-cv-bg-tertiary border border-cv-border-subtle text-sm" value={newUser.profileAttributes.activity_level} onChange={e => updateNewUserProfileField('activity_level', e.target.value)} />
                                            <input placeholder="Comidas por día" type="number" className="w-full p-2 rounded-lg bg-cv-bg-tertiary border border-cv-border-subtle text-sm" value={newUser.profileAttributes.meals_per_day} onChange={e => updateNewUserProfileField('meals_per_day', e.target.value)} />
                                            <input placeholder="Preferencia alimentaria" className="w-full p-2 rounded-lg bg-cv-bg-tertiary border border-cv-border-subtle text-sm" value={newUser.profileAttributes.diet_preference} onChange={e => updateNewUserProfileField('diet_preference', e.target.value)} />
                                            <input placeholder="WhatsApp" className="w-full p-2 rounded-lg bg-cv-bg-tertiary border border-cv-border-subtle text-sm" value={newUser.profileAttributes.whatsapp_number} onChange={e => updateNewUserProfileField('whatsapp_number', e.target.value)} />
                                            <input placeholder="Avatar URL" className="w-full p-2 rounded-lg bg-cv-bg-tertiary border border-cv-border-subtle text-sm" value={newUser.profileAttributes.avatar_url} onChange={e => updateNewUserProfileField('avatar_url', e.target.value)} />
                                            <input placeholder="Condiciones médicas (CSV)" className="w-full p-2 rounded-lg bg-cv-bg-tertiary border border-cv-border-subtle text-sm" value={newUser.profileAttributes.medical_conditions} onChange={e => updateNewUserProfileField('medical_conditions', e.target.value)} />
                                            <input placeholder="Alergias alimentarias (CSV)" className="w-full p-2 rounded-lg bg-cv-bg-tertiary border border-cv-border-subtle text-sm" value={newUser.profileAttributes.food_allergies} onChange={e => updateNewUserProfileField('food_allergies', e.target.value)} />
                                            <input placeholder="Otras alergias" className="md:col-span-2 w-full p-2 rounded-lg bg-cv-bg-tertiary border border-cv-border-subtle text-sm" value={newUser.profileAttributes.other_allergies} onChange={e => updateNewUserProfileField('other_allergies', e.target.value)} />
                                            <textarea placeholder="Notas médicas" className="md:col-span-2 w-full p-2 rounded-lg bg-cv-bg-tertiary border border-cv-border-subtle text-sm min-h-[80px]" value={newUser.profileAttributes.medical_notes} onChange={e => updateNewUserProfileField('medical_notes', e.target.value)} />
                                        </div>
                                    </div>
                                )}

                                {newUser.role === 'nutritionist' && (
                                    <div className="rounded-lg border border-cv-border-subtle p-4 space-y-3">
                                        <h3 className="text-sm font-semibold text-cv-text-primary">Atributos de Nutricionista/Clínica (signup)</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <input placeholder="Nombre de clínica" className="w-full p-2 rounded-lg bg-cv-bg-tertiary border border-cv-border-subtle text-sm" value={newUser.profileAttributes.clinic_name} onChange={e => updateNewUserProfileField('clinic_name', e.target.value)} />
                                            <input placeholder="Título profesional" className="w-full p-2 rounded-lg bg-cv-bg-tertiary border border-cv-border-subtle text-sm" value={newUser.profileAttributes.professional_title} onChange={e => updateNewUserProfileField('professional_title', e.target.value)} />
                                            <input placeholder="Matrícula" className="w-full p-2 rounded-lg bg-cv-bg-tertiary border border-cv-border-subtle text-sm" value={newUser.profileAttributes.license_number} onChange={e => updateNewUserProfileField('license_number', e.target.value)} />
                                            <input placeholder="Especialización" className="w-full p-2 rounded-lg bg-cv-bg-tertiary border border-cv-border-subtle text-sm" value={newUser.profileAttributes.specialization} onChange={e => updateNewUserProfileField('specialization', e.target.value)} />
                                            <input placeholder="Dirección de clínica" className="w-full p-2 rounded-lg bg-cv-bg-tertiary border border-cv-border-subtle text-sm" value={newUser.profileAttributes.clinic_address} onChange={e => updateNewUserProfileField('clinic_address', e.target.value)} />
                                            <input placeholder="Modalidad de consulta" className="w-full p-2 rounded-lg bg-cv-bg-tertiary border border-cv-border-subtle text-sm" value={newUser.profileAttributes.consultation_modality} onChange={e => updateNewUserProfileField('consultation_modality', e.target.value)} />
                                            <input placeholder="Enfoque (CSV)" className="w-full p-2 rounded-lg bg-cv-bg-tertiary border border-cv-border-subtle text-sm" value={newUser.profileAttributes.approach} onChange={e => updateNewUserProfileField('approach', e.target.value)} />
                                            <input placeholder="Años de experiencia" type="number" className="w-full p-2 rounded-lg bg-cv-bg-tertiary border border-cv-border-subtle text-sm" value={newUser.profileAttributes.experience_years} onChange={e => updateNewUserProfileField('experience_years', e.target.value)} />
                                            <input placeholder="Teléfono contacto" className="w-full p-2 rounded-lg bg-cv-bg-tertiary border border-cv-border-subtle text-sm" value={newUser.profileAttributes.contact_phone} onChange={e => updateNewUserProfileField('contact_phone', e.target.value)} />
                                            <input placeholder="Website URL" className="w-full p-2 rounded-lg bg-cv-bg-tertiary border border-cv-border-subtle text-sm" value={newUser.profileAttributes.website_url} onChange={e => updateNewUserProfileField('website_url', e.target.value)} />
                                            <input placeholder="Instagram" className="w-full p-2 rounded-lg bg-cv-bg-tertiary border border-cv-border-subtle text-sm" value={newUser.profileAttributes.instagram_handle} onChange={e => updateNewUserProfileField('instagram_handle', e.target.value)} />
                                            <input placeholder="Avatar/Logo URL" className="w-full p-2 rounded-lg bg-cv-bg-tertiary border border-cv-border-subtle text-sm" value={newUser.profileAttributes.avatar_url} onChange={e => updateNewUserProfileField('avatar_url', e.target.value)} />
                                        </div>
                                    </div>
                                )}

                                <div className="pt-4 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsCreateOpen(false)}
                                        className="cv-btn-secondary flex-1 justify-center"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isCreating}
                                        className="cv-btn-primary flex-1 justify-center"
                                    >
                                        {isCreating ? <Loader2 className="animate-spin" /> : 'Crear Usuario'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
