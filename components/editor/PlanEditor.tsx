'use client';

import { useDietStore } from '@/lib/store';
import { MealBuilderPanel } from './MealBuilderPanel';
import { useState } from 'react';
import { ArrowLeft, Save, Loader2, CheckCircle2, User, RotateCcw, RotateCw, Download } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { savePlanChanges } from '@/lib/actions';

import { ProgramAssignmentModal } from '@/components/programs/ProgramAssignmentModal';

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
        markAsClean,
        updatePlanClient,
        planClientName
    } = useDietStore();

    const [isSaving, setIsSaving] = useState(false);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

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

    const handleAssignSuccess = (clientId: string | null, clientName: string | null, clientType: 'athlete' | 'gym' | null) => {
        updatePlanClient(clientName);
        setIsAssignModalOpen(false);
    };

    // Ensure we have a day selected
    const activeDayId = mealBuilderDayId || (days.length > 0 ? days[0].id : null);
    const activeDayName = days.find(d => d.id === activeDayId)?.name || 'Editor';

    return (
        <div className="flex flex-col h-screen bg-slate-50 dark:bg-black">
            {/* Navbar */}
            <div className="h-16 bg-white dark:bg-cv-bg-secondary border-b border-slate-200 dark:border-slate-800 px-4 flex items-center justify-between shrink-0 z-20">
                <div className="flex items-center gap-4">
                    <Link href="/meal-plans" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                        <ArrowLeft size={20} className="text-slate-500" />
                    </Link>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-base font-bold text-cv-text-primary">{planName}</h1>
                            <span className="text-slate-300">/</span>
                            <span className="text-sm font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                {useDietStore.getState().planObjective || 'General'}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                            <button
                                onClick={() => setIsAssignModalOpen(true)}
                                className="text-xs text-slate-500 flex items-center gap-1 hover:text-slate-800 transition-colors"
                            >
                                <User size={12} />
                                {planClientName || 'Sin asignar'}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Undo/Redo - Visual only for now */}
                    <div className="flex items-center gap-1 border-r border-slate-200 dark:border-slate-700 pr-3 mr-1">
                        <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 transition-colors" disabled>
                            <RotateCcw size={18} />
                        </button>
                        <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 transition-colors" disabled>
                            <RotateCw size={18} />
                        </button>
                    </div>

                    {!planClientName && (
                        <button
                            onClick={() => setIsAssignModalOpen(true)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 text-sm font-medium rounded-lg transition-colors"
                        >
                            <User size={16} />
                            Asignar
                        </button>
                    )}

                    <button className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 text-sm font-medium rounded-lg transition-colors">
                        <Download size={16} />
                        Exportar
                    </button>

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

            {/* Modals */}
            <ProgramAssignmentModal
                isOpen={isAssignModalOpen}
                onClose={() => setIsAssignModalOpen(false)}
                programId={planId}
                currentClientId={null} // We don't have the ID locally, but basic assign works
                onAssignSuccess={handleAssignSuccess}
            />
        </div>
    );
}
