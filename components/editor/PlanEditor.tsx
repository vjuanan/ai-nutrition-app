'use client';

import { useDietStore } from '@/lib/store';
import { MealBuilderPanel } from './MealBuilderPanel';
import { useState } from 'react';
import { ArrowLeft, Save, Loader2, CheckCircle2, User, RotateCcw, RotateCw, Download } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { savePlanChanges } from '@/lib/actions';
import { NutritionPlanExporter } from '@/components/export/NutritionPlanExporter';

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
    const [isExportOpen, setIsExportOpen] = useState(false);

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

    const handleAssignSuccess = (clientId: string | null, clientName: string | null, clientType: 'patient' | 'clinic' | null) => {
        updatePlanClient(clientName);
        setIsAssignModalOpen(false);
    };

    // Ensure we have a day selected
    const activeDayId = mealBuilderDayId || (days.length > 0 ? days[0].id : null);
    const activeDayName = days.find(d => d.id === activeDayId)?.name || 'Editor';

    return (
        <div className="flex flex-col h-screen bg-slate-50 dark:bg-black">
            {/* Navbar */}
            <div className="h-12 bg-white dark:bg-cv-bg-secondary border-b border-slate-200 dark:border-slate-800 px-4 flex items-center justify-between shrink-0 z-20">
                <div className="flex items-center gap-4">
                    <Link href="/meal-plans" className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                        <ArrowLeft size={18} className="text-slate-500" />
                    </Link>
                    <div className="flex items-center gap-2">
                        <h1 className="text-sm font-bold text-cv-text-primary">{planName}</h1>
                        <span className="text-slate-300 text-xs">/</span>
                        <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                            {useDietStore.getState().planObjective || 'General'}
                        </span>

                        <span className="text-slate-300 text-xs">/</span>
                        <button
                            onClick={() => setIsAssignModalOpen(true)}
                            className="text-xs text-slate-500 flex items-center gap-1 hover:text-slate-800 transition-colors bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-full"
                        >
                            <User size={10} />
                            {planClientName || 'Sin asignar'}
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Undo/Redo - Visual only for now */}
                    <div className="flex items-center gap-1 border-r border-slate-200 dark:border-slate-700 pr-2 mr-1">
                        <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 transition-colors" disabled>
                            <RotateCcw size={14} />
                        </button>
                        <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 transition-colors" disabled>
                            <RotateCw size={14} />
                        </button>
                    </div>

                    {!planClientName && (
                        <button
                            onClick={() => setIsAssignModalOpen(true)}
                            className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 text-xs font-medium rounded-md transition-colors"
                        >
                            <User size={14} />
                            Asignar
                        </button>
                    )}

                    <button
                        onClick={() => setIsExportOpen(true)}
                        className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 text-xs font-medium rounded-md transition-colors"
                    >
                        <Download size={14} />
                        Exportar
                    </button>

                    <button
                        onClick={handleSave}
                        disabled={!hasUnsavedChanges || isSaving}
                        className={`
                            flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all
                            ${hasUnsavedChanges
                                ? 'bg-cv-accent text-white hover:bg-cv-accent/90 shadow-sm'
                                : 'bg-transparent text-slate-400 cursor-not-allowed'
                            }
                        `}
                    >
                        {isSaving ? <Loader2 size={14} className="animate-spin" /> : hasUnsavedChanges ? <Save size={14} /> : <CheckCircle2 size={14} />}
                        {isSaving ? 'Guardando...' : hasUnsavedChanges ? 'Guardar' : 'Guardado'}
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

            <NutritionPlanExporter
                isOpen={isExportOpen}
                onClose={() => setIsExportOpen(false)}
                planName={planName}
                days={days}
            />
        </div>
    );
}
