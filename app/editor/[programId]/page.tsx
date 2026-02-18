'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { PlanEditor } from '@/components/editor/PlanEditor';
import { useDietStore } from '@/lib/store';
import { getNutritionalPlan } from '@/lib/actions';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function EditorPage() {
    const params = useParams();
    const planId = params.programId as string; // Using existing route param
    const { initializeStore, loadDays, resetStore, planId: storePlanId, days, autoEnterBuilder } = useDietStore();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isFullScreen, setIsFullScreen] = useState(true);

    useEffect(() => {
        // Prevent reloading if we already have the data for this plan
        if (storePlanId === planId) {
            setIsLoading(false);
            return;
        }

        async function loadData() {
            setIsLoading(true);
            setError(null);
            resetStore();

            try {
                const planData = await getNutritionalPlan(planId);

                if (!planData) {
                    setError('Plan nutricional no encontrado');
                    return;
                }

                // Initialize Store
                initializeStore(
                    planData.id,
                    planData.name,
                    planData.description,
                    planData.type
                );

                // Load Days
                // We need to ensure the structure matches deeply
                // The action returns nested data which matches our store types mostly
                // We add isDirty: false to everything
                const loadedDays = (planData.days || []).map((day: any) => ({
                    ...day,
                    isDirty: false,
                    meals: (day.meals || []).map((meal: any) => ({
                        ...meal,
                        isDirty: false,
                        items: (meal.items || []).map((item: any) => ({
                            ...item,
                            // Ensure food object is present (it is fetched)
                        }))
                    }))
                }));

                loadDays(loadedDays);

                // Auto-enter builder mode for the first day
                // This skips the weekly grid and opens the editor directly
                setTimeout(() => autoEnterBuilder(), 0);

            } catch (err) {
                console.error(err);
                setError('Error al cargar el plan');
                toast.error('Error al cargar el plan');
            } finally {
                setIsLoading(false);
            }
        }

        if (planId) {
            loadData();
        }
    }, [planId, initializeStore, loadDays, resetStore, storePlanId, days.length]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-cv-bg-primary flex items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                    <Loader2 className="animate-spin text-cv-accent" size={32} />
                    <p className="text-sm text-cv-text-tertiary">Cargando plan nutricional...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <AppShell>
                <div className="flex items-center justify-center h-[calc(100vh-100px)] text-cv-text-secondary">
                    {error}
                </div>
            </AppShell>
        );
    }

    // We pass store values to editor, or editor picks them up. 
    // PlanEditor picks them up from store mostly, but accepts planId/name as props too.
    const currentPlanName = useDietStore.getState().planName;

    return (
        <AppShell fullScreen={isFullScreen}>
            <PlanEditor
                planId={planId}
                planName={currentPlanName}
            />
        </AppShell>
    );
}
