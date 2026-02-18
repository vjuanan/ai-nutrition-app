import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
    NutritionalPlan,
    PlanDay,
    Meal,
    Food,
    Profile,
    MealConfig,
    MealItem
} from '@/lib/supabase/types';

// Helper functions for temp IDs
const generateTempId = () => `temp_${Math.random().toString(36).substr(2, 9)}`;

// ============================================
// Diet Ops Store - Canvas State Management
// ============================================

export interface DraftMeal {
    id: string;
    tempId?: string;
    day_id: string;
    order: number;
    name: string; // Breakfast, Lunch
    time?: string | null;
    items: MealItem[]; // In-memory items
    isDirty?: boolean;
}

export interface DraftDay {
    id: string;
    tempId?: string;
    plan_id: string;
    day_of_week: number | null; // 0 (Sun) - 6 (Sat)
    name: string | null;
    target_calories?: number;
    target_protein?: number;
    target_carbs?: number;
    target_fats?: number;
    order: number;
    meals: DraftMeal[];
    isDirty?: boolean;
}

// We treat the Plan as having a list of Days. 
// If we want "Weeks", we can add a 'week_number' to DraftDay or group them.
// For now, we assume a single week plan.

interface DietStoreState {
    // Current plan being edited
    planId: string | null;
    planName: string;
    planDescription: string | null;
    planType: string | null;
    planObjective: string | null;
    planClientName: string | null;

    // Draft state
    days: DraftDay[];

    // UI State
    selectedDayId: string | null;
    selectedMealId: string | null;

    isLoading: boolean;
    isSaving: boolean;
    hasUnsavedChanges: boolean;

    // Drag state
    draggedMealId: string | null;
    dropTargetDayId: string | null;

    // Builder Mode
    mealBuilderMode: boolean;
    mealBuilderDayId: string | null;

    // Actions
    initializeStore: (
        planId: string,
        name: string,
        description: string | null,
        type: string | null,
        objective: string | null,
        clientName: string | null
    ) => void;
    loadDays: (days: DraftDay[]) => void;
    resetStore: () => void;

    // Selection
    selectDay: (dayId: string | null) => void;
    selectMeal: (mealId: string | null) => void;

    // Meal operations
    addMeal: (dayId: string, name: string) => void;
    updateMeal: (mealId: string, updates: Partial<DraftMeal>) => void;
    deleteMeal: (mealId: string) => void;
    reorderMeals: (dayId: string, mealIds: string[]) => void;
    duplicateMeal: (mealId: string, targetDayId?: string) => void;
    moveMealToDay: (mealId: string, targetDayId: string) => void;

    // Day operations
    updateDay: (dayId: string, updates: Partial<DraftDay>) => void;
    // clearDay: (dayId: string) => void;

    // Builder
    enterMealBuilder: (dayId: string) => void;
    exitMealBuilder: () => void;
    autoEnterBuilder: () => void;

    // Item operations (Inside a Meal)
    addItemToMeal: (mealId: string, food: Food, quantity: number, unit: string) => void;
    removeItemFromMeal: (mealId: string, itemId: string) => void; // itemId might be index if no ID
    updateItemInMeal: (mealId: string, index: number, updates: Partial<MealItem>) => void;

    // Utility
    updatePlanClient: (clientName: string | null) => void;
    markAsClean: () => void;
}

export const useDietStore = create<DietStoreState>()(
    persist(
        (set, get) => ({
            // Initial State
            planId: null,
            planName: '',
            planDescription: null,
            planType: null,
            planObjective: null,
            planClientName: null,
            days: [],
            selectedDayId: null,
            selectedMealId: null,
            isLoading: false,
            isSaving: false,
            hasUnsavedChanges: false,
            draggedMealId: null,
            dropTargetDayId: null,
            mealBuilderMode: false,
            mealBuilderDayId: null,

            // Actions
            initializeStore: (planId, name, description, type, objective, clientName) => {
                set({
                    planId,
                    planName: name,
                    planDescription: description,
                    planType: type,
                    planObjective: objective,
                    planClientName: clientName,
                    hasUnsavedChanges: false
                });
            },

            loadDays: (days) => set({ days, hasUnsavedChanges: false }),

            resetStore: () => set({
                planId: null,
                planName: '',
                days: [],
                hasUnsavedChanges: false,
                selectedDayId: null,
                selectedMealId: null
            }),

            selectDay: (dayId) => set({ selectedDayId: dayId }),
            selectMeal: (mealId) => set({ selectedMealId: mealId }),

            addMeal: (dayId, name) => {
                const { days } = get();
                const tempId = generateTempId();

                const updatedDays = days.map(day => {
                    if (day.id === dayId) {
                        return {
                            ...day,
                            meals: [
                                ...day.meals,
                                {
                                    id: tempId,
                                    tempId,
                                    day_id: dayId,
                                    order: day.meals.length,
                                    name,
                                    items: [],
                                    isDirty: true
                                }
                            ],
                            isDirty: true
                        };
                    }
                    return day;
                });

                set({ days: updatedDays, hasUnsavedChanges: true, selectedMealId: tempId });
            },

            updateMeal: (mealId, updates) => {
                const { days } = get();
                const updatedDays = days.map(day => ({
                    ...day,
                    meals: day.meals.map(meal =>
                        meal.id === mealId ? { ...meal, ...updates, isDirty: true } : meal
                    )
                }));
                set({ days: updatedDays, hasUnsavedChanges: true });
            },

            deleteMeal: (mealId) => {
                const { days, selectedMealId } = get();
                const updatedDays = days.map(day => ({
                    ...day,
                    meals: day.meals.filter(m => m.id !== mealId)
                }));
                set({
                    days: updatedDays,
                    hasUnsavedChanges: true,
                    selectedMealId: selectedMealId === mealId ? null : selectedMealId
                });
            },

            reorderMeals: (dayId, mealIds) => {
                const { days } = get();
                const updatedDays = days.map(day => {
                    if (day.id === dayId) {
                        const mealMap = new Map(day.meals.map(m => [m.id, m]));
                        const newMeals = mealIds.map((id, index) => {
                            const meal = mealMap.get(id);
                            if (meal) return { ...meal, order: index, isDirty: true } as DraftMeal;
                            return null;
                        }).filter((m): m is DraftMeal => m !== null);

                        return { ...day, meals: newMeals, isDirty: true };
                    }
                    return day;
                });
                set({ days: updatedDays, hasUnsavedChanges: true });
            },

            duplicateMeal: (mealId, targetDayId) => {
                const { days } = get();
                const tempId = generateTempId();

                let sourceMeal: DraftMeal | null = null;
                for (const day of days) {
                    const found = day.meals.find(m => m.id === mealId);
                    if (found) {
                        sourceMeal = found;
                        break;
                    }
                }

                if (!sourceMeal) return;

                const finalTargetDayId = targetDayId || sourceMeal.day_id;

                const updatedDays = days.map(day => {
                    if (day.id === finalTargetDayId) {
                        return {
                            ...day,
                            meals: [
                                ...day.meals,
                                {
                                    ...sourceMeal!,
                                    id: tempId,
                                    tempId,
                                    day_id: finalTargetDayId,
                                    order: day.meals.length,
                                    isDirty: true
                                }
                            ],
                            isDirty: true
                        };
                    }
                    return day;
                });

                set({ days: updatedDays, hasUnsavedChanges: true });
            },

            moveMealToDay: (mealId, targetDayId) => {
                const { days } = get();
                let sourceMeal: DraftMeal | null = null;
                let sourceDayId: string | null = null;

                // Find meal and source day
                for (const day of days) {
                    const meal = day.meals.find(m => m.id === mealId);
                    if (meal) {
                        sourceMeal = meal;
                        sourceDayId = day.id;
                        break;
                    }
                }

                if (!sourceMeal || !sourceDayId || sourceDayId === targetDayId) return;

                const updatedDays = days.map(day => {
                    // Remove from source
                    if (day.id === sourceDayId) {
                        return {
                            ...day,
                            meals: day.meals.filter(m => m.id !== mealId),
                            isDirty: true
                        };
                    }
                    // Add to target
                    if (day.id === targetDayId) {
                        return {
                            ...day,
                            meals: [
                                ...day.meals,
                                {
                                    ...sourceMeal!,
                                    day_id: targetDayId,
                                    order: day.meals.length,
                                    isDirty: true
                                }
                            ],
                            isDirty: true
                        };
                    }
                    return day;
                });

                set({ days: updatedDays, hasUnsavedChanges: true });
            },

            updateDay: (dayId, updates) => {
                const { days } = get();
                const updatedDays = days.map(d => d.id === dayId ? { ...d, ...updates, isDirty: true } : d);
                set({ days: updatedDays, hasUnsavedChanges: true });
            },

            enterMealBuilder: (dayId) => set({ mealBuilderMode: true, mealBuilderDayId: dayId, selectedDayId: dayId }),
            exitMealBuilder: () => set({ mealBuilderMode: false, mealBuilderDayId: null }),
            autoEnterBuilder: () => {
                const { days } = get();
                if (days.length > 0) {
                    const firstDay = days.sort((a, b) => a.order - b.order)[0];
                    set({ mealBuilderMode: true, mealBuilderDayId: firstDay.id, selectedDayId: firstDay.id });
                }
            },

            addItemToMeal: (mealId, food, quantity, unit) => {
                const { days } = get();
                const tempId = generateTempId();

                const updatedDays = days.map(day => ({
                    ...day,
                    meals: day.meals.map(meal => {
                        if (meal.id === mealId) {
                            return {
                                ...meal,
                                items: [
                                    ...meal.items,
                                    {
                                        id: tempId,
                                        food_id: food.id,
                                        quantity,
                                        unit,
                                        food: food // Store full object for UI
                                    }
                                ],
                                isDirty: true
                            };
                        }
                        return meal;
                    })
                }));
                set({ days: updatedDays, hasUnsavedChanges: true });
            },

            removeItemFromMeal: (mealId, itemId) => {
                const { days } = get();
                const updatedDays = days.map(day => ({
                    ...day,
                    meals: day.meals.map(meal => {
                        if (meal.id === mealId) {
                            return {
                                ...meal,
                                items: meal.items.filter(item => item.id !== itemId),
                                isDirty: true
                            };
                        }
                        return meal;
                    })
                }));
                set({ days: updatedDays, hasUnsavedChanges: true });
            },

            updateItemInMeal: (mealId, index, updates) => {
                const { days } = get();
                const updatedDays = days.map(day => ({
                    ...day,
                    meals: day.meals.map(meal => {
                        if (meal.id === mealId) {
                            const newItems = [...meal.items];
                            if (newItems[index]) {
                                newItems[index] = { ...newItems[index], ...updates };
                            }
                            return { ...meal, items: newItems, isDirty: true };
                        }
                        return meal;
                    })
                }));
                set({ days: updatedDays, hasUnsavedChanges: true });
            },

            markAsClean: () => set({ hasUnsavedChanges: false }),
            updatePlanClient: (clientName) => set({ planClientName: clientName })
        }),
        {
            name: 'diet-store',
            skipHydration: true,
            partialize: (state) => ({
                planId: state.planId,
                planName: state.planName,
                days: state.days,
                hasUnsavedChanges: state.hasUnsavedChanges
            })
        }
    )
);

// ============================================
// App Store - Global App State
// ============================================

export type ViewContext = 'athletes' | 'gyms';

interface AppState {
    // Context
    currentView: ViewContext;

    // Command Palette
    isCommandPaletteOpen: boolean;

    // Sidebar
    isSidebarCollapsed: boolean;

    // Actions
    setCurrentView: (view: ViewContext) => void;
    toggleCommandPalette: () => void;
    openCommandPalette: () => void;
    closeCommandPalette: () => void;
    toggleSidebar: () => void;
}

export const useAppStore = create<AppState>()((set) => ({
    currentView: 'athletes',
    isCommandPaletteOpen: false,
    isSidebarCollapsed: false,

    setCurrentView: (view) => set({ currentView: view }),
    toggleCommandPalette: () => set((state) => ({ isCommandPaletteOpen: !state.isCommandPaletteOpen })),
    openCommandPalette: () => set({ isCommandPaletteOpen: true }),
    closeCommandPalette: () => set({ isCommandPaletteOpen: false }),
    toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
}));
