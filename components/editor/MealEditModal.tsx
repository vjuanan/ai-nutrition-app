'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useDietStore, DraftMeal } from '@/lib/store';
import { FoodAutocomplete } from './FoodAutocomplete';
import { Trash2, X, Plus, Clock, ChevronDown, Check, Flame } from 'lucide-react';
import { toast } from 'sonner';

interface MealEditModalProps {
    mealId: string;
    isOpen: boolean;
    onClose: () => void;
}

export function MealEditModal({ mealId, isOpen, onClose }: MealEditModalProps) {
    const { days, updateMeal, addItemToMeal, removeItemFromMeal, updateItemInMeal, deleteMeal } = useDietStore();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    // Find the meal
    let meal: DraftMeal | null = null;
    let dayId: string | null = null;

    // Efficient lookup? Not really, but array is small
    for (const day of days) {
        const found = day.meals.find(m => m.id === mealId);
        if (found) {
            meal = found;
            dayId = day.id;
            break;
        }
    }

    if (!isOpen || !mounted || !meal) return null;

    // Derived Macros
    const totalCalories = meal.items.reduce((sum, item) => sum + ((item.food?.calories || 0) * item.quantity / (item.food?.serving_size || 100)), 0);
    const totalProtein = meal.items.reduce((sum, item) => sum + ((item.food?.protein || 0) * item.quantity / (item.food?.serving_size || 100)), 0);
    const totalCarbs = meal.items.reduce((sum, item) => sum + ((item.food?.carbs || 0) * item.quantity / (item.food?.serving_size || 100)), 0);
    const totalFats = meal.items.reduce((sum, item) => sum + ((item.food?.fats || 0) * item.quantity / (item.food?.serving_size || 100)), 0);

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={onClose}
            ></div>

            {/* Modal Content */}
            <div className="relative bg-white dark:bg-cv-bg-primary w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800">

                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                    <div>
                        <input
                            type="text"
                            value={meal.name}
                            onChange={(e) => updateMeal(mealId, { name: e.target.value })}
                            className="bg-transparent text-xl font-bold text-gray-900 dark:text-gray-100 border-none p-0 focus:ring-0 placeholder:text-gray-400"
                            placeholder="Nombre de la comida"
                        />
                        <div className="flex items-center gap-2 mt-1">
                            <Clock size={14} className="text-gray-400" />
                            <input
                                type="time"
                                value={meal.time || ''}
                                onChange={(e) => updateMeal(mealId, { time: e.target.value })}
                                className="bg-transparent text-sm text-gray-500 border-none p-0 focus:ring-0"
                            />
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors text-gray-400 hover:text-gray-600"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Macros Ribbon */}
                <div className="px-6 py-3 bg-slate-50 dark:bg-cv-bg-secondary border-b border-slate-100 dark:border-slate-800 flex justify-around">
                    <MacroBadge label="Kcal" value={Math.round(totalCalories)} unit="" color="text-gray-600" />
                    <MacroBadge label="Proteína" value={Math.round(totalProtein)} unit="g" color="text-blue-600" />
                    <MacroBadge label="Carbos" value={Math.round(totalCarbs)} unit="g" color="text-green-600" />
                    <MacroBadge label="Grasas" value={Math.round(totalFats)} unit="g" color="text-yellow-600" />
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">

                    {/* Add Food Search */}
                    <div className="relative">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">
                            Añadir Alimento
                        </label>
                        <FoodAutocomplete
                            value=""
                            onChange={() => { }}
                            onSelect={(food) => {
                                const defaultQty = food.serving_size || 100;
                                addItemToMeal(mealId, food, defaultQty, food.unit || 'g');
                            }}
                            placeholder="Buscar alimento (ej. Pollo, Arroz, Huevo)..."
                            className="w-full p-4 pl-12 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm focus:ring-2 focus:ring-cv-accent focus:border-transparent transition-all text-base"
                        />
                        {/* Search Icon positioned by the component, or we can wrap if needed, but component handles it */}
                    </div>

                    {/* Food Items List */}
                    <div className="space-y-3">
                        {meal.items.length === 0 ? (
                            <div className="text-center py-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                                <Flame size={32} className="mx-auto text-gray-300 mb-2" />
                                <p className="text-gray-400 text-sm">No hay alimentos agregados.</p>
                            </div>
                        ) : (
                            meal.items.map((item, index) => (
                                <MealItemCard
                                    key={item.id || index}
                                    item={item}
                                    onUpdate={(updates) => updateItemInMeal(mealId, index, updates)}
                                    onRemove={() => removeItemFromMeal(mealId, item.id)}
                                />
                            ))
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 flex justify-between items-center">
                    <button
                        onClick={() => {
                            if (window.confirm('¿Seguro que deseas eliminar esta comida?')) {
                                deleteMeal(mealId);
                                onClose();
                            }
                        }}
                        className="text-red-500 hover:text-red-700 text-sm font-medium flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors"
                    >
                        <Trash2 size={16} />
                        Eliminar Comida
                    </button>

                    <button
                        onClick={onClose}
                        className="bg-cv-accent hover:bg-cv-accent/90 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-cv-accent/20 transition-all transform hover:scale-105"
                    >
                        <Check size={18} />
                        Listo
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}

// Sub-components

function MacroBadge({ label, value, unit, color }: { label: string, value: number, unit: string, color: string }) {
    return (
        <div className="flex flex-col items-center">
            <span className="text-[10px] uppercase font-bold text-gray-400">{label}</span>
            <span className={`text-lg font-bold ${color}`}>{value}<span className="text-xs text-gray-400 ml-0.5">{unit}</span></span>
        </div>
    );
}

function MealItemCard({ item, onUpdate, onRemove }: { item: any, onUpdate: (updates: any) => void, onRemove: () => void }) {
    // Quick select options based on unit
    const quickAmounts = item.unit === 'g' || item.unit === 'ml'
        ? [50, 100, 150, 200]
        : [0.5, 1, 1.5, 2];

    return (
        <div className="bg-white dark:bg-cv-bg-secondary rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 relative group">
            <button
                onClick={onRemove}
                className="absolute top-2 right-2 p-1.5 text-gray-300 hover:text-red-500 rounded-lg hover:bg-slate-50 transition-colors opacity-0 group-hover:opacity-100"
            >
                <X size={16} />
            </button>

            <div className="flex gap-4">
                {/* Food Name & Info */}
                <div className="flex-1">
                    <h4 className="font-bold text-gray-900 dark:text-gray-100">{item.food?.name}</h4>
                    <div className="text-xs text-gray-500 mb-3 flex gap-2">
                        <span>{Math.round((item.food?.calories || 0) * item.quantity / (item.food?.serving_size || 100))} kcal</span>
                        <span className="text-gray-300">•</span>
                        <span>{item.food?.brand || 'Genérico'}</span>
                    </div>

                    {/* Controls Row */}
                    <div className="flex items-center gap-4">
                        {/* Quantity Input Group */}
                        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                            <input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => onUpdate({ quantity: Number(e.target.value) })}
                                className="w-16 bg-transparent text-center font-bold border-none focus:ring-0 p-1 text-sm"
                            />
                            <span className="text-xs font-medium text-gray-500 pr-2">{item.unit || 'g'}</span>
                        </div>

                        {/* Quick Select Buttons */}
                        <div className="flex gap-1">
                            {quickAmounts.map(amt => (
                                <button
                                    key={amt}
                                    onClick={() => onUpdate({ quantity: amt })}
                                    className={`
                                        px-2 py-1 text-xs rounded-md transition-colors border
                                        ${item.quantity === amt
                                            ? 'bg-cv-accent text-white border-cv-accent'
                                            : 'bg-white dark:bg-slate-800 text-gray-500 border-slate-200 hover:border-cv-accent/50'
                                        }
                                    `}
                                >
                                    {amt}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Notes/Protocol Input (Optional expansion) */}
            <div className="mt-3 pt-3 border-t border-slate-50 dark:border-slate-800/50">
                <input
                    type="text"
                    placeholder="Notas o protocolo (opcional)..."
                    className="w-full text-xs bg-transparent border-none p-0 focus:ring-0 text-gray-500 placeholder:text-gray-300"
                />
            </div>
        </div>
    );
}
