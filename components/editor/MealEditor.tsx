'use client';

import { useState, useEffect } from 'react';
import { useDietStore, DraftMeal } from '@/lib/store';
import { FoodAutocomplete } from './FoodAutocomplete';
import { Trash2, Clock, Plus, Flame, Info } from 'lucide-react';
import { createFood } from '@/lib/actions';
import { toast } from 'sonner';

interface MealEditorProps {
    mealId: string;
}

export function MealEditor({ mealId }: MealEditorProps) {
    const { days, updateMeal, addItemToMeal, removeItemFromMeal, updateItemInMeal } = useDietStore();

    // Find the meal
    let meal: DraftMeal | null = null;
    let dayId: string | null = null;

    for (const day of days) {
        const found = day.meals.find(m => m.id === mealId);
        if (found) {
            meal = found;
            dayId = day.id;
            break;
        }
    }

    if (!meal) return <div className="p-4 text-center text-cv-text-tertiary">Comida no encontrada</div>;

    // Derived state for macros
    const totalCalories = meal.items.reduce((sum, item) => sum + ((item.food?.calories || 0) * item.quantity / (item.food?.serving_size || 100)), 0);
    const totalProtein = meal.items.reduce((sum, item) => sum + ((item.food?.protein || 0) * item.quantity / (item.food?.serving_size || 100)), 0);
    const totalCarbs = meal.items.reduce((sum, item) => sum + ((item.food?.carbs || 0) * item.quantity / (item.food?.serving_size || 100)), 0);
    const totalFats = meal.items.reduce((sum, item) => sum + ((item.food?.fats || 0) * item.quantity / (item.food?.serving_size || 100)), 0);

    return (
        <div className="h-full flex flex-col bg-white dark:bg-cv-bg-secondary">
            {/* Header */}
            <div className="flex-shrink-0 p-4 border-b border-gray-100 dark:border-gray-800">
                <div className="space-y-3">
                    <input
                        type="text"
                        value={meal.name}
                        onChange={(e) => updateMeal(mealId, { name: e.target.value })}
                        className="w-full text-lg font-bold bg-transparent border-none focus:ring-0 p-0 text-cv-text-primary placeholder:text-cv-text-tertiary"
                        placeholder="Nombre de la comida (ej. Desayuno)"
                    />
                    <div className="flex items-center gap-2 text-cv-text-secondary">
                        <Clock size={16} />
                        <input
                            type="time"
                            value={meal.time || ''}
                            onChange={(e) => updateMeal(mealId, { time: e.target.value })}
                            className="bg-transparent border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-sm focus:ring-cv-accent focus:border-cv-accent"
                        />
                    </div>
                </div>

                {/* Macros Summary Panel */}
                <div className="mt-4 grid grid-cols-4 gap-2">
                    <div className="bg-gray-50 dark:bg-gray-800/50 p-2 rounded-lg text-center">
                        <div className="text-xs text-gray-500 uppercase font-bold">Kcal</div>
                        <div className="font-bold text-cv-text-primary">{Math.round(totalCalories)}</div>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg text-center">
                        <div className="text-xs text-blue-500 uppercase font-bold">Prot</div>
                        <div className="font-bold text-blue-700 dark:text-blue-300">{Math.round(totalProtein)}g</div>
                    </div>
                    <div className="bg-orange-50 dark:bg-orange-900/20 p-2 rounded-lg text-center">
                        <div className="text-xs text-orange-500 uppercase font-bold">Carbs</div>
                        <div className="font-bold text-orange-700 dark:text-orange-300">{Math.round(totalCarbs)}g</div>
                    </div>
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded-lg text-center">
                        <div className="text-xs text-yellow-500 uppercase font-bold">Grasas</div>
                        <div className="font-bold text-yellow-700 dark:text-yellow-300">{Math.round(totalFats)}g</div>
                    </div>
                </div>
            </div>

            {/* List of Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {meal.items.length === 0 ? (
                    <div className="text-center py-10 opacity-50">
                        <Flame size={48} className="mx-auto mb-2 text-gray-300" />
                        <p className="text-sm">No hay alimentos en esta comida</p>
                    </div>
                ) : (
                    meal.items.map((item, index) => (
                        <div key={item.id || index} className="group flex items-center gap-3 p-3 bg-white dark:bg-cv-bg-elevated border border-gray-100 dark:border-gray-700 rounded-xl shadow-sm hover:border-cv-accent/50 transition-all">

                            {/* Quantity Input */}
                            <div className="flex flex-col items-center w-16">
                                <input
                                    type="number"
                                    value={item.quantity}
                                    onChange={(e) => updateItemInMeal(mealId, index, { quantity: Number(e.target.value) })}
                                    className="w-full text-center font-bold bg-transparent border-b border-gray-200 focus:border-cv-accent focus:ring-0 text-sm p-1"
                                />
                                <span className="text-[10px] text-gray-500">{item.unit || item.food?.unit || 'g'}</span>
                            </div>

                            {/* Food Info */}
                            <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm truncate text-cv-text-primary">{item.food?.name || "Alimento desconocido"}</div>
                                <div className="flex gap-2 text-[10px] text-gray-500">
                                    <span>{Math.round((item.food?.calories || 0) * item.quantity / (item.food?.serving_size || 100))} kcal</span>
                                    {item.food?.brand && <span className="text-cv-accent">{item.food?.brand}</span>}
                                </div>
                            </div>

                            {/* Actions */}
                            <button
                                onClick={() => removeItemFromMeal(mealId, item.id)}
                                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))
                )}

                {/* Add Item Form */}
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Añadir Alimento</p>
                    <FoodAutocomplete
                        value=""
                        onChange={() => { }} // Internal state handled
                        onSelect={(food) => {
                            // Default to serving size or 100g/1 unit
                            const defaultQty = food.serving_size || 100;
                            addItemToMeal(mealId, food, defaultQty, food.unit);
                        }}
                        placeholder="Buscar o crear alimento..."
                        className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-lg text-sm"
                    />
                    <div className="mt-1 flex justify-end">
                        <button className="text-xs text-cv-accent hover:underline flex items-center gap-1">
                            <Plus size={12} /> Crear nuevo alimento (WIP)
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
