'use client';

import React from 'react';
import { NutritionPlan, Patient, Food, Recipe } from '@/lib/context/AppContext';
import { ShieldCheck, Heart, User, Calendar, Activity, CheckSquare } from 'lucide-react';

interface PrintablePlanProps {
    plan: NutritionPlan;
    patient: Patient;
    foods: Food[];
    recipes: Recipe[];
    shoppingList: string[];
}

export default function PrintablePlan({ plan, patient, foods, recipes, shoppingList }: PrintablePlanProps) {
    const todayStr = new Date().toLocaleDateString('es-AR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    // Calcular macronutrientes promedio del plan
    const calculatePlanSummary = () => {
        let totalCalories = 0;
        let totalProtein = 0;
        let totalCarbs = 0;
        let totalFat = 0;
        let dayCount = plan.days.length || 1;

        plan.days.forEach((day) => {
            day.meals.forEach((meal) => {
                meal.items.forEach((item) => {
                    if (item.foodId) {
                        const food = foods.find((f) => f.id === item.foodId);
                        if (food) {
                            const qtyGrams = parseFloat(item.qty) || 0;
                            totalProtein += (food.protein * qtyGrams) / 100;
                            totalCarbs += (food.carbs * qtyGrams) / 100;
                            totalFat += (food.fat * qtyGrams) / 100;
                            totalCalories += (food.calories * qtyGrams) / 100;
                        }
                    } else if (item.recipeId) {
                        const recipe = recipes.find((r) => r.id === item.recipeId);
                        if (recipe) {
                            totalProtein += recipe.protein;
                            totalCarbs += recipe.carbs;
                            totalFat += recipe.fat;
                            totalCalories += recipe.calories;
                        }
                    }
                });
            });
        });

        return {
            avgCalories: Math.round(totalCalories / dayCount),
            avgProtein: Math.round(totalProtein / dayCount),
            avgCarbs: Math.round(totalCarbs / dayCount),
            avgFat: Math.round(totalFat / dayCount)
        };
    };

    const summary = calculatePlanSummary();

    return (
        <div className="hidden print:block w-full bg-white text-slate-900 font-sans p-2">
            {/* Cabecera Estética de la Clínica */}
            <div className="border-b-2 border-olive-800 pb-6 mb-8 flex justify-between items-end">
                <div>
                    <div className="flex items-center gap-2 mb-1.5">
                        {/* Logo Vectorial SVG Clinica AI Nutri */}
                        <svg className="h-8 w-8 text-olive-800" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
                        </svg>
                        <span className="text-2xl font-black tracking-tight text-olive-800">AI NUTRI<span className="text-slate-400 font-normal">CLINIC</span></span>
                    </div>
                    <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Centro de Nutrición de Precisión y Rendimiento</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Av. del Libertador 1420, CABA • contacto@ainutri.clinic • www.ainutri.clinic</p>
                </div>
                <div className="text-right">
                    <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Fecha de Emisión</span>
                    <span className="text-xs font-bold text-slate-800 font-mono">{todayStr}</span>
                </div>
            </div>

            {/* Ficha Clínica del Paciente */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-3xl p-5 mb-8 grid grid-cols-2 md:grid-cols-4 gap-4 divide-x divide-slate-200 avoid-break shadow-sm">
                <div className="pl-2">
                    <span className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-wider">
                        <User size={10} className="text-olive-700" /> Paciente
                    </span>
                    <span className="block text-sm font-black text-slate-800 mt-1">{patient.name}</span>
                    <span className="block text-[10px] text-olive-600 font-bold mt-0.5">Dieta: {patient.dietType || 'Omnívora'}</span>
                </div>
                <div className="pl-4">
                    <span className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-wider">
                        <Calendar size={10} className="text-olive-700" /> Composición
                    </span>
                    <span className="block text-xs font-bold text-slate-800 mt-1 font-mono">{patient.weight} Kg • {patient.height} cm</span>
                    <span className="block text-[10px] text-slate-500 font-bold mt-0.5">Grasa: {patient.bodyFat ? `${patient.bodyFat}%` : '15%'} • IMC: {Math.round((patient.weight / ((patient.height/100) * (patient.height/100))) * 10) / 10}</span>
                </div>
                <div className="pl-4">
                    <span className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-wider">
                        <Activity size={10} className="text-olive-700" /> Historial Clínico
                    </span>
                    <span className="block text-xs font-black text-olive-800 mt-1 truncate max-w-[150px]">{patient.objective}</span>
                    <span className="block text-[10px] text-rose-600 font-bold mt-0.5 truncate max-w-[150px]">Alergias: {patient.allergies || 'Ninguna'}</span>
                </div>
                <div className="pl-4">
                    <span className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-wider">
                        <Heart size={10} className="text-olive-700" /> Distribución Planificada
                    </span>
                    <span className="block text-sm font-black text-slate-800 mt-1 font-mono">{summary.avgCalories} Kcal</span>
                    <span className="block text-[9px] text-slate-500 font-semibold mt-0.5 font-mono">
                        P: {summary.avgProtein}g • C: {summary.avgCarbs}g • G: {summary.avgFat}g
                    </span>
                </div>
            </div>

            {/* Introducción / Descripción del Plan */}
            <div className="mb-8 avoid-break">
                <span className="text-[10px] font-black text-olive-800 uppercase tracking-wider">Plan Asignado</span>
                <h1 className="text-xl font-black text-slate-900 mt-0.5">{plan.name}</h1>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{plan.description}</p>
            </div>

            {/* Planificación Diaria Completa */}
            <div className="space-y-8">
                {plan.days.map((day) => (
                    <div key={day.id} className="border border-slate-200 rounded-[2rem] p-6 avoid-break bg-white shadow-sm">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-olive-800"></span>
                                {day.name}
                            </h3>
                            {day.isRefeed && (
                                <span className="px-2.5 py-0.5 rounded-full bg-olive-100 text-olive-800 text-[9px] font-black uppercase tracking-wider border border-olive-200">
                                    Día de Refeed / Carga
                                </span>
                            )}
                        </div>

                        {day.meals.length === 0 ? (
                            <p className="text-xs text-slate-400 italic py-2">Sin ingestas programadas para este día.</p>
                        ) : (
                            <div className="space-y-4">
                                {day.meals.map((meal) => (
                                    <div key={meal.id} className="grid grid-cols-[110px_1fr] gap-4 items-start border-b border-dashed border-slate-100 pb-4 last:border-b-0 last:pb-0">
                                        <div>
                                            <span className="block text-xs font-black text-slate-800">{meal.name}</span>
                                            <span className="text-[10px] text-slate-400 font-semibold font-mono">{meal.time}</span>
                                        </div>

                                        <div className="space-y-2">
                                            {meal.items.map((item) => {
                                                const food = foods.find((f) => f.id === item.foodId);
                                                const recipe = recipes.find((r) => r.id === item.recipeId);
                                                const name = food?.name || recipe?.name || 'Alimento';
                                                const subText = food ? food.category : 'Receta Completa';
                                                
                                                // Calcular macros individuales
                                                let kcal = 0, p = 0, c = 0, g = 0;
                                                if (food) {
                                                    const grams = parseFloat(item.qty) || 0;
                                                    kcal = Math.round((food.calories * grams) / 100);
                                                    p = Math.round((food.protein * grams) / 100);
                                                    c = Math.round((food.carbs * grams) / 100);
                                                    g = Math.round((food.fat * grams) / 100);
                                                } else if (recipe) {
                                                    kcal = recipe.calories;
                                                    p = recipe.protein;
                                                    c = recipe.carbs;
                                                    g = recipe.fat;
                                                }

                                                return (
                                                    <div key={item.id} className="flex justify-between items-center text-xs bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                                                        <div>
                                                            <span className="font-bold text-slate-800">{name}</span>
                                                            <span className="block text-[9px] text-slate-400 font-semibold mt-0.5">{subText} • Cantidad: {item.qty}</span>
                                                        </div>
                                                        <div className="text-right font-mono text-[10px] text-slate-500">
                                                            <span className="font-bold text-slate-700">{kcal} kcal</span>
                                                            <span className="block text-[9px] text-slate-400">P:{p}g | C:{c}g | G:{g}g</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {day.notes && (
                            <div className="bg-olive-50/30 border border-olive-100 rounded-2xl p-3.5 mt-4 text-[11px] text-olive-800 leading-relaxed font-medium">
                                <strong className="font-black uppercase tracking-wider block mb-1 text-[9px]">Notas del día:</strong>
                                {day.notes}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Salto de página para Lista de Compras y Consentimiento Clínico */}
            <div className="page-break"></div>

            {/* Listado de Compras Consolidado Semanal */}
            <div className="mt-8 border border-slate-200 rounded-[2rem] p-6 avoid-break bg-white shadow-sm">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
                    <CheckSquare size={16} className="text-olive-700" />
                    Lista de Compras Semanal de Apoyo
                </h3>
                <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                    Asegurá estos ingredientes para cumplir al 100% con las preparaciones de la semana. Las porciones ya se encuentran calculadas para optimizar tus compras sin desperdicios.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {shoppingList.map((item, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700 font-medium">
                            <span className="h-4 w-4 rounded-md border border-slate-300 flex items-center justify-center bg-white"></span>
                            {item}
                        </div>
                    ))}
                </div>
            </div>

            {/* Recomendaciones Generales de Estilo de Vida */}
            <div className="grid grid-cols-2 gap-4 mt-6 avoid-break">
                <div className="border border-slate-200 rounded-3xl p-5 bg-white">
                    <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Pautas de Hidratación</span>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                        Consumir un mínimo de **3 litros de agua por día**. Durante las sesiones de entrenamiento, sumar 500ml adicionales con sales de rehidratación si el ambiente supera los 25°C. Evitar bebidas carbonatadas.
                    </p>
                </div>
                <div className="border border-slate-200 rounded-3xl p-5 bg-white">
                    <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Descanso & Ritmo Circadiano</span>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                        Sostener un bloque de descanso nocturno de **7 a 8 horas continuas**. Reducir la exposición a pantallas de luz azul 1 hora antes de dormir para maximizar la síntesis endógena de melatonina y optimizar la recuperación muscular.
                    </p>
                </div>
            </div>

            {/* Firmas y Validación Ética - Consentimiento Médico */}
            <div className="mt-12 pt-8 border-t border-slate-100 grid grid-cols-2 gap-8 items-end avoid-break">
                <div>
                    <span className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                        <ShieldCheck size={12} className="text-olive-700" /> Responsabilidad Profesional
                    </span>
                    <p className="text-[9px] text-slate-400 leading-relaxed">
                        Este plan alimentario es un instrumento educativo y de planificación de hábitos basado en las métricas declaradas de composición corporal. No reemplaza un diagnóstico médico clínico ni debe considerarse terapia prescriptiva ante patologías crónicas no declaradas.
                    </p>
                </div>

                <div className="text-right flex flex-col items-end justify-center">
                    {/* Firma Digital Ficticia de Muestra */}
                    <div className="mb-2 font-serif text-slate-400 italic text-xl select-none pr-4">
                        Dr. Alejandro Rossi
                    </div>
                    <div className="border-t border-slate-300 w-48 pt-1 text-right">
                        <span className="block text-xs font-black text-slate-800">Lic. Alejandro Rossi</span>
                        <span className="block text-[9px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Nutricionista Clínico • Matrícula M.N. 5521</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
