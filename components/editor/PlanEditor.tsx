'use client';

import { useDietStore } from '@/lib/store';
import { MealBuilderPanel } from './MealBuilderPanel';
import { useState } from 'react';
import { ArrowLeft, Save, Loader2, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { savePlanChanges } from '@/lib/actions';

interface PlanEditorProps {
    planId: string;
    planName: string;
}

export function PlanEditor({ planId, planName }: PlanEditorProps) {
    const {
        days,
        mealBuilderDayId,
        exitMealBuilder,
        hasUnsavedChanges,
        markAsClean
    } = useDietStore();

    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Call server action to save all changes
            console.log("PAYLOAD TO SAVE:", JSON.stringify(days, null, 2));

            const result = await savePlanChanges(planId, days as any);
            if (result.success) {
                toast.success('Plan guardado correctamente');
                markAsClean();
            } else {
                console.error('Save error:', result.error);
                toast.error(`Error al guardar: ${result.error}`);
            }
        } catch (error) {
            console.error(error);
            toast.error('Error inesperado');
        } finally {
            setIsSaving(false);
        }
    };

    // Ensure we have a day selected
    const activeDayId = mealBuilderDayId || (days.length > 0 ? days[0].id : null);
    const activeDayName = days.find(d => d.id === activeDayId)?.name || 'Editor';

    return (
        <div className="flex flex-col h-screen bg-slate-50 dark:bg-black">
            {/* Navbar */}
            <div className="h-14 bg-white dark:bg-cv-bg-secondary border-b border-slate-200 dark:border-slate-800 px-4 flex items-center justify-between shrink-0 z-20">
                <div className="flex items-center gap-4">
                    <Link href="/meal-plans" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                        <ArrowLeft size={18} />
                    </Link>
                    <div>
                        <h1 className="text-sm font-bold text-cv-text-primary">{planName}</h1>
                        <p className="text-[10px] text-cv-text-tertiary uppercase tracking-wider">Editor de Plan</p>
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

            {/* Main Content Area - Always Builder */}
            <div className="flex-1 overflow-hidden relative">
                {activeDayId ? (
                    <MealBuilderPanel
                        dayId={activeDayId}
                        dayName={activeDayName}
                        onClose={exitMealBuilder}
                    />
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">
                        Cargando editor...
                    </div>
                )}
            </div>
        </div>
    );
}
