'use client';

import React from 'react';
import { useApp } from '@/lib/context/AppContext';
import { CheckSquare, CheckCircle, Flame } from 'lucide-react';

export default function HabitsPage() {
    const { habits, setHabits } = useApp();

    const toggleHabit = (id: string) => {
        setHabits(habits.map(h => h.id === id ? { ...h, completed: !h.completed } : h));
    };

    const completedCount = habits.filter(h => h.completed).length;

    return (
        <div className="space-y-8 animate-fade-in">
            <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Mis Hábitos</h1>
                <p className="text-sm text-slate-500 font-semibold mt-1">Registrá tus check-ins diarios recomendados por tu nutricionista.</p>
            </div>

            <div className="grid gap-8 lg:grid-cols-[1.5fr_1.2fr] max-w-5xl">
                {/* Panel de Hábitos */}
                <div className="rounded-[2.5rem] border border-olive-200 bg-white p-8 shadow-cv-sm">
                    <div className="flex items-center gap-3 border-b border-olive-100 pb-5 mb-6">
                        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-olive-50 text-olive-800">
                            <CheckSquare size={20} />
                        </span>
                        <div>
                            <h3 className="text-base font-black text-slate-900">Check-in de Hábitos</h3>
                            <p className="text-xs text-slate-400 font-bold">Día de hoy</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {habits.map((habit) => (
                            <button
                                key={habit.id}
                                onClick={() => toggleHabit(habit.id)}
                                className={`w-full flex items-center justify-between p-4 rounded-2xl border transition text-left ${
                                    habit.completed
                                        ? 'bg-olive-50/20 border-olive-100 text-slate-400'
                                        : 'bg-white border-olive-200 hover:bg-olive-50/50 text-slate-800'
                                }`}
                            >
                                <span className={`text-xs font-bold ${habit.completed ? 'line-through' : ''}`}>
                                    {habit.name}
                                </span>
                                <span className={`flex h-6 w-6 items-center justify-center rounded-lg border transition ${
                                    habit.completed ? 'bg-olive-800 text-white border-olive-800' : 'bg-white border-olive-300'
                                }`}>
                                    {habit.completed && <CheckCircle size={14} />}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Estadísticas de Adherencia en Hábitos */}
                <div className="rounded-[2.5rem] border border-olive-200 bg-white p-8 shadow-cv-sm flex flex-col justify-between h-72">
                    <div>
                        <h3 className="text-base font-black text-slate-900 mb-2">Mi Progreso</h3>
                        <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                            Completar tus hábitos diarios ayuda a tu nutricionista a entender tu nivel de adherencia y realizar ajustes metabólicos precisos.
                        </p>
                    </div>

                    <div className="flex items-center justify-between border-t border-olive-100 pt-4 mt-6">
                        <div className="flex items-center gap-2">
                            <Flame size={20} className="text-amber-500" />
                            <div>
                                <span className="block text-[9px] text-slate-400 font-bold uppercase leading-none">Completados</span>
                                <span className="text-sm font-black font-mono text-slate-800">{completedCount} de {habits.length}</span>
                            </div>
                        </div>

                        <span className="text-xs font-black text-olive-800 bg-olive-50 px-3 py-1 rounded-xl border border-olive-200/50">
                            Racha: 5 días 🔥
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
