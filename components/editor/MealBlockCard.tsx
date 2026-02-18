'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, MoreHorizontal, Trash2 } from 'lucide-react';
import { DraftMeal } from '@/lib/store';
import { MEAL_BLOCK_TYPES } from './BlockTypePalette';
import { Utensils } from 'lucide-react';

interface MealBlockCardProps {
    meal: DraftMeal;
    isSelected: boolean;
    onClick: () => void;
    onDelete: (e: React.MouseEvent) => void;
}

export function MealBlockCard({ meal, isSelected, onClick, onDelete }: MealBlockCardProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: meal.id,
        data: {
            type: 'Meal',
            meal
        }
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
        zIndex: isDragging ? 999 : 'auto',
    };

    // Determine type for styling
    // We try to match the name with one of our types, or default to generic
    const blockType = MEAL_BLOCK_TYPES.find(t => meal.name.includes(t.id) || t.label === meal.name)
        || MEAL_BLOCK_TYPES.find(t => t.id === 'Colación')!; // Default fallback (green)

    // Macros
    const totalCalories = meal.items.reduce((sum, item) => sum + ((item.food?.calories || 0) * item.quantity / (item.food?.serving_size || 100)), 0);
    const totalProtein = meal.items.reduce((sum, item) => sum + ((item.food?.protein || 0) * item.quantity / (item.food?.serving_size || 100)), 0);

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`
                group relative flex items-center gap-4 p-4 rounded-xl border-l-[6px] shadow-sm transition-all cursor-pointer mb-3
                bg-white dark:bg-cv-bg-elevated
                ${isSelected
                    ? `ring-2 ring-offset-2 ${blockType.ring} shadow-md transform scale-[1.01]`
                    : 'border-slate-100 dark:border-slate-800 hover:shadow-md hover:translate-x-1'
                }
            `}
        // Apply border color dynamically via style or class if mapped
        // Since we have tailwind classes in the object, we need to map them to border colors or use style
        // The object has 'bg-rose-50' etc. Let's try to extract relevant border color or just hardcode specific style for the left border
        // Actually, we can just use the 'text-color' class for the border-l color if we map it
        // Simple approach: Map IDs to border colors
        >
            {/* Left Border Color Line */}
            <div className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-xl ${blockType.className.replace('bg-', 'bg-').replace('border-', 'bg-').split(' ')[2].replace('text-', 'bg-')}`}></div>

            {/* Drag Handle */}
            <div {...attributes} {...listeners} className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing pl-2">
                <GripVertical size={20} />
            </div>

            {/* Icon */}
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${blockType.className}`}>
                <blockType.icon size={24} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0" onClick={onClick}>
                <div className="flex items-center justify-between mb-1">
                    <h4 className={`font-bold text-base ${isSelected ? 'text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300'}`}>
                        {meal.name}
                    </h4>
                    {/* Macros Badge */}
                    <div className="flex items-center gap-3 text-xs font-mono">
                        <span className="font-bold text-gray-700 dark:text-gray-300">{Math.round(totalCalories)} kcal</span>
                        <span className="text-gray-400">|</span>
                        <span className="font-medium text-gray-500">{Math.round(totalProtein)}g P</span>
                    </div>
                </div>

                {/* Items Summary */}
                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {meal.items.length > 0
                        ? meal.items.map(i => i.food?.name).join(', ')
                        : <span className="italic opacity-50">Sin alimentos...</span>
                    }
                </div>
            </div>

            {/* Hover Actions */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onDelete(e);
                }}
                className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
            >
                <Trash2 size={18} />
            </button>
        </div>
    );
}
