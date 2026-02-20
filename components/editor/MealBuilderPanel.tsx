'use client';

import { useDietStore } from '@/lib/store';
import { MealBlockCard } from './MealBlockCard';
import { BlockTypePalette, MEAL_BLOCK_TYPES, PaletteItem } from './BlockTypePalette';
import { MealEditModal } from './MealEditModal';
import { DayGoalsCompactHeader } from './DayGoalsCompactHeader';
import {
    Utensils,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { DndContext, closestCenter, KeyboardSensor, MouseSensor, TouchSensor, useSensor, useSensors, DragEndEvent, DragStartEvent, DragOverlay, useDroppable } from '@dnd-kit/core';
import { createPortal } from 'react-dom';

interface MealBuilderPanelProps {
    dayId: string;
    dayName: string;
    onClose: () => void;
}

export function MealBuilderPanel({ dayId, dayName, onClose }: MealBuilderPanelProps) {
    const {
        days,
        addMeal,
        selectedMealId,
        selectMeal,
        deleteMeal,
        reorderMeals,
        updateDay,
        totalCaloriesDay,
        totalProteinDay
    } = useDietStore();
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // Find the current day
    const currentDay = days.find(d => d.id === dayId);

    // Dnd Sensors
    // Switched to Mouse/Touch sensors to allow onClick to fire on draggables (PointerSensor prevents default)
    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
        useSensor(KeyboardSensor)
    );

    const [activeDragItemType, setActiveDragItemType] = useState<string | null>(null);

    // Drop Zone Logic
    const { setNodeRef: setDroppableRef, isOver } = useDroppable({
        id: 'day-drop-zone',
        data: {
            type: 'DayZone',
            dayId: dayId
        }
    });

    const handleDragStart = (event: DragStartEvent) => {
        if (event.active.data.current?.type === 'NewBlock') {
            setActiveDragItemType(event.active.data.current.blockType);
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        setActiveDragItemType(null); // Clear active drag item

        const { active, over } = event;

        if (!over || !currentDay) return;

        // 1. Drop from Palette (New Block)
        // Ensure active.data.current exists before accessing properties
        if (active.data.current && active.data.current.type === 'NewBlock') {
            const blockTypeId = active.data.current.blockType;
            // Add new meal
            addMeal(dayId, blockTypeId); // Name it after the type
            return;
        }

        // 2. Reorder existing meals
        if (active.id !== over.id && over.id !== 'day-drop-zone') {
            const oldIndex = currentDay.meals.findIndex((m) => m.id === active.id);
            const newIndex = currentDay.meals.findIndex((m) => m.id === over.id);

            if (oldIndex !== -1 && newIndex !== -1) {
                const newOrder = [...currentDay.meals]; // Create shallow copy
                const [moved] = newOrder.splice(oldIndex, 1);
                newOrder.splice(newIndex, 0, moved);
                reorderMeals(dayId, newOrder.map(m => m.id));
            }
        }
    };

    // Open modal when meal selected
    useEffect(() => {
        if (selectedMealId) {
            setIsEditModalOpen(true);
        }
    }, [selectedMealId]);

    useEffect(() => {
        if (!currentDay) return;

        const updates: Record<string, any> = {};
        if (currentDay.target_calories == null) updates.target_calories = 3100;
        if (currentDay.target_protein == null) updates.target_protein = 176;
        if (!currentDay.training_slot) updates.training_slot = 'morning';

        if (Object.keys(updates).length > 0) {
            updateDay(dayId, updates);
        }
    }, [
        dayId,
        currentDay,
        currentDay?.id,
        currentDay?.target_calories,
        currentDay?.target_protein,
        currentDay?.training_slot,
        updateDay
    ]);

    const handleCloseModal = () => {
        setIsEditModalOpen(false);
        selectMeal(null);
    };

    if (!currentDay) return null;

    const targetCalories = currentDay.target_calories ?? 3100;
    const targetProtein = currentDay.target_protein ?? 176;
    const totalCalories = totalCaloriesDay(dayId);
    const totalProtein = totalProteinDay(dayId);
    const caloriesPct = targetCalories > 0 ? (totalCalories / targetCalories) * 100 : 0;
    const proteinPct = targetProtein > 0 ? (totalProtein / targetProtein) * 100 : 0;

    // Sort meals
    const sortedMeals = [...currentDay.meals].sort((a, b) => a.order - b.order);

    const activePaletteType = activeDragItemType ? MEAL_BLOCK_TYPES.find(t => t.id === activeDragItemType) : null;

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter} // Using closestCenter as fallback
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="h-full flex overflow-hidden bg-slate-50 dark:bg-black min-w-0">
                {/* Left: Palette */}
                <div className="hidden md:block shrink-0">
                    <BlockTypePalette onItemClick={(typeId) => {
                        console.log('PANEL: Item Clicked', typeId);
                        addMeal(dayId, typeId);
                    }} />
                </div>

                {/* Right: Builder Area */}
                <div
                    ref={setDroppableRef}
                    id="day-drop-zone"
                    className={`min-w-0 flex-1 flex flex-col h-full overflow-hidden relative transition-colors ${isOver ? 'bg-slate-50 dark:bg-slate-900' : ''}`}
                >
                    <DayGoalsCompactHeader
                        dayLabel={currentDay.name || dayName}
                        targetCalories={targetCalories}
                        targetProtein={targetProtein}
                        trainingSlot={(currentDay.training_slot || 'morning') as 'rest' | 'morning' | 'afternoon' | 'night'}
                        totalCalories={totalCalories}
                        totalProtein={totalProtein}
                        caloriesPct={caloriesPct}
                        proteinPct={proteinPct}
                        onChangeCalories={(value) => updateDay(dayId, { target_calories: value })}
                        onChangeProtein={(value) => updateDay(dayId, { target_protein: value })}
                        onChangeTrainingSlot={(value) => updateDay(dayId, { training_slot: value })}
                    />

                    {/* Drop Zone Content */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {sortedMeals.length > 0 ? (
                            <SortableContext
                                items={sortedMeals.map(m => m.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                <div className="max-w-3xl mx-auto space-y-4 min-h-[500px] pb-20">
                                    {sortedMeals.map(meal => (
                                        <MealBlockCard
                                            key={meal.id}
                                            meal={meal}
                                            isSelected={selectedMealId === meal.id}
                                            onClick={() => selectMeal(meal.id)}
                                            onDelete={(e) => deleteMeal(meal.id)}
                                        />
                                    ))}
                                </div>
                            </SortableContext>
                        ) : (
                            <div className="max-w-3xl mx-auto space-y-4 min-h-[500px] pb-20">
                                <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl h-64 flex flex-col items-center justify-center text-gray-400 pointer-events-none">
                                    <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                                        <Utensils size={24} className="opacity-50" />
                                    </div>
                                    <p className="font-medium">Tu día está vacío</p>
                                    <p className="text-sm opacity-60 mt-1">Arrastra un bloque desde la izquierda para comenzar</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Drag Overlay */}
                {createPortal(
                    <DragOverlay style={{ pointerEvents: 'none', zIndex: 1000 }}>
                        {activePaletteType ? (
                            <div className="w-[280px] cursor-grabbing">
                                <PaletteItem
                                    type={activePaletteType}
                                    className="shadow-2xl scale-105 rotate-2 bg-white pointer-events-none"
                                />
                            </div>
                        ) : null}
                    </DragOverlay>,
                    document.body
                )}

                {/* Edit Modal */}
                {selectedMealId && (
                    <MealEditModal
                        mealId={selectedMealId}
                        isOpen={isEditModalOpen}
                        onClose={handleCloseModal}
                    />
                )}
            </div>
        </DndContext>
    );
}
