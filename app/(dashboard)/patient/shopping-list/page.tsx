'use client';

import { useApp } from '@/lib/context/AppContext';
import { ShoppingBag, CheckCircle, Circle } from 'lucide-react';
import React, { useState } from 'react';

export default function ShoppingListPage() {
    const { shoppingList } = useApp();
    const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});

    const toggleItem = (index: number) => {
        setCheckedItems({ ...checkedItems, [index]: !checkedItems[index] });
    };

    return (
        <div className="space-y-8 animate-fade-in">
            <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Lista de Compras Semanal</h1>
                <p className="text-sm text-slate-500 font-semibold mt-1">Consolidación inteligente de los ingredientes de tu plan de comidas.</p>
            </div>

            <div className="rounded-[2.5rem] border border-olive-200 bg-white p-8 shadow-cv-sm max-w-2xl">
                <div className="flex items-center gap-3 border-b border-olive-100 pb-5 mb-6">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-olive-50 text-olive-800">
                        <ShoppingBag size={20} />
                    </span>
                    <div>
                        <h3 className="text-base font-black text-slate-900">Ingredientes Requeridos</h3>
                        <p className="text-xs text-slate-400 font-bold">Semana 1 - Plan de Recomposición Corporal</p>
                    </div>
                </div>

                <div className="space-y-3">
                    {shoppingList.map((item, index) => {
                        const checked = checkedItems[index] || false;
                        return (
                            <button
                                key={index}
                                onClick={() => toggleItem(index)}
                                className={`w-full flex items-center justify-between p-4 rounded-2xl border transition text-left ${
                                    checked
                                        ? 'bg-olive-50/20 border-olive-100 text-slate-400'
                                        : 'bg-white border-olive-200 hover:bg-olive-50/50 text-slate-800'
                                }`}
                            >
                                <span className={`text-xs font-bold ${checked ? 'line-through' : ''}`}>
                                    {item}
                                </span>
                                <span className={`flex h-6 w-6 items-center justify-center rounded-lg border transition ${
                                    checked ? 'bg-olive-800 text-white border-olive-800' : 'bg-white border-olive-300'
                                }`}>
                                    {checked && <CheckCircle size={14} />}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
