'use client';

import { useDietStore, DraftMeal } from '@/lib/store';
import { GripVertical, Copy, Trash2, Clock, Check } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { toast } from 'sonner';

interface MealCardProps {
    meal: DraftMeal;
}

export function MealCard({ meal }: MealCardProps) {
    const { selectMeal, selectedMealId, deleteMeal, duplicateMeal, enterMealBuilder } = useDietStore();

    // Setup sortable
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: meal.id,
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const isSelected = selectedMealId === meal.id;

    // Macros
    const totalCalories = meal.items.reduce((sum, item) => sum + ((item.food?.calories || 0) * item.quantity / (item.food?.serving_size || 100)), 0);
    const totalProtein = meal.items.reduce((sum, item) => sum + ((item.food?.protein || 0) * item.quantity / (item.food?.serving_size || 100)), 0);

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`
                group relative bg-white dark:bg-cv-bg-elevated rounded-xl border transition-all duration-200 cursor-pointer
                ${isSelected
                    ? 'border-cv-accent ring-1 ring-cv-accent shadow-md'
                    : 'border-slate-200 dark:border-slate-700 hover:border-cv-accent/50 hover:shadow-sm'
                }
            `}
            onClick={(e) => {
                e.stopPropagation();
                selectMeal(meal.id);
                enterMealBuilder(meal.day_id);
            }}
        >
            {/* Drag Handle */}
            <div
                {...attributes}
                {...listeners}
                className="absolute left-2 top-3 text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing p-1 z-10"
            >
                <GripVertical size={14} />
            </div>

            <div className="p-3 pl-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold text-sm text-cv-text-primary">{meal.name}</h4>
                    {meal.time && (
                        <div className="flex items-center gap-1 text-xs text-cv-text-tertiary bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                            <Clock size={10} />
                            <span>{meal.time}</span>
                        </div>
                    )}
                </div>

                {/* Content Summary */}
                <div className="space-y-1 mb-2">
                    {meal.items.length > 0 ? (
                        meal.items.slice(0, 3).map((item, idx) => (
                            <div key={idx} className="flex justify-between text-xs text-cv-text-secondary">
                                <span className="truncate pr-2">{item.food?.name}</span>
                                <span className="flex-shrink-0 text-cv-text-tertiary">
                                    {item.quantity}{item.unit || 'g'}
                                </span>
                            </div>
                        ))
                    ) : (
                        <p className="text-xs text-cv-text-tertiary italic">Sin alimentos</p>
                    )}
                    {meal.items.length > 3 && (
                        <p className="text-[10px] text-cv-text-tertiary mt-1">+ {meal.items.length - 3} más</p>
                    )}
                </div>

                {/* Footer Macros */}
                <div className="flex items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-700 text-xs">
                    <div className="font-semibold text-cv-text-primary">
                        {Math.round(totalCalories)} <span className="font-normal text-cv-text-tertiary">kcal</span>
                    </div>
                    <div className="text-cv-text-secondary">
                        {Math.round(totalProtein)}g <span className="text-cv-text-tertiary">prot</span>
                    </div>
                </div>
            </div>

            {/* Actions (visible on hover) */}
            <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        duplicateMeal(meal.id);
                        toast.success('Comida duplicada');
                    }}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-cv-text-primary transition-colors"
                    title="Duplicar"
                >
                    <Copy size={12} />
                </button>
                {/* Delete Button */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        // For now immediate delete, maybe add confirm later
                        deleteMeal(meal.id);
                        toast.success('Comida eliminada');
                    }}
                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors"
                    title="Eliminar"
                >
                    <Trash2 size={12} />
                </button>
            </div>
        </div>
    );
}
