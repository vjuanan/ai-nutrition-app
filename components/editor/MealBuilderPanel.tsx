'use client';

import { useDietStore, DraftMeal } from '@/lib/store';
import { MealEditor } from './MealEditor';
import {
    Plus,
    Trash2,
    Utensils,
    Coffee,
    Sun,
    Moon,
    GripVertical
} from 'lucide-react';
import { useState } from 'react';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';

// Sortable Item Wrapper for Vertical List
function SortableMealItem({ meal, isSelected, onClick, onDelete }: { meal: DraftMeal; isSelected: boolean; onClick: () => void; onDelete: (e: React.MouseEvent) => void }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: meal.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 999 : 'auto',
    };

    // Icon based on meal name (simple heuristic)
    let Icon = Utensils;
    const nameLower = meal.name.toLowerCase();
    if (nameLower.includes('desayuno') || nameLower.includes('breakfast')) Icon = Coffee;
    if (nameLower.includes('almuerzo') || nameLower.includes('lunch')) Icon = Sun;
    if (nameLower.includes('cena') || nameLower.includes('dinner')) Icon = Moon;

    const totalCalories = meal.items.reduce((sum, item) => sum + ((item.food?.calories || 0) * item.quantity / (item.food?.serving_size || 100)), 0);

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`
                group relative flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer mb-2
                ${isSelected
                    ? 'bg-white dark:bg-cv-bg-primary border-cv-accent shadow-md ring-1 ring-cv-accent/50'
                    : 'bg-white dark:bg-cv-bg-elevated border-gray-100 dark:border-gray-800 hover:border-cv-accent/30'
                }
            `}
            onClick={onClick}
        >
            {/* Drag Handle */}
            <div {...attributes} {...listeners} className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing">
                <GripVertical size={16} />
            </div>

            {/* Icon */}
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isSelected ? 'bg-cv-accent text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>
                <Icon size={18} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <h4 className={`text-sm font-semibold truncate ${isSelected ? 'text-cv-text-primary' : 'text-cv-text-secondary'}`}>
                    {meal.name}
                </h4>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span>{meal.time || '--:--'}</span>
                    <span>•</span>
                    <span>{Math.round(totalCalories)} kcal</span>
                </div>
            </div>

            {/* Delete Button */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onDelete(e);
                }}
                className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
            >
                <Trash2 size={16} />
            </button>
        </div>
    );
}

interface MealBuilderPanelProps {
    dayId: string;
    dayName: string;
    onClose: () => void;
}

export function MealBuilderPanel({ dayId, dayName, onClose }: MealBuilderPanelProps) {
    const { days, addMeal, selectedMealId, selectMeal, deleteMeal, reorderMeals } = useDietStore();

    // Find the current day
    const currentDay = days.find(d => d.id === dayId);

    // Dnd Sensors
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor)
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (active.id !== over?.id && currentDay) {
            const oldIndex = currentDay.meals.findIndex((m) => m.id === active.id);
            const newIndex = currentDay.meals.findIndex((m) => m.id === over?.id);

            // Reorder in store
            // We need new array of IDs
            const newOrder = [...currentDay.meals];
            const [moved] = newOrder.splice(oldIndex, 1);
            newOrder.splice(newIndex, 0, moved);
            reorderMeals(dayId, newOrder.map(m => m.id));
        }
    };

    if (!currentDay) return null;

    // Sort meals for display (they should already be sorted in store, but safe guard)
    const sortedMeals = [...currentDay.meals].sort((a, b) => a.order - b.order);

    return (
        <div className="h-full flex overflow-hidden bg-gray-50 dark:bg-cv-bg-tertiary/10">
            {/* Left Column: Meal List */}
            <div className="w-[300px] flex-shrink-0 flex flex-col border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-cv-bg-secondary">
                <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                    <h3 className="font-bold text-cv-text-primary">{dayName}</h3>
                    <button
                        onClick={() => addMeal(dayId, "Nueva Comida")}
                        className="p-2 bg-cv-accent/10 text-cv-accent rounded-lg hover:bg-cv-accent/20 transition-colors"
                        title="Añadir comida"
                    >
                        <Plus size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                        modifiers={[restrictToVerticalAxis]}
                    >
                        <SortableContext
                            items={sortedMeals.map(m => m.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            <div className="space-y-2">
                                {sortedMeals.map(meal => (
                                    <SortableMealItem
                                        key={meal.id}
                                        meal={meal}
                                        isSelected={selectedMealId === meal.id}
                                        onClick={() => selectMeal(meal.id)}
                                        onDelete={(e) => deleteMeal(meal.id)}
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>

                    {sortedMeals.length === 0 && (
                        <div className="text-center py-10 text-gray-400">
                            <Utensils size={40} className="mx-auto mb-2 opacity-20" />
                            <p className="text-sm">No hay comidas en este día</p>
                            <button
                                onClick={() => addMeal(dayId, "Desayuno")}
                                className="mt-4 text-xs text-cv-accent font-medium hover:underline"
                            >
                                Crear desayuno
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Right Column: Editor */}
            <div className="flex-1 overflow-hidden relative">
                {selectedMealId ? (
                    <MealEditor mealId={selectedMealId} />
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 text-gray-400">
                        <Utensils size={48} className="mb-4 text-gray-200 dark:text-gray-700" />
                        <h3 className="text-lg font-medium text-cv-text-primary mb-1">Selecciona una comida</h3>
                        <p className="text-sm">o crea una nueva desde el panel izquierdo</p>
                    </div>
                )}
            </div>
        </div>
    );
}
