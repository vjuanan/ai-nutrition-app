'use client';

import { Topbar } from '@/components/app-shell/Topbar';
import { GlobalCreateButton } from '@/components/app-shell/GlobalCreateButton';
import { useState, useEffect } from 'react';
import { useEscapeKey } from '@/hooks/use-escape-key';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    Loader2,
    AlertTriangle,
    LayoutGrid,
    List,
    Download,
    Trash2,
    Utensils
} from 'lucide-react';
import {
    getNutritionalPlans,
    deleteNutritionalPlan,
    deleteNutritionalPlans,
    getClients,
    updateNutritionalPlan
} from '@/lib/actions';
import { MealPlansGrid } from './MealPlansGrid';
import { MealPlansTable } from './MealPlansTable';
import { ProgramAssignmentModal } from '@/components/programs/ProgramAssignmentModal';
// import { ProgramCardExporter } from '@/components/export/ProgramCardExporter'; // Keeping commented out until updated for Nutrition

interface PlanType {
    id: string;
    name: string;
    description?: string;
    type?: string;
    status?: string;
    created_at: string;
    updated_at: string;
    client: { id: string; name: string; type: 'athlete' | 'gym' } | null;
}

interface Client {
    id: string;
    name: string;
    type: 'athlete' | 'gym';
}

// Paleta de gradientes vibrantes para las cards (Nutrition style - maybe fresher colors)
const CARD_GRADIENTS = [
    'from-green-400 to-emerald-600',       // Fresh Green
    'from-orange-400 to-red-500',          // Warm Orange/Red
    'from-yellow-400 to-orange-500',       // Sunny Yellow
    'from-teal-400 to-cyan-600',           // Cool Teal
    'from-lime-400 to-green-600',          // Lime
];

export default function MealPlansPage() {
    const [programs, setPrograms] = useState<PlanType[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const searchParams = useSearchParams();
    const searchQuery = searchParams.get('q') || '';

    // View Mode State
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

    // State for Delete Modal
    const [programToDelete, setProgramToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // State for Multi-select
    const [selectedPrograms, setSelectedPrograms] = useState<Set<string>>(new Set());
    const isSelectionMode = selectedPrograms.size > 0;

    // State for Export
    const [exportPrograms, setExportPrograms] = useState<PlanType[]>([]);
    const [isExportOpen, setIsExportOpen] = useState(false);

    // State for Assignment Modal
    const [programToAssign, setProgramToAssign] = useState<PlanType | null>(null);

    useEscapeKey(() => {
        if (!isDeleting && !programToAssign) {
            setProgramToAssign(null);
            setProgramToDelete(null);
        }
    }, !!programToAssign || !!programToDelete);

    const router = useRouter();

    useEffect(() => {
        fetchPrograms();
        // fetchClients(); // Clients are fetched in modal
    }, []);

    async function fetchPrograms() {
        setIsLoading(true);
        const data = await getNutritionalPlans();
        if (data) setPrograms(data as any);
        setIsLoading(false);
    }

    function promptDelete(id: string) {
        setProgramToDelete(id);
    }

    function toggleSelection(id: string) {
        const newSelected = new Set(selectedPrograms);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedPrograms(newSelected);
    }

    function selectAll() {
        if (selectedPrograms.size === filteredPrograms.length) {
            setSelectedPrograms(new Set());
        } else {
            setSelectedPrograms(new Set(filteredPrograms.map(p => p.id)));
        }
    }

    // Export handler - single plan
    function handleExport(programId: string) {
        const program = programs.find(p => p.id === programId);
        if (program) {
            setExportPrograms([program]);
            setIsExportOpen(true);
        }
    }

    // Export handler - bulk (selected plans) - limit to 10
    function handleBulkExport() {
        if (selectedPrograms.size > 10) {
            alert('Solo puedes exportar hasta 10 planes a la vez.');
            return;
        }
        const toExport = programs.filter(p => selectedPrograms.has(p.id));
        if (toExport.length > 0) {
            setExportPrograms(toExport);
            setIsExportOpen(true);
        }
    }

    async function confirmDelete() {
        // If we have a single plan to delete (via trash icon)
        if (programToDelete && !isSelectionMode) {
            setIsDeleting(true);
            try {
                const result = await deleteNutritionalPlan(programToDelete);
                if (!result.success) {
                    console.error('Delete failed:', result.error);
                    alert(`Error al eliminar el plan: ${result.error}`);
                } else {
                    await fetchPrograms(); // Refresh list
                }
            } catch (error: any) {
                console.error('Delete unexpected error', error);
                alert(`Error al eliminar el plan: ${error.message || 'Error de red'}`);
            } finally {
                setIsDeleting(false);
                setProgramToDelete(null);
            }
            return;
        }

        // Bulk delete
        if (isSelectionMode) {
            setIsDeleting(true);
            try {
                const result = await deleteNutritionalPlans(Array.from(selectedPrograms));
                if (!result.success) {
                    console.error('Bulk delete failed:', result.error);
                    alert(`Error al eliminar los planes: ${result.error}`);
                } else {
                    await fetchPrograms();
                    setSelectedPrograms(new Set());
                }
            } catch (error: any) {
                console.error('Bulk delete unexpected error', error);
                alert(`Error al eliminar los planes: ${error.message || 'Error de red'}`);
            } finally {
                setIsDeleting(false);
            }
        }
    }

    const filteredPrograms = programs.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    function handleAssign(program: PlanType) {
        setProgramToAssign(program);
    }

    async function handleAssignmentSuccess(clientId: string | null, clientName: string | null, clientType: 'athlete' | 'gym' | null) {
        // Optimistic update: immediately update local state
        if (programToAssign) {
            setPrograms(prev => prev.map(p => {
                if (p.id === programToAssign.id) {
                    return {
                        ...p,
                        client: clientId ? {
                            id: clientId,
                            name: clientName || 'Asignado',
                            type: clientType || 'athlete'
                        } : null
                    };
                }
                return p;
            }));
        }
        // Actually perform update in DB via Action (Modal handles it? or checking modal code)
        // Check: ProgramAssignmentModal.tsx calls `assignProgram`. I need to change that.
        // Or I update logic here if I lift state up? But Modal calls action internally.

        // Wait for modal to complete (it calls this callback after action)
        setProgramToAssign(null);

        // Delay server refresh to let DB propagate and avoid overwriting optimistic state
        setTimeout(() => {
            fetchPrograms();
        }, 1000);
    }

    return (
        <>
            <Topbar
                title="Planes Nutricionales"
                actions={
                    <div className="flex items-center gap-3">
                        {/* View Toggle */}
                        <div className="flex items-center p-1 bg-gray-100 dark:bg-slate-800 rounded-lg mr-2">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-1.5 rounded-md transition-all ${viewMode === 'grid'
                                    ? 'bg-white dark:bg-slate-700 text-cv-accent shadow-sm'
                                    : 'text-gray-400 hover:text-gray-600 dark:text-slate-500'
                                    }`}
                                title="Vista Cuadrícula"
                            >
                                <LayoutGrid size={18} />
                            </button>
                            <button
                                onClick={() => setViewMode('table')}
                                className={`p-1.5 rounded-md transition-all ${viewMode === 'table'
                                    ? 'bg-white dark:bg-slate-700 text-cv-accent shadow-sm'
                                    : 'text-gray-400 hover:text-gray-600 dark:text-slate-500'
                                    }`}
                                title="Vista Lista"
                            >
                                <List size={18} />
                            </button>
                        </div>

                        {isSelectionMode ? (
                            <div className="flex items-center gap-2">
                                {/* <button
                                    onClick={handleBulkExport}
                                    className="p-2 bg-orange-50 hover:bg-orange-100 text-cv-accent rounded-lg transition-colors flex items-center justify-center relative group"
                                    title="Exportar selección"
                                >
                                    <Download size={18} />
                                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-cv-accent text-[10px] text-white font-medium">
                                        {selectedPrograms.size}
                                    </span>
                                </button> */}
                                <button
                                    onClick={() => setProgramToDelete('BULK')} // Open confirmation modal correctly
                                    className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors flex items-center justify-center relative group"
                                    title="Eliminar selección"
                                >
                                    <Trash2 size={18} />
                                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] text-white font-medium">
                                        {selectedPrograms.size}
                                    </span>
                                </button>
                            </div>
                        ) : (
                            <GlobalCreateButton />
                        )}
                    </div>
                }
            />
            <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
                {/* Programs Grid/Table */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="animate-spin text-cv-accent" size={32} />
                    </div>
                ) : filteredPrograms.length === 0 ? (
                    <div className="text-center py-20 bg-cv-bg-tertiary/30 rounded-2xl border border-dashed border-cv-border">
                        <Utensils size={48} className="mx-auto text-cv-text-tertiary mb-4 opacity-50" />
                        <h3 className="text-lg font-medium text-cv-text-primary">No hay planes creados</h3>
                        <p className="text-cv-text-secondary mt-1">Empieza creando tu primer plan nutricional.</p>
                        <div className="mt-6 flex justify-center">
                            <GlobalCreateButton />
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex justify-end mb-4 h-6">
                            {filteredPrograms.length > 0 && viewMode === 'grid' && (
                                <button
                                    onClick={selectAll}
                                    className="text-sm text-cv-text-secondary hover:text-cv-text-primary transition-colors"
                                >
                                    {selectedPrograms.size === filteredPrograms.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                                </button>
                            )}
                        </div>

                        {viewMode === 'grid' ? (
                            <MealPlansGrid
                                programs={filteredPrograms}
                                selectedPrograms={selectedPrograms}
                                isSelectionMode={isSelectionMode}
                                toggleSelection={toggleSelection}
                                promptDelete={promptDelete}
                                onExport={handleExport}
                                onAssign={handleAssign}
                                CARD_GRADIENTS={CARD_GRADIENTS}
                                CARD_ICONS={[]}
                            />
                        ) : (
                            <MealPlansTable
                                programs={filteredPrograms}
                                selectedPrograms={selectedPrograms}
                                isSelectionMode={isSelectionMode}
                                toggleSelection={toggleSelection}
                                selectAll={selectAll}
                                totalFiltered={filteredPrograms.length}
                                promptDelete={promptDelete}
                                onExport={handleExport}
                                onAssign={handleAssign}
                                CARD_GRADIENTS={CARD_GRADIENTS}
                            />
                        )}

                        {/* Delete Confirmation Modal */}
                        {(programToDelete || (isDeleting && isSelectionMode)) && (
                            <>
                                <div className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" onClick={() => !isDeleting && setProgramToDelete(null)} />
                                <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white dark:bg-cv-bg-elevated border border-slate-200 dark:border-slate-700 rounded-xl p-6 z-50 shadow-2xl">
                                    <div className="flex flex-col items-center text-center space-y-4">
                                        <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
                                            <AlertTriangle size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-cv-text-primary">
                                                {isSelectionMode ? `¿Eliminar ${selectedPrograms.size} planes?` : '¿Eliminar plan?'}
                                            </h3>
                                            <p className="text-sm text-cv-text-secondary mt-1">
                                                Esta acción no se puede deshacer.
                                            </p>
                                        </div>
                                        <div className="flex gap-3 w-full mt-2">
                                            <button
                                                onClick={() => {
                                                    setProgramToDelete(null);
                                                    setIsDeleting(false);
                                                }}
                                                disabled={isDeleting}
                                                className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                            >
                                                Cancelar
                                            </button>
                                            <button
                                                onClick={confirmDelete}
                                                disabled={isDeleting}
                                                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center"
                                            >
                                                {isDeleting ? <Loader2 size={16} className="animate-spin" /> : 'Sí, Eliminar'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Assignment Modal */}
            {programToAssign && (
                <ProgramAssignmentModal
                    isOpen={!!programToAssign}
                    onClose={() => setProgramToAssign(null)}
                    programId={programToAssign.id}
                    currentClientId={programToAssign.client ? programToAssign.client.id : null}
                    onAssignSuccess={handleAssignmentSuccess}
                />
            )}
        </>
    );
}
