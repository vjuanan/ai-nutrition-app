'use client';

import React, { useState } from 'react';
import { useApp } from '@/lib/context/AppContext';
import { Utensils, Plus, Trash2, BookOpen, Apple, Info, Check, Save, Printer, ClipboardList, Users } from 'lucide-react';
import PrintablePlan from '@/components/builder/PrintablePlan';

export default function BuilderPage() {
    const { foods, recipes, currentPlan, setCurrentPlan, patients, activePatientId, setActivePatientId, shoppingList, allClinics, savePlanForPatient } = useApp();
    const [selectedDayId, setSelectedDayId] = useState('day_1');
    const [selectedWeek, setSelectedWeek] = useState(1);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [activeTargetMealId, setActiveTargetMealId] = useState<string | null>(null);
    const [selectedClinicId, setSelectedClinicId] = useState(currentPlan?.clinicId || '');

    const activePatient = patients.find((p) => p.id === activePatientId) || patients[0] || {
        id: 'fallback_patient',
        name: 'Seleccionar Paciente',
        email: 'paciente@ainutri.com',
        phone: '',
        objective: 'Pérdida de grasa',
        adherence: 100,
        planName: '',
        status: 'active',
        intakeCompleted: true,
        weight: 70,
        height: 170,
        activityLevel: 'Moderadamente activo',
        dietType: 'Omnívora',
        allergies: 'Ninguna',
        bodyFat: 15
    };

    const activeDay = (currentPlan?.days || []).find((d) => d.id === selectedDayId) || (currentPlan?.days || [])[0] || {
        id: 'day_1',
        dayNumber: 1,
        name: 'Lunes - Día de Fuerza',
        isRefeed: false,
        meals: [],
        notes: ''
    };

    // ==========================================
    // CÁLCULO DE MACROS Y CALORÍAS DEL DÍA
    // ==========================================
    const calculateDayMacros = () => {
        let calories = 0;
        let protein = 0;
        let carbs = 0;
        let fat = 0;

        activeDay.meals.forEach((meal) => {
            meal.items.forEach((item) => {
                if (item.foodId) {
                    const food = foods.find((f) => f.id === item.foodId);
                    if (food) {
                        const qtyGrams = parseFloat(item.qty) || 0;
                        protein += (food.protein * qtyGrams) / 100;
                        carbs += (food.carbs * qtyGrams) / 100;
                        fat += (food.fat * qtyGrams) / 100;
                        calories += (food.calories * qtyGrams) / 100;
                    }
                } else if (item.recipeId) {
                    const recipe = recipes.find((r) => r.id === item.recipeId);
                    if (recipe) {
                        protein += recipe.protein;
                        carbs += recipe.carbs;
                        fat += recipe.fat;
                        calories += recipe.calories;
                    }
                }
            });
        });

        return {
            calories: Math.round(calories),
            protein: Math.round(protein),
            carbs: Math.round(carbs),
            fat: Math.round(fat)
        };
    };

    const dayMacros = calculateDayMacros();

    // ==========================================
    // ACCIONES REACTIVAS DEL BUILDER
    // ==========================================
    const addMeal = () => {
        const newMeal = {
            id: `meal_${Date.now()}`,
            type: 'colacion' as const,
            name: 'Nueva colación',
            time: '17:00 HS',
            items: []
        };

        const updatedDays = currentPlan.days.map((day) => {
            if (day.id === selectedDayId) {
                return {
                    ...day,
                    meals: [...day.meals, newMeal]
                };
            }
            return day;
        });

        setCurrentPlan({
            ...currentPlan,
            days: updatedDays
        });
    };

    const removeMeal = (mealId: string) => {
        const updatedDays = currentPlan.days.map((day) => {
            if (day.id === selectedDayId) {
                return {
                    ...day,
                    meals: day.meals.filter((m) => m.id !== mealId)
                };
            }
            return day;
        });

        setCurrentPlan({
            ...currentPlan,
            days: updatedDays
        });
    };

    const addItemToMeal = (mealId: string, type: 'food' | 'recipe', itemId: string) => {
        const newItem = {
            id: `item_${Date.now()}`,
            foodId: type === 'food' ? itemId : undefined,
            recipeId: type === 'recipe' ? itemId : undefined,
            qty: type === 'food' ? '100' : '1 porción'
        };

        const updatedDays = currentPlan.days.map((day) => {
            if (day.id === selectedDayId) {
                return {
                    ...day,
                    meals: day.meals.map((meal) => {
                        if (meal.id === mealId) {
                            return {
                                ...meal,
                                items: [...meal.items, newItem]
                            };
                        }
                        return meal;
                    })
                };
            }
            return day;
        });

        setCurrentPlan({
            ...currentPlan,
            days: updatedDays
        });
    };

    const removeItemFromMeal = (mealId: string, itemId: string) => {
        const updatedDays = currentPlan.days.map((day) => {
            if (day.id === selectedDayId) {
                return {
                    ...day,
                    meals: day.meals.map((meal) => {
                        if (meal.id === mealId) {
                            return {
                                ...meal,
                                items: meal.items.filter((item) => item.id !== itemId)
                            };
                        }
                        return meal;
                    })
                };
            }
            return day;
        });

        setCurrentPlan({
            ...currentPlan,
            days: updatedDays
        });
    };

    const updateItemQty = (mealId: string, itemId: string, qty: string) => {
        const updatedDays = currentPlan.days.map((day) => {
            if (day.id === selectedDayId) {
                return {
                    ...day,
                    meals: day.meals.map((meal) => {
                        if (meal.id === mealId) {
                            return {
                                ...meal,
                                items: meal.items.map((item) => {
                                    if (item.id === itemId) {
                                        return { ...item, qty };
                                    }
                                    return item;
                                })
                            };
                        }
                        return meal;
                    })
                };
            }
            return day;
        });

        setCurrentPlan({
            ...currentPlan,
            days: updatedDays
        });
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header / Selector de Paciente - Ultra-Compacto con Iconos */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white border border-olive-200 p-3 px-5 rounded-2xl shadow-cv-sm">
                <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-olive-50 text-olive-800">
                        <BookOpen size={16} />
                    </span>
                    <h1 className="text-sm font-black text-slate-800 uppercase tracking-wider">Builder Nutricional</h1>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Selector de Paciente */}
                    <div className="flex items-center gap-2 bg-olive-50/50 p-1 px-2.5 rounded-xl border border-olive-200/40">
                        <span className="text-slate-400" title="Paciente asignado">
                            <Users size={14} />
                        </span>
                        <select
                            value={activePatientId}
                            onChange={(e) => {
                                setActivePatientId(e.target.value);
                                setSelectedDayId('day_1');
                                setActiveTargetMealId(null);
                            }}
                            className="bg-transparent focus:outline-none text-[11px] font-bold text-slate-700 w-36 cursor-pointer"
                        >
                            {patients.map((p) => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Selector de Consultorio */}
                    <div className="flex items-center gap-2 bg-olive-50/50 p-1 px-2.5 rounded-xl border border-olive-200/40">
                        <span className="text-slate-400" title="Asociar a consultorio / clínica">
                            <ClipboardList size={14} />
                        </span>
                        <select
                            value={selectedClinicId}
                            onChange={(e) => setSelectedClinicId(e.target.value)}
                            className="bg-transparent focus:outline-none text-[11px] font-bold text-slate-700 w-36 cursor-pointer"
                        >
                            <option value="">Compartir con...</option>
                            {allClinics?.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="h-5 w-px bg-olive-200 hidden sm:block" />

                    {/* Botones de Acción de Icono Único */}
                    <button 
                        onClick={() => window.print()}
                        title="Exportar PDF / Imprimir"
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-olive-200 bg-white text-olive-800 hover:bg-olive-50 transition shadow-cv-sm"
                    >
                        <Printer size={16} />
                    </button>

                    <button 
                        onClick={async () => {
                            setSaveSuccess(true);
                            await savePlanForPatient(activePatientId, {
                                ...currentPlan,
                                clinicId: selectedClinicId || undefined
                            });
                            setTimeout(() => setSaveSuccess(false), 2000);
                        }}
                        title="Guardar Plan en Supabase"
                        className="flex h-9 w-9 items-center justify-center rounded-xl bg-olive-800 text-white hover:bg-olive-700 transition shadow-cv-sm"
                    >
                        {saveSuccess ? (
                            <Check size={16} className="animate-bounce" />
                        ) : (
                            <Save size={16} />
                        )}
                    </button>
                </div>
            </div>


            {/* Target de macros interactivo - Ultra-Compacto */}
            <div className="rounded-2xl border border-olive-200 bg-white p-4 shadow-cv-sm">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div>
                            <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider">{currentPlan.name}</h2>
                            <div className="flex gap-1.5 mt-1.5">
                                {[1, 2, 3, 4].map((w) => (
                                    <button
                                        key={w}
                                        onClick={() => setSelectedWeek(w)}
                                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition ${
                                            selectedWeek === w
                                                ? 'bg-olive-800 text-white border-olive-800 shadow-cv-sm'
                                                : 'bg-white text-slate-500 border-olive-200 hover:bg-olive-50'
                                        }`}
                                    >
                                        S{w}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Macros recalculados en tiempo real - Súper Delgados */}
                    <div className="grid grid-cols-4 gap-3 font-mono text-center">
                        <div className="bg-olive-50/50 px-3.5 py-1.5 rounded-xl border border-olive-200/40">
                            <span className="block text-[8px] font-bold text-slate-400 font-sans uppercase">Calorías</span>
                            <span className="text-xs font-black text-olive-800">{dayMacros.calories}</span>
                        </div>
                        <div className="bg-olive-50/50 px-3.5 py-1.5 rounded-xl border border-olive-200/40">
                            <span className="block text-[8px] font-bold text-slate-400 font-sans uppercase">Proteínas</span>
                            <span className="text-xs font-black text-slate-800">{dayMacros.protein}g</span>
                        </div>
                        <div className="bg-olive-50/50 px-3.5 py-1.5 rounded-xl border border-olive-200/40">
                            <span className="block text-[8px] font-bold text-slate-400 font-sans uppercase">Carbs</span>
                            <span className="text-xs font-black text-amber-600">{dayMacros.carbs}g</span>
                        </div>
                        <div className="bg-olive-50/50 px-3.5 py-1.5 rounded-xl border border-olive-200/40">
                            <span className="block text-[8px] font-bold text-slate-400 font-sans uppercase">Grasas</span>
                            <span className="text-xs font-black text-rose-500">{dayMacros.fat}g</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Split layout: Selector de día, editor y barra lateral de alimentos */}
            <div className="grid gap-6 lg:grid-cols-[0.5fr_1.8fr_1.1fr]">
                {/* Selector de días */}
                <div className="space-y-1.5">
                    {currentPlan.days.map((day) => (
                        <button
                            key={day.id}
                            onClick={() => setSelectedDayId(day.id)}
                            className={`w-full text-left px-3 py-2 rounded-xl text-[11px] font-black transition duration-200 border ${
                                selectedDayId === day.id
                                    ? 'bg-olive-800 text-white border-olive-800 shadow-cv-sm'
                                    : 'bg-white text-slate-700 border-olive-200 hover:bg-olive-50/50 hover:text-slate-900'
                            }`}
                        >
                            {day.name}
                        </button>

                    ))}
                    <button className="w-full flex items-center justify-center gap-1.5 px-3 py-2 border border-dashed border-olive-300 text-olive-800 rounded-xl text-[11px] font-bold hover:bg-white transition">
                        <Plus size={12} />
                        Añadir Día
                    </button>
                </div>

                {/* Editor principal de comidas */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center bg-white border border-olive-200 px-5 py-3 rounded-2xl shadow-cv-sm">
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">{activeDay.name}</h3>
                        <button
                            onClick={addMeal}
                            className="cv-btn-accent h-8 px-3 text-[10px] rounded-xl flex items-center gap-1.5"
                        >
                            <Plus size={12} />
                            Añadir Comida
                        </button>
                    </div>

                    {activeDay.meals.length === 0 ? (
                        <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-olive-300 p-4">
                            <span className="block text-xs text-slate-400 font-bold mb-3">No hay comidas agregadas en este día.</span>
                            <button onClick={addMeal} className="cv-btn-accent h-9 px-4 text-xs">Agregar primera comida</button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {activeDay.meals.map((meal, idx) => {
                                const isFocused = activeTargetMealId === meal.id || (!activeTargetMealId && idx === 0);
                                return (
                                    <div 
                                        key={meal.id} 
                                        onClick={() => setActiveTargetMealId(meal.id)}
                                        className={`bg-white border rounded-2xl p-4 shadow-cv-sm relative group cursor-pointer transition duration-200 ${
                                            isFocused ? 'border-olive-500 ring-2 ring-olive-500/5' : 'border-olive-200 hover:border-olive-300'
                                        }`}
                                    >
                                        {isFocused && (
                                            <span className="absolute -top-2 left-4 bg-olive-800 text-white text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full select-none">
                                                En Foco
                                            </span>
                                        )}
                                        {/* Encabezado comida */}
                                        <div className="flex justify-between items-center gap-4 mb-3">
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={meal.name}
                                                    className="text-xs font-black text-slate-900 bg-transparent border-b border-transparent focus:border-olive-500 focus:outline-none w-40"
                                                    onChange={(e) => {
                                                        const updatedDays = currentPlan.days.map((d) => {
                                                            if (d.id === selectedDayId) {
                                                                return {
                                                                    ...d,
                                                                    meals: d.meals.map((m) => m.id === meal.id ? { ...m, name: e.target.value } : m)
                                                                };
                                                            }
                                                            return d;
                                                        });
                                                        setCurrentPlan({ ...currentPlan, days: updatedDays });
                                                    }}
                                                />
                                                <span className="text-[9px] text-slate-400 font-bold px-1.5 py-0.5 bg-slate-100 rounded-md">{meal.time}</span>
                                            </div>
                                            <button
                                                onClick={() => removeMeal(meal.id)}
                                                className="text-rose-500 hover:bg-rose-50 p-1.5 rounded-lg transition duration-150"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>

                                        {/* Elementos de la comida */}
                                        {meal.items.length === 0 ? (
                                            <div className="text-center py-3 bg-olive-50/10 rounded-xl border border-dashed border-olive-200 text-[10px] font-bold text-slate-400">
                                                Selecciona alimentos desde la biblioteca lateral.
                                            </div>
                                        ) : (
                                            <div className="space-y-1.5">
                                                {meal.items.map((item) => {
                                                    const food = foods.find((f) => f.id === item.foodId);
                                                    const recipe = recipes.find((r) => r.id === item.recipeId);
                                                    const name = food?.name || recipe?.name || 'Cargando...';
                                                    const category = food?.category || 'Receta';

                                                    return (
                                                        <div key={item.id} className="flex justify-between items-center p-2 bg-olive-50/20 rounded-xl border border-olive-100 hover:border-olive-200 transition duration-150">
                                                            <div>
                                                                <span className="text-[11px] font-black text-slate-900">{name}</span>
                                                                <span className="block text-[8px] text-slate-400 font-bold mt-0.5 uppercase tracking-wide">{category}</span>
                                                            </div>

                                                            <div className="flex items-center gap-2">
                                                                {/* Cantidad/Gramos editable */}
                                                                {item.foodId && (
                                                                    <input
                                                                        type="text"
                                                                        value={item.qty}
                                                                        onChange={(e) => updateItemQty(meal.id, item.id, e.target.value)}
                                                                        className="w-12 h-6 text-center text-[10px] font-bold bg-white rounded-md border border-olive-200 focus:outline-none focus:border-olive-500 font-mono"
                                                                    />
                                                                )}
                                                                {!item.foodId && (
                                                                    <span className="text-[10px] font-bold text-slate-500 font-mono px-2 py-0.5 bg-white rounded-md border border-olive-200">{item.qty}</span>
                                                                )}
                                                                <button
                                                                    onClick={() => removeItemFromMeal(meal.id, item.id)}
                                                                    className="text-slate-400 hover:text-rose-500 p-1 rounded-md transition"
                                                                >
                                                                    <Trash2 size={12} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Biblioteca lateral de Alimentos y Recetas - Ultra-Compacto */}
                <div className="space-y-4">
                    {/* Alimentos Rápidos */}
                    <div className="rounded-2xl border border-olive-200 bg-white p-4 shadow-cv-sm">
                        <h4 className="text-[10px] font-black text-slate-800 mb-2.5 flex items-center gap-1.5 uppercase tracking-wider border-b border-slate-100 pb-1.5">
                            <Apple size={12} className="text-olive-500" />
                            Alimentos Simples
                        </h4>
                        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                            {foods.map((food) => (
                                <button
                                    key={food.id}
                                    onClick={() => {
                                        const targetId = activeTargetMealId || (activeDay.meals.length > 0 ? activeDay.meals[0].id : null);
                                        if (targetId) {
                                            addItemToMeal(targetId, 'food', food.id);
                                        }
                                    }}
                                    className="w-full flex items-center justify-between p-2 bg-olive-50/10 hover:bg-olive-100/30 rounded-lg border border-olive-100/50 text-left transition text-[11px] font-bold text-slate-700"
                                >
                                    <span className="truncate pr-2">{food.name}</span>
                                    <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded bg-white border border-olive-200 text-olive-800">
                                        <Plus size={8} />
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Recetas */}
                    <div className="rounded-2xl border border-olive-200 bg-white p-4 shadow-cv-sm">
                        <h4 className="text-[10px] font-black text-slate-800 mb-2.5 flex items-center gap-1.5 uppercase tracking-wider border-b border-slate-100 pb-1.5">
                            <BookOpen size={12} className="text-olive-500" />
                            Recetas Completas
                        </h4>
                        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                            {recipes.map((recipe) => (
                                <button
                                    key={recipe.id}
                                    onClick={() => {
                                        const targetId = activeTargetMealId || (activeDay.meals.length > 0 ? activeDay.meals[0].id : null);
                                        if (targetId) {
                                            addItemToMeal(targetId, 'recipe', recipe.id);
                                        }
                                    }}
                                    className="w-full flex items-center justify-between p-2 bg-olive-50/10 hover:bg-olive-100/30 rounded-lg border border-olive-100/50 text-left transition text-[11px] font-bold text-slate-700"
                                >
                                    <span className="truncate pr-2">{recipe.name}</span>
                                    <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded bg-white border border-olive-200 text-olive-800">
                                        <Plus size={8} />
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Componente de Impresion Premium Clinica (Oculto en pantalla, visible al imprimir) */}
            <PrintablePlan 
                plan={currentPlan} 
                patient={activePatient} 
                foods={foods} 
                recipes={recipes} 
                shoppingList={shoppingList} 
            />
        </div>
    );
}

