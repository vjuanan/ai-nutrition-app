'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Search, Tag, Trash2, X, CheckSquare, Edit2, Plus, Square, Apple } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { FoodForm } from './FoodForm';
import { deleteFoods } from '@/lib/actions';
import { toast } from 'sonner';
import { Food } from '@/lib/supabase/types';

// Categories for filter
const CATEGORIES = [
    { value: 'all', label: 'Todos' },
    { value: 'Proteína', label: 'Proteína' }, // Example categories
    { value: 'Carbohidratos', label: 'Carbohidratos' },
    { value: 'Grasas', label: 'Grasas' },
    { value: 'Frutas', label: 'Frutas' },
    { value: 'Verduras', label: 'Verduras' }
];

interface FoodWithCategory extends Food {
    category?: string;
}

interface FoodListProps {
    initialFoods: FoodWithCategory[];
    totalCount: number;
    initialCategory?: string;
    initialQuery?: string;
}

export function FoodList({
    initialFoods,
    totalCount,
    initialCategory = 'all',
    initialQuery = ''
}: FoodListProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [query, setQuery] = useState(initialQuery);
    const [category, setCategory] = useState(initialCategory);

    // Feature States
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingFood, setEditingFood] = useState<FoodWithCategory | null>(null);

    // Multi-select States
    const [isSelectMode, setIsSelectMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());



    // Update URL when filtering
    const updateUrl = (newQuery: string, newCategory: string) => {
        const params = new URLSearchParams(searchParams.toString());

        if (newQuery) params.set('q', newQuery);
        else params.delete('q');

        if (newCategory && newCategory !== 'all') params.set('category', newCategory);
        else params.delete('category');

        router.replace(`?${params.toString()}`, { scroll: false });
    };

    const handleSearch = (term: string) => {
        updateUrl(term, category);
    };

    // Debounce search update
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (query !== initialQuery) {
                updateUrl(query, category);
            }
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [query, category, initialQuery, router, searchParams]); // Added dependencies, removed handleSearch wrapper to simplify

    const handleCategoryChange = (cat: string) => {
        setCategory(cat);
        updateUrl(query, cat);
    };

    // Toggle Selection Mode
    const toggleSelectMode = () => {
        setIsSelectMode(!isSelectMode);
        setSelectedIds(new Set()); // Clear on toggle
    };

    const toggleSelection = (id: string) => {
        const newSelection = new Set(selectedIds);
        if (newSelection.has(id)) {
            newSelection.delete(id);
        } else {
            newSelection.add(id);
        }
        setSelectedIds(newSelection);
    };

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;

        if (!confirm(`¿Estás seguro de que deseas eliminar ${selectedIds.size} alimentos seleccionados?`)) {
            return;
        }

        const idsToDelete = Array.from(selectedIds);
        const result = await deleteFoods(idsToDelete);

        if (result.error) {
            toast.error(`Error: ${result.error}`);
        } else {
            toast.success(`${selectedIds.size} alimentos eliminados`);
            setIsSelectMode(false);
            setSelectedIds(new Set());
            router.refresh();
        }
    };

    return (
        <div className="space-y-6">

            {/* Header with Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="text-2xl font-bold">Base de Datos de Alimentos</h2>
                <div className="flex gap-2 w-full md:w-auto">
                    {isSelectMode ? (
                        <>
                            <button
                                onClick={handleBulkDelete}
                                disabled={selectedIds.size === 0}
                                className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg transition-colors disabled:opacity-50"
                            >
                                <Trash2 size={18} />
                                <span className="hidden md:inline">Eliminar ({selectedIds.size})</span>
                            </button>
                            <button
                                onClick={toggleSelectMode}
                                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg transition-colors"
                            >
                                <X size={18} />
                                Cancelar
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={toggleSelectMode}
                                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg transition-colors"
                            >
                                <CheckSquare size={18} />
                                <span className="hidden md:inline">Seleccionar</span>
                            </button>
                            <button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-cv-accent hover:bg-cv-accent/90 text-white rounded-lg transition-colors shadow-lg shadow-cv-accent/20"
                            >
                                <Plus size={18} />
                                Nuevo Alimento
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Filters Header */}
            <div className="flex flex-col md:flex-row gap-4 justify-between bg-white dark:bg-cv-bg-secondary p-4 rounded-xl border border-cv-border shadow-sm">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-cv-text-tertiary" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar alimentos..."
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            handleSearch(e.target.value);
                        }}
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-cv-border bg-transparent focus:ring-2 focus:ring-cv-accent/20 focus:border-cv-accent outline-none transition-all"
                    />
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 no-scrollbar">
                    {CATEGORIES.map((cat) => (
                        <button
                            key={cat.value}
                            onClick={() => handleCategoryChange(cat.value)}
                            className={`
                                    whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all
                                    ${category === cat.value
                                    ? 'bg-cv-accent text-white shadow-md shadow-cv-accent/20'
                                    : 'bg-cv-bg-tertiary text-cv-text-secondary hover:bg-cv-bg-secondary hover:text-cv-text-primary'
                                }
                                `}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Results Grid */}
            {initialFoods.length === 0 ? (
                <div className="text-center py-20 bg-cv-bg-tertiary/30 rounded-2xl border border-dashed border-cv-border">
                    <Apple className="mx-auto text-cv-text-tertiary mb-4 opacity-50" size={48} />
                    <h3 className="text-lg font-medium text-cv-text-primary">No se encontraron alimentos</h3>
                    <p className="text-cv-text-secondary mt-1">Intenta ajustar tu búsqueda o crea uno nuevo.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {initialFoods.map((food) => (
                        <div
                            key={food.id}
                            onClick={() => isSelectMode ? toggleSelection(food.id) : setEditingFood(food)}
                            className={`
                                    group bg-white dark:bg-cv-bg-elevated rounded-xl border transition-all duration-200 overflow-hidden flex flex-col relative
                                    ${isSelectMode
                                    ? selectedIds.has(food.id)
                                        ? 'border-cv-accent ring-1 ring-cv-accent shadow-md'
                                        : 'border-cv-border hover:border-gray-400 cursor-pointer'
                                    : 'border-cv-border hover:border-cv-accent/50 hover:shadow-md cursor-pointer'
                                }
                                `}
                        >
                            {/* Selection Indicator */}
                            {isSelectMode && (
                                <div className="absolute top-3 right-3 z-10">
                                    {selectedIds.has(food.id) ? (
                                        <div className="bg-cv-accent text-white rounded-md p-1 shadow-sm">
                                            <CheckSquare size={20} />
                                        </div>
                                    ) : (
                                        <div className="bg-white/80 dark:bg-black/50 text-gray-400 rounded-md p-1 shadow-sm border border-gray-200 dark:border-gray-700">
                                            <Square size={20} />
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="p-5 flex-1">
                                <div className="flex items-start justify-between mb-3">
                                    <span className={`
                                            px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400
                                        `}>
                                        {food.category || 'General'}
                                    </span>
                                    {/* Edit Trigger */}
                                    {!isSelectMode && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setEditingFood(food);
                                            }}
                                            className="text-gray-300 hover:text-cv-accent transition-colors p-1"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                    )}
                                </div>

                                <h3 className="text-base font-semibold text-cv-text-primary mb-1 line-clamp-2 leading-tight group-hover:text-cv-accent transition-colors">
                                    {food.name}
                                </h3>

                                {food.brand && (
                                    <p className="text-xs text-cv-accent font-medium mb-3">{food.brand}</p>
                                )}

                                <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t border-cv-border/50 text-center">
                                    <div>
                                        <div className="text-xs text-cv-text-tertiary uppercase font-bold">Kcal</div>
                                        <div className="text-sm font-bold text-cv-text-primary">{food.calories}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-blue-500 uppercase font-bold">P</div>
                                        <div className="text-sm font-medium text-cv-text-secondary">{food.protein}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-orange-500 uppercase font-bold">C</div>
                                        <div className="text-sm font-medium text-cv-text-secondary">{food.carbs}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-yellow-500 uppercase font-bold">F</div>
                                        <div className="text-sm font-medium text-cv-text-secondary">{food.fats}</div>
                                    </div>
                                </div>
                                <div className="mt-2 text-center text-xs text-cv-text-tertiary">
                                    por {food.serving_size} {food.unit}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination Feedback */}
            {totalCount > 0 && (
                <div className="text-center text-xs text-cv-text-tertiary pt-4">
                    Mostrando {initialFoods.length} de {totalCount} alimentos
                </div>
            )}

            {/* Create Modal */}
            <Modal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                title="Crear Nuevo Alimento"
                maxWidth="max-w-xl"
            >
                <FoodForm
                    onClose={() => setIsCreateModalOpen(false)}
                    onSuccess={() => {
                        setIsCreateModalOpen(false);
                        router.refresh();
                    }}
                />
            </Modal>

            {/* Edit Modal */}
            <Modal
                isOpen={!!editingFood}
                onClose={() => setEditingFood(null)}
                title="Editar Alimento"
                maxWidth="max-w-xl"
            >
                {editingFood && (
                    <FoodForm
                        food={editingFood as Food}
                        onClose={() => setEditingFood(null)}
                        onSuccess={() => {
                            setEditingFood(null);
                            router.refresh();
                        }}
                    />
                )}
            </Modal>
        </div>
    );
}
