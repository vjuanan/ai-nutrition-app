'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export type UserRole = 'nutritionist' | 'patient' | 'clinic' | 'admin';

export interface Food {
    id: string;
    name: string;
    category: string;
    protein: number;
    carbs: number;
    fat: number;
    calories: number;
    servingSize: string;
}

export interface Recipe {
    id: string;
    name: string;
    description: string;
    instructions: string;
    ingredients: string[];
    protein: number;
    carbs: number;
    fat: number;
    calories: number;
}

export interface Patient {
    id: string;
    name: string;
    email: string;
    phone: string;
    objective: string;
    adherence: number;
    planName: string;
    status: 'active' | 'pending_intake' | 'paused';
    intakeCompleted: boolean;
    weight: number;
    height: number;
    activityLevel?: string;
    dietType?: string;
    allergies?: string;
    bodyFat?: number;
}

export interface MealItem {
    id: string;
    foodId?: string;
    recipeId?: string;
    qty: string;
}

export interface Meal {
    id: string;
    type: 'desayuno' | 'almuerzo' | 'merienda' | 'cena' | 'colacion';
    name: string;
    time: string;
    items: MealItem[];
}

export interface PlanDay {
    id: string;
    dayNumber: number;
    name: string;
    isRefeed: boolean;
    meals: Meal[];
    notes: string;
}

export interface NutritionPlan {
    id: string;
    name: string;
    description: string;
    weeksCount: number;
    days: PlanDay[];
    isTemplate: boolean;
    clinicId?: string;
    assignedPatientId?: string;
}

interface AppContextType {
    role: UserRole;
    setRole: (role: UserRole) => void;
    user: any | null;
    loading: boolean;
    patients: Patient[];
    setPatients: React.Dispatch<React.SetStateAction<Patient[]>>;
    foods: Food[];
    recipes: Recipe[];
    currentPlan: NutritionPlan;
    setCurrentPlan: (plan: NutritionPlan) => void;
    activePatientId: string;
    setActivePatientId: (id: string) => void;
    patientPlans: Record<string, NutritionPlan>;
    savePlanForPatient: (patientId: string, plan: NutritionPlan) => void;
    shoppingList: string[];
    habits: { id: string; name: string; completed: boolean }[];
    setHabits: React.Dispatch<React.SetStateAction<{ id: string; name: string; completed: boolean }[]>>;
    
    // DB & Real-Time Hierarchy Helpers
    refreshData: () => Promise<void>;
    allNutritionists: any[];
    allPatients: any[];
    allClinics: any[];
    assignments: any[];
    clinicPatients: any[];
    clinicNutritionists: any[];
    sharedPlans: any[];
    
    createAssignment: (patientId: string, nutritionistId: string) => Promise<boolean>;
    deleteAssignment: (assignmentId: string) => Promise<boolean>;
    linkPatientToClinic: (patientId: string, clinicId: string) => Promise<boolean>;
    unlinkPatientFromClinic: (patientId: string, clinicId: string) => Promise<boolean>;
    linkNutritionistToClinic: (nutritionistId: string, clinicId: string) => Promise<boolean>;
    unlinkNutritionistFromClinic: (nutritionistId: string, clinicId: string) => Promise<boolean>;
    assignPlanToClinic: (planId: string, clinicId: string) => Promise<boolean>;
    assignPlanToPatient: (planId: string, patientId: string) => Promise<boolean>;
    signOut: () => Promise<void>;
}

const initialFoods: Food[] = [
    { id: 'f1', name: 'Pechuga de pollo grillada', category: 'Proteínas', protein: 31, carbs: 0, fat: 3.6, calories: 165, servingSize: '100g' },
    { id: 'f2', name: 'Arroz integral hervido', category: 'Carbohidratos', protein: 2.6, carbs: 23, fat: 0.9, calories: 111, servingSize: '100g' },
    { id: 'f3', name: 'Palta / Aguacate', category: 'Grasas', protein: 2, carbs: 9, fat: 15, calories: 160, servingSize: '100g' },
    { id: 'f4', name: 'Avena arrollada instantánea', category: 'Carbohidratos', protein: 13.5, carbs: 68, fat: 7, calories: 379, servingSize: '100g' },
    { id: 'f5', name: 'Huevos enteros', category: 'Proteínas', protein: 13, carbs: 1.1, fat: 11, calories: 155, servingSize: '100g' },
    { id: 'f6', name: 'Banana / Plátano', category: 'Frutas', protein: 1.2, carbs: 23, fat: 0.3, calories: 89, servingSize: '100g' },
    { id: 'f7', name: 'Almendras naturales', category: 'Grasas', protein: 21, carbs: 22, fat: 49, calories: 579, servingSize: '100g' }
];

const initialRecipes: Recipe[] = [
    {
        id: 'r1',
        name: 'Tazón de Avena Energético',
        description: 'Desayuno alto en carbohidratos complejos y grasas saludables, ideal para deportistas.',
        instructions: 'Mezclar la avena con leche o agua y llevar al microondas 1.5 min. Añadir rodajas de banana y almendras.',
        ingredients: ['50g de Avena arrollada', '1 banana madura', '15g de Almendras', '150ml de Leche descremada'],
        protein: 18,
        carbs: 58,
        fat: 12,
        calories: 410
    },
    {
        id: 'r2',
        name: 'Pollo al Wok con Arroz Integral',
        description: 'Almuerzo clásico de recomposición corporal con proteínas magras y saciante.',
        instructions: 'Saltear el pollo cortado en cubos en una sartén antiadherente. Añadir vegetales y servir sobre el arroz integral.',
        ingredients: ['150g de Pechuga de pollo', '120g de Arroz integral', 'Vegetales surtidos al wok'],
        protein: 48,
        carbs: 32,
        fat: 6,
        calories: 374
    }
];

const defaultPlan: NutritionPlan = {
    id: 'plan_default',
    name: 'Plan de Recomposición Corporal',
    description: 'Enfoque de recomposición corporal, alternando días de refeed e hidratos altos con días de hidratos moderados.',
    weeksCount: 4,
    isTemplate: false,
    days: [
        {
            id: 'day_1',
            dayNumber: 1,
            name: 'Lunes - Día de Fuerza',
            isRefeed: false,
            notes: 'Consumir el almuerzo 1 hora antes de entrenar.',
            meals: [
                {
                    id: 'm1',
                    type: 'desayuno',
                    name: 'Desayuno Pre-Entreno',
                    time: '08:30 HS',
                    items: [
                        { id: 'mi1', recipeId: 'r1', qty: '1 porción' }
                    ]
                },
                {
                    id: 'm2',
                    type: 'almuerzo',
                    name: 'Almuerzo Saciante',
                    time: '13:00 HS',
                    items: [
                        { id: 'mi2', recipeId: 'r2', qty: '1 porción' },
                        { id: 'mi3', foodId: 'f3', qty: '40g' }
                    ]
                },
                {
                    id: 'm3',
                    type: 'cena',
                    name: 'Cena de Recuperación',
                    time: '21:00 HS',
                    items: [
                        { id: 'mi4', foodId: 'f1', qty: '180g' },
                        { id: 'mi5', foodId: 'f2', qty: '100g' }
                    ]
                }
            ]
        }
    ]
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const [user, setUser] = useState<any | null>(null);
    const [role, setRole] = useState<UserRole>('nutritionist');
    const [loading, setLoading] = useState(true);
    
    // Core states
    const [patients, setPatients] = useState<Patient[]>([]);
    const [allPatients, setAllPatients] = useState<any[]>([]);
    const [allNutritionists, setAllNutritionists] = useState<any[]>([]);
    const [allClinics, setAllClinics] = useState<any[]>([]);
    const [assignments, setAssignments] = useState<any[]>([]);
    const [clinicPatients, setClinicPatients] = useState<any[]>([]);
    const [clinicNutritionists, setClinicNutritionists] = useState<any[]>([]);
    const [sharedPlans, setSharedPlans] = useState<any[]>([]);
    const [activePatientId, setActivePatientId] = useState<string>('');
    const [patientPlans, setPatientPlans] = useState<Record<string, NutritionPlan>>({});
    
    const [habits, setHabits] = useState([
        { id: 'h1', name: 'Beber 3L de agua', completed: true },
        { id: 'h2', name: 'Completar ingestas del plan', completed: false },
        { id: 'h3', name: 'Consumir suplemento proteico', completed: false }
    ]);

    // Check auth and session
    useEffect(() => {
        const getSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                setUser(session.user);
                await loadUserProfile(session.user);
            } else {
                setLoading(false);
            }
        };

        getSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (session?.user) {
                setUser(session.user);
                await loadUserProfile(session.user);
            } else {
                setUser(null);
                setRole('nutritionist'); // default fallback
                setLoading(false);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const loadUserProfile = async (authUser: any) => {
        try {
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', authUser.id)
                .single();

            if (error) throw error;

            if (profile) {
                // Check if user is superadmin (admin)
                const uiRole = (profile.role === 'admin' || profile.email === 'vjuanan@gmail.com') ? 'admin' : (profile.role as UserRole);
                setRole(uiRole);
                localStorage.setItem('ai_nutri_role', uiRole);
            }
        } catch (e) {
            console.error('Error loading user profile:', e);
            // Fallback for vjuanan@gmail.com if no profile row yet
            if (authUser.email === 'vjuanan@gmail.com') {
                setRole('admin');
            }
        } finally {
            setLoading(false);
        }
    };

    // Reload data reactively
    useEffect(() => {
        if (!user) return;
        fetchData();
    }, [user, role]);

    const fetchData = async () => {
        if (!user) return;

        try {
            if (role === 'admin') {
                // Fetch ALL profiles, clinics, patients, and relationships for Superadmin Console
                const { data: profilesList } = await supabase
                    .from('profiles')
                    .select('*, patient_profiles(*), nutritionist_profiles(*), clinic_profiles(*)');

                const { data: cp } = await supabase
                    .from('clinic_patients')
                    .select('*, clinic:clinic_id(name), patient:patient_id(name, email)');

                const { data: cn } = await supabase
                    .from('clinic_nutritionists')
                    .select('*, clinic:clinic_id(name), nutritionist:nutritionist_id(name, email)');

                const { data: assigns } = await supabase
                    .from('assignments')
                    .select('*, patient:patient_id(name, email), nutritionist:nutritionist_id(name, email)');

                if (profilesList) {
                    setAllPatients(profilesList.filter(p => p.role === 'patient'));
                    setAllNutritionists(profilesList.filter(p => p.role === 'nutritionist'));
                    setAllClinics(profilesList.filter(p => p.role === 'clinic'));
                    
                    const mappedPatients: Patient[] = profilesList.filter(p => p.role === 'patient').map(p => ({
                        id: p.id,
                        name: p.name,
                        email: p.email,
                        phone: '+54 11 5555-0101',
                        objective: p.patient_profiles?.[0]?.objective || 'Pérdida de grasa',
                        adherence: p.patient_profiles?.[0]?.adherence || 0,
                        planName: 'Plan Asignado',
                        status: 'active',
                        intakeCompleted: true,
                        weight: p.patient_profiles?.[0]?.weight || 70,
                        height: p.patient_profiles?.[0]?.height || 170
                    }));
                    setPatients(mappedPatients);
                }

                if (cp) setClinicPatients(cp);
                if (cn) setClinicNutritionists(cn);
                if (assigns) setAssignments(assigns);

            } else if (role === 'clinic') {
                // Fetch linked patients, nutritionists, and shared plans for this Clinic
                const { data: patientLinks } = await supabase
                    .from('clinic_patients')
                    .select('*, patient:patient_id(*, patient_profiles(*))')
                    .eq('clinic_id', user.id);

                const { data: nutritionistLinks } = await supabase
                    .from('clinic_nutritionists')
                    .select('*, nutritionist:nutritionist_id(*, nutritionist_profiles(*))')
                    .eq('clinic_id', user.id);

                const { data: plans } = await supabase
                    .from('nutrition_plans')
                    .select('*, creator:created_by(name)')
                    .eq('clinic_id', user.id);

                if (patientLinks) {
                    const mappedPatients: Patient[] = patientLinks.map((l: any) => {
                        const pat = l.patient;
                        const clinical = pat?.patient_profiles?.[0];
                        return {
                            id: pat.id,
                            name: pat.name,
                            email: pat.email,
                            phone: '+54 11 5555-0101',
                            objective: clinical?.objective || 'Pérdida de grasa',
                            adherence: clinical?.adherence || 80,
                            planName: 'Déficit Clínico',
                            status: 'active',
                            intakeCompleted: true,
                            weight: clinical?.weight || 70,
                            height: clinical?.height || 170
                        };
                    });
                    setPatients(mappedPatients);
                    setAllPatients(mappedPatients);
                }

                if (nutritionistLinks) {
                    setAllNutritionists(nutritionistLinks.map((l: any) => l.nutritionist));
                }

                if (plans) {
                    setSharedPlans(plans);
                }

            } else if (role === 'nutritionist') {
                // Fetch linked clinics first to see linked patients (Hierarchical medical visibility)
                const { data: clinicLinks } = await supabase
                    .from('clinic_nutritionists')
                    .select('clinic_id');

                const linkedClinicIds = clinicLinks?.map((c: any) => c.clinic_id) || [];

                let patientList: Patient[] = [];

                if (linkedClinicIds.length > 0) {
                    // Fetch patients linked to those clinics
                    const { data: cpLinks } = await supabase
                        .from('clinic_patients')
                        .select('*, patient:patient_id(*, patient_profiles(*))')
                        .in('clinic_id', linkedClinicIds);

                    if (cpLinks) {
                        patientList = cpLinks.map((l: any) => {
                            const pat = l.patient;
                            const clinical = pat?.patient_profiles?.[0];
                            return {
                                id: pat.id,
                                name: pat.name,
                                email: pat.email,
                                phone: '+54 11 5555-3211',
                                objective: clinical?.objective || 'Pérdida de grasa',
                                adherence: clinical?.adherence || 85,
                                planName: 'Nutrición de Precisión',
                                status: 'active',
                                intakeCompleted: true,
                                weight: clinical?.weight || 75,
                                height: clinical?.height || 175
                            };
                        });
                    }
                }

                // Also fetch legacy direct assignments
                const { data: assigns } = await supabase
                    .from('assignments')
                    .select('*, patient:patient_id(id, name, email, patient_profiles(*))')
                    .eq('nutritionist_id', user.id);

                if (assigns) {
                    assigns.forEach((a: any) => {
                        const pat = a.patient;
                        if (!patientList.some(p => p.id === pat.id)) {
                            const clinical = pat?.patient_profiles?.[0];
                            patientList.push({
                                id: pat.id,
                                name: pat.name,
                                email: pat.email,
                                phone: '+54 11 5555-3211',
                                objective: clinical?.objective || 'Pérdida de grasa',
                                adherence: clinical?.adherence || 85,
                                planName: 'Nutrición Directa',
                                status: 'active',
                                intakeCompleted: true,
                                weight: clinical?.weight || 75,
                                height: clinical?.height || 175
                            });
                        }
                    });
                }

                setPatients(patientList);
                
                if (patientList.length > 0 && !activePatientId) {
                    setActivePatientId(patientList[0].id);
                }

                // Fetch plans for all visible patients
                for (const pat of patientList) {
                    await fetchPlanForPatient(pat.id);
                }

                // Fetch clinics where this professional works for sharing plans
                const { data: clins } = await supabase
                    .from('clinic_nutritionists')
                    .select('*, clinic:clinic_id(id, name)');
                if (clins) {
                    setAllClinics(clins.map((c: any) => c.clinic));
                }

            } else if (role === 'patient') {
                // Fetch own patient clinical metrics and assigned plan
                const { data: clinical } = await supabase
                    .from('patient_profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();

                const selfPatient: Patient = {
                    id: user.id,
                    name: user.user_metadata?.name || 'Mi Perfil',
                    email: user.email || '',
                    phone: '+54 11 9999-8888',
                    objective: clinical?.objective || 'Pérdida de grasa',
                    adherence: clinical?.adherence || 95,
                    planName: 'Plan Prescrito',
                    status: 'active',
                    intakeCompleted: true,
                    weight: clinical?.weight || 70,
                    height: clinical?.height || 170
                };

                setPatients([selfPatient]);
                setActivePatientId(user.id);
                await fetchPlanForPatient(user.id);
            }
        } catch (e) {
            console.error('Error fetching dashboard data from Supabase:', e);
        }
    };

    const fetchPlanForPatient = async (patientId: string) => {
        try {
            // Find active plan for this patient (e.g. created for or assigned to this patient)
            const { data: planData, error } = await supabase
                .from('nutrition_plans')
                .select(`
                    id, name, description, weeks_count, is_template, clinic_id, assigned_patient_id,
                    plan_days (
                        id, day_number, name, is_refeed, notes,
                        meals (
                            id, type, name, time,
                            meal_items (
                                id, food_id, recipe_id, qty
                            )
                        )
                    )
                `)
                .or(`assigned_patient_id.eq.${patientId},created_by.eq.${patientId}`)
                .order('created_at', { ascending: false });

            let finalPlan = defaultPlan;

            if (planData && planData.length > 0) {
                const dbPlan = planData[0]; // Take latest plan
                finalPlan = {
                    id: dbPlan.id,
                    name: dbPlan.name,
                    description: dbPlan.description || '',
                    weeksCount: dbPlan.weeks_count,
                    isTemplate: dbPlan.is_template,
                    clinicId: dbPlan.clinic_id || undefined,
                    assignedPatientId: dbPlan.assigned_patient_id || undefined,
                    days: (dbPlan.plan_days || []).map((d: any) => ({
                        id: d.id,
                        dayNumber: d.day_number,
                        name: d.name,
                        isRefeed: d.is_refeed,
                        notes: d.notes || '',
                        meals: (d.meals || []).map((m: any) => ({
                            id: m.id,
                            type: m.type,
                            name: m.name,
                            time: m.time || '',
                            items: (m.meal_items || []).map((mi: any) => ({
                                id: mi.id,
                                foodId: mi.food_id || undefined,
                                recipeId: mi.recipe_id || undefined,
                                qty: mi.qty
                            }))
                        }))
                    })).sort((a, b) => a.dayNumber - b.dayNumber)
                };
            }

            setPatientPlans(prev => ({
                ...prev,
                [patientId]: finalPlan
            }));
        } catch (e) {
            console.error(`Error loading plan for patient ${patientId}:`, e);
        }
    };

    const handleRoleChange = (newRole: UserRole) => {
        setRole(newRole);
        localStorage.setItem('ai_nutri_role', newRole);
    };

    const handleActivePatientChange = (id: string) => {
        setActivePatientId(id);
        localStorage.setItem('ai_nutri_active_patient', id);
    };

    const savePlanForPatient = async (patientId: string, plan: NutritionPlan) => {
        if (!user) return;

        try {
            // 1. Upsert Plan
            const { data: planData, error: planError } = await supabase
                .from('nutrition_plans')
                .upsert({
                    id: plan.id.startsWith('plan_') ? undefined : plan.id, // Generate real UUID if placeholder
                    name: plan.name,
                    description: plan.description,
                    created_by: user.id,
                    weeks_count: plan.weeksCount,
                    is_template: plan.isTemplate,
                    clinic_id: plan.clinicId || null,
                    assigned_patient_id: plan.assignedPatientId || null
                })
                .select()
                .single();

            if (planError) throw planError;
            const newPlanId = planData.id;

            // 2. Clear old days to avoid duplicates (Cascade will clear meals & items)
            await supabase.from('plan_days').delete().eq('plan_id', newPlanId);

            // 3. Insert new days, meals, and items
            for (const day of plan.days) {
                const { data: dayData, error: dayError } = await supabase
                    .from('plan_days')
                    .insert({
                        plan_id: newPlanId,
                        day_number: day.dayNumber,
                        name: day.name,
                        is_refeed: day.isRefeed,
                        notes: day.notes
                    })
                    .select()
                    .single();

                if (dayError) throw dayError;

                for (const meal of day.meals) {
                    const { data: mealData, error: mealError } = await supabase
                        .from('meals')
                        .insert({
                            day_id: dayData.id,
                            type: meal.type,
                            name: meal.name,
                            time: meal.time
                        })
                        .select()
                        .single();

                    if (mealError) throw mealError;

                    for (const item of meal.items) {
                        const { error: itemError } = await supabase
                            .from('meal_items')
                            .insert({
                                meal_id: mealData.id,
                                food_id: item.foodId || null,
                                recipe_id: item.recipeId || null,
                                qty: item.qty
                            });

                        if (itemError) throw itemError;
                    }
                }
            }

            // Reload local memory
            await fetchPlanForPatient(patientId);
        } catch (e) {
            console.error('Error saving plan to Supabase:', e);
            
            // Local fallback if DB fails
            const updatedPlans = {
                ...patientPlans,
                [patientId]: plan
            };
            setPatientPlans(updatedPlans);
        }
    };

    // ==========================================
    // VINCULACIONES JERÁRQUICAS (SUPABASE)
    // ==========================================

    const createAssignment = async (patientId: string, nutritionistId: string) => {
        if (!user) return false;
        try {
            const { error } = await supabase
                .from('assignments')
                .insert({
                    patient_id: patientId,
                    nutritionist_id: nutritionistId,
                    assigned_by: user.id
                });

            if (error) throw error;
            await fetchData();
            return true;
        } catch (e) {
            console.error('Error creating assignment:', e);
            return false;
        }
    };

    const deleteAssignment = async (assignmentId: string) => {
        if (!user) return false;
        try {
            const { error } = await supabase
                .from('assignments')
                .delete()
                .eq('id', assignmentId);

            if (error) throw error;
            await fetchData();
            return true;
        } catch (e) {
            console.error('Error deleting assignment:', e);
            return false;
        }
    };

    // 1. Vincular Paciente con Consultorio
    const linkPatientToClinic = async (patientId: string, clinicId: string) => {
        try {
            const { error } = await supabase
                .from('clinic_patients')
                .insert({ patient_id: patientId, clinic_id: clinicId });
            if (error) throw error;
            await fetchData();
            return true;
        } catch (e) {
            console.error('Error linking patient to clinic:', e);
            return false;
        }
    };

    // 2. Desvincular Paciente de Consultorio
    const unlinkPatientFromClinic = async (patientId: string, clinicId: string) => {
        try {
            const { error } = await supabase
                .from('clinic_patients')
                .delete()
                .eq('patient_id', patientId)
                .eq('clinic_id', clinicId);
            if (error) throw error;
            await fetchData();
            return true;
        } catch (e) {
            console.error('Error unlinking patient from clinic:', e);
            return false;
        }
    };

    // 3. Vincular Nutricionista con Consultorio
    const linkNutritionistToClinic = async (nutritionistId: string, clinicId: string) => {
        try {
            const { error } = await supabase
                .from('clinic_nutritionists')
                .insert({ nutritionist_id: nutritionistId, clinic_id: clinicId });
            if (error) throw error;
            await fetchData();
            return true;
        } catch (e) {
            console.error('Error linking nutritionist to clinic:', e);
            return false;
        }
    };

    // 4. Desvincular Nutricionista de Consultorio
    const unlinkNutritionistFromClinic = async (nutritionistId: string, clinicId: string) => {
        try {
            const { error } = await supabase
                .from('clinic_nutritionists')
                .delete()
                .eq('nutritionist_id', nutritionistId)
                .eq('clinic_id', clinicId);
            if (error) throw error;
            await fetchData();
            return true;
        } catch (e) {
            console.error('Error unlinking nutritionist from clinic:', e);
            return false;
        }
    };

    // 5. Asignar un Programa al Consultorio (Hecho por Nutricionista)
    const assignPlanToClinic = async (planId: string, clinicId: string) => {
        try {
            const { error } = await supabase
                .from('nutrition_plans')
                .update({ clinic_id: clinicId || null })
                .eq('id', planId);
            if (error) throw error;
            await fetchData();
            return true;
        } catch (e) {
            console.error('Error sharing plan with clinic:', e);
            return false;
        }
    };

    // 6. Asignar Programa al Paciente (Hecho por Consultorio o Nutricionista)
    const assignPlanToPatient = async (planId: string, patientId: string) => {
        try {
            const { error } = await supabase
                .from('nutrition_plans')
                .update({ assigned_patient_id: patientId || null })
                .eq('id', planId);
            if (error) throw error;
            await fetchData();
            return true;
        } catch (e) {
            console.error('Error assigning plan to patient:', e);
            return false;
        }
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setRole('nutritionist');
        router.push('/login');
    };

    const currentPlan = patientPlans[activePatientId] || defaultPlan;

    const setCurrentPlan = (plan: NutritionPlan) => {
        savePlanForPatient(activePatientId, plan);
    };

    const shoppingList = [
        'Avena arrollada instantánea (500g)',
        'Pechuga de pollo fresca (1.5 Kg)',
        'Arroz integral (1 Kg)',
        'Paltas maduras (4 unidades)',
        'Bananas (1 docena)',
        'Almendras naturales (200g)',
        'Leche descremada (2 Litros)'
    ];

    return (
        <AppContext.Provider
            value={{
                role,
                setRole: handleRoleChange,
                user,
                loading,
                patients,
                setPatients,
                foods: initialFoods,
                recipes: initialRecipes,
                currentPlan,
                setCurrentPlan,
                activePatientId,
                setActivePatientId: handleActivePatientChange,
                patientPlans,
                savePlanForPatient,
                shoppingList,
                habits,
                setHabits,
                refreshData: fetchData,
                allNutritionists,
                allPatients,
                allClinics,
                assignments,
                clinicPatients,
                clinicNutritionists,
                sharedPlans,
                createAssignment,
                deleteAssignment,
                linkPatientToClinic,
                unlinkPatientFromClinic,
                linkNutritionistToClinic,
                unlinkNutritionistFromClinic,
                assignPlanToClinic,
                assignPlanToPatient,
                signOut
            }}
        >
            {children}
        </AppContext.Provider>
    );
}

export function useApp() {
    const context = useContext(AppContext);
    if (!context) throw new Error('useApp debe usarse dentro de un AppProvider');
    return context;
}
