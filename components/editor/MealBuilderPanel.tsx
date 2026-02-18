'use client';

import { useDietStore, DraftMeal } from '@/lib/store';
import { MealBlockCard } from './MealBlockCard';
import { BlockTypePalette, MEAL_BLOCK_TYPES, PaletteItem } from './BlockTypePalette';
import { MealEditModal } from './MealEditModal';
import {
    Plus,
    Trash2,
    Utensils,
    Coffee,
    Sun,
    Moon,
    GripVertical,
    ChevronRight
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, DragStartEvent, DragOverlay, useDroppable, pointerWithin, rectIntersection } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { createPortal } from 'react-dom';

interface MealBuilderPanelProps {
    dayId: string;
    dayName: string;
    onClose: () => void;
}

export function MealBuilderPanel({ dayId, dayName, onClose }: MealBuilderPanelProps) {
    const { days, addMeal, selectedMealId, selectMeal, deleteMeal, reorderMeals } = useDietStore();
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // Find the current day
    const currentDay = days.find(d => d.id === dayId);

    // Dnd Sensors
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
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

        console.log('--- DND DEBUG ---');
        console.log('active:', active);
        console.log('over:', over);
        console.log('active.data.current:', active.data.current);
        console.log('currentDay:', currentDay);

        if (!over || !currentDay) {
            console.log('DND: Returned because over or currentDay is missing');
            return;
        }

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

    const handleCloseModal = () => {
        setIsEditModalOpen(false);
        selectMeal(null);
    };

    if (!currentDay) return null;

    // Sort meals
    const sortedMeals = [...currentDay.meals].sort((a, b) => a.order - b.order);

    const activePaletteType = activeDragItemType ? MEAL_BLOCK_TYPES.find(t => t.id === activeDragItemType) : null;

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={rectIntersection} // Use rectIntersection for better container dropping
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="h-full flex overflow-hidden bg-slate-50 dark:bg-black">
                {/* Left: Palette */}
                <BlockTypePalette />

                {/* Right: Builder Area */}
                <div
                    ref={setDroppableRef}
                    id="day-drop-zone"
                    className={`flex-1 flex flex-col h-full overflow-hidden relative transition-colors ${isOver ? 'bg-slate-50 dark:bg-slate-900' : ''}`}
                >

                    {/* Drop Zone Content */}
                    <div
                        className="flex-1 overflow-y-auto p-6"
                    >
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

                                {sortedMeals.length === 0 && (
                                    <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl h-64 flex flex-col items-center justify-center text-gray-400 pointer-events-none">
                                        <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                                            <Utensils size={24} className="opacity-50" />
                                        </div>
                                        <p className="font-medium">Tu día está vacío</p>
                                        <p className="text-sm opacity-60 mt-1">Arrastra un bloque desde la izquierda para comenzar</p>
                                    </div>
                                )}
                            </div>
                        </SortableContext>
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
