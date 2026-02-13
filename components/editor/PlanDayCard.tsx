'use client';

import { useDietStore, DraftDay } from '@/lib/store';
import { MealCard } from './MealCard';
import { Plus, MoreHorizontal, Trash2, Copy, Moon, Sun, MonitorSmartphone } from 'lucide-react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import * as Popover from '@radix-ui/react-popover';
import { toast } from 'sonner';

interface PlanDayCardProps {
    day: DraftDay;
    dayName: string;
    compact?: boolean;
}

export function PlanDayCard({ day, dayName, compact = false }: PlanDayCardProps) {
    const { addMeal, selectedDayId, selectDay, updateDay, enterMealBuilder } = useDietStore();

    const { isOver, setNodeRef } = useDroppable({
        id: `day-${day.id}`,
    });

    const isSelected = selectedDayId === day.id;

    // Macro Totals for Day
    const dayCalories = day.meals.reduce((total, meal) => total + meal.items.reduce((sum, item) => sum + ((item.food?.calories || 0) * item.quantity / (item.food?.serving_size || 100)), 0), 0);
    const dayProtein = day.meals.reduce((total, meal) => total + meal.items.reduce((sum, item) => sum + ((item.food?.protein || 0) * item.quantity / (item.food?.serving_size || 100)), 0), 0);

    return (
        <div
            ref={setNodeRef}
            className={`
                h-full flex flex-col p-4 rounded-xl border transition-all duration-200
                ${isSelected
                    ? 'bg-white dark:bg-cv-bg-secondary border-cv-accent shadow-lg ring-1 ring-cv-accent'
                    : 'bg-white dark:bg-cv-bg-elevated border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }
                ${isOver ? 'ring-2 ring-emerald-500 bg-emerald-50/20' : ''}
            `}
            onClick={() => selectDay(day.id)}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                <div>
                    <h3 className={`text-base font-bold ${isSelected ? 'text-cv-text-primary' : 'text-cv-text-secondary'}`}>
                        {dayName}
                    </h3>
                    <div className="flex gap-2 text-xs mt-1">
                        <span className="font-semibold text-cv-text-primary">{Math.round(dayCalories)} kcal</span>
                        <span className="text-cv-text-tertiary">/</span>
                        <span className="font-medium text-cv-text-secondary">{Math.round(dayProtein)}g prot</span>
                    </div>
                </div>

                {/* Actions Menu */}
                <Popover.Root>
                    <Popover.Trigger asChild>
                        <button
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-cv-text-tertiary transition-colors"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <MoreHorizontal size={16} />
                        </button>
                    </Popover.Trigger>
                    <Popover.Portal>
                        <Popover.Content className="z-50 min-w-[160px] bg-white dark:bg-cv-bg-secondary rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-1 animate-in fade-in zoom-in-95 duration-200" sideOffset={5}>
                            <button className="w-full flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-left transition-colors">
                                <Copy size={13} /> Copiar día
                            </button>
                            <button className="w-full flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-left transition-colors text-red-500">
                                <Trash2 size={13} /> Limpiar día
                            </button>
                        </Popover.Content>
                    </Popover.Portal>
                </Popover.Root>
            </div>

            {/* Meals List */}
            <div className="flex-1 overflow-y-auto space-y-3 -mx-2 px-2 pb-2">
                <SortableContext
                    items={day.meals.map(m => m.id)}
                    strategy={verticalListSortingStrategy}
                >
                    {day.meals.map(meal => (
                        <MealCard key={meal.id} meal={meal} />
                    ))}
                </SortableContext>

                {/* Empty State / Add Button */}
                {day.meals.length === 0 ? (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            addMeal(day.id, "Desayuno");
                            enterMealBuilder(day.id);
                        }}
                        className="w-full h-24 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl flex flex-col items-center justify-center text-cv-text-tertiary hover:border-cv-accent hover:text-cv-accent hover:bg-cv-accent/5 transition-all"
                    >
                        <Plus size={24} className="mb-1 opacity-50" />
                        <span className="text-xs font-medium">Añadir Comida</span>
                    </button>
                ) : (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            addMeal(day.id, "Nueva Comida");
                        }}
                        className="w-full py-2 border border-dashed border-slate-200 dark:border-slate-700 rounded-lg text-xs text-cv-text-tertiary hover:text-cv-text-primary hover:border-slate-300 transition-colors flex items-center justify-center gap-1"
                    >
                        <Plus size={12} /> Añadir otra comida
                    </button>
                )}
            </div>

            {/* Quick Actions Footer */}
            {day.meals.length > 0 && (
                <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-center">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            enterMealBuilder(day.id);
                        }}
                        className="text-xs font-bold text-cv-accent hover:underline flex items-center gap-1"
                    >
                        <MonitorSmartphone size={12} />
                        Abrir Editor Completo
                    </button>
                </div>
            )}
        </div>
    );
}
