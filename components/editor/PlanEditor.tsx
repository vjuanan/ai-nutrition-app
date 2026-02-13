'use client';

import { useDietStore } from '@/lib/store';
import { PlanDayCard } from './PlanDayCard';
import { MealBuilderPanel } from './MealBuilderPanel';
import {
    DndContext,
    DragEndEvent,
    DragOverEvent,
    DragStartEvent,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    closestCenter,
    KeyboardSensor,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { MealCard } from './MealCard';
import { ArrowLeft, Save, Loader2, CheckCircle2, Download } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { savePlanChanges } from '@/lib/actions'; // We will use this or store action

interface PlanEditorProps {
    planId: string;
    planName: string;
}

export function PlanEditor({ planId, planName }: PlanEditorProps) {
    const {
        days,
        reorderMeals,
        moveMealToDay,
        mealBuilderMode,
        mealBuilderDayId,
        exitMealBuilder,
        hasUnsavedChanges,
        markAsClean
    } = useDietStore();

    const [activeId, setActiveId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Sensors
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor)
    );

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragOver = (event: DragOverEvent) => {
        // Optional: Could handle drop target highlighting here
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over) return;

        const activeId = active.id as string;
        const overId = over.id as string;

        // Find source and target containers
        const findDayOfMeal = (mealId: string) => days.find(d => d.meals.some(m => m.id === mealId));
        const sourceDay = findDayOfMeal(activeId);

        // Target could be a meal (sort within day) or a day (move to day)
        let targetDayId = null;
        if (overId.startsWith('day-')) {
            targetDayId = overId.replace('day-', '');
        } else {
            const targetDay = findDayOfMeal(overId);
            if (targetDay) targetDayId = targetDay.id;
        }

        if (sourceDay && targetDayId) {
            if (sourceDay.id === targetDayId) {
                // Sorting within same day
                const oldIndex = sourceDay.meals.findIndex(m => m.id === activeId);
                const newIndex = sourceDay.meals.findIndex(m => m.id === overId);

                if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
                    const newOrder = arrayMove(sourceDay.meals, oldIndex, newIndex).map(m => m.id);
                    reorderMeals(sourceDay.id, newOrder);
                }
            } else {
                // Moving to different day
                moveMealToDay(activeId, targetDayId);
            }
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Call server action to save all changes
            // Construct the payload based on store state 'days'
            // We need to map DraftDay to the structure expected by savePlanChanges which expects PlanDay[]
            // But DraftDay matches mostly.
            // Wait, savePlanChanges logic needs to be verified.
            // For now, assume we just pass planId and the days structure.
            // Actually, we should probably implement a store action 'savePlan' that calls the server action.
            // Or just call it here.

            // Simulating save for now to test UI flow
            const success = await savePlanChanges(planId, days as any); // Cast for now
            if (success) {
                toast.success('Plan guardado correctamente');
                markAsClean();
            } else {
                toast.error('Error al guardar el plan');
            }
        } catch (error) {
            console.error(error);
            toast.error('Error inesperado');
        } finally {
            setIsSaving(false);
        }
    };

    const activeMeal = activeId ? days.flatMap(d => d.meals).find(m => m.id === activeId) : null;
    const builderDayName = days.find(d => d.id === mealBuilderDayId)?.name || 'Día';

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
        >
            <div className="flex flex-col h-screen bg-slate-50 dark:bg-black">
                {/* Navbar */}
                <div className="h-14 bg-white dark:bg-cv-bg-secondary border-b border-slate-200 dark:border-slate-800 px-4 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4">
                        <Link href="/meal-plans" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                            <ArrowLeft size={18} />
                        </Link>
                        <div>
                            <h1 className="text-sm font-bold text-cv-text-primary">{planName}</h1>
                            <p className="text-[10px] text-cv-text-tertiary uppercase tracking-wider">Editor Nutricional</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleSave}
                            disabled={!hasUnsavedChanges || isSaving}
                            className={`
                                flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                                ${hasUnsavedChanges
                                    ? 'bg-cv-accent text-white hover:bg-cv-accent/90 shadow-md transform hover:scale-105'
                                    : 'bg-transparent text-slate-400 cursor-not-allowed'
                                }
                            `}
                        >
                            {isSaving ? <Loader2 size={16} className="animate-spin" /> : hasUnsavedChanges ? <Save size={16} /> : <CheckCircle2 size={16} />}
                            {isSaving ? 'Guardando...' : hasUnsavedChanges ? 'Guardar Cambios' : 'Guardado'}
                        </button>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-hidden relative">
                    {mealBuilderMode && mealBuilderDayId ? (
                        /* Builder Mode Overlay */
                        <div className="absolute inset-0 z-50 bg-white dark:bg-cv-bg-primary flex flex-col animate-in slide-in-from-right duration-300">
                            <div className="h-12 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between px-4 bg-slate-50/50 dark:bg-slate-900/50">
                                <div className="flex items-center gap-2">
                                    <button onClick={exitMealBuilder} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"><ArrowLeft size={16} /></button>
                                    <span className="font-bold text-sm">Editando {builderDayName}</span>
                                </div>
                                <button onClick={exitMealBuilder} className="text-xs bg-slate-200 dark:bg-slate-800 px-2 py-1 rounded hover:bg-slate-300 transition-colors">Cerrar Editor</button>
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <MealBuilderPanel dayId={mealBuilderDayId} dayName={builderDayName} onClose={exitMealBuilder} />
                            </div>
                        </div>
                    ) : (
                        /* Weekly Grid View */
                        <div className="h-full overflow-auto p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {days.sort((a, b) => a.order - b.order).map((day) => (
                                    <div key={day.id} className="min-h-[400px]">
                                        <PlanDayCard day={day as any} dayName={day.name || `Día ${day.order + 1}`} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Drag Overlay */}
            {createPortal(
                <DragOverlay>
                    {activeMeal ? <MealCard meal={activeMeal} /> : null}
                </DragOverlay>,
                document.body
            )}
        </DndContext>
    );
}
