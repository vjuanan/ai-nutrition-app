'use client';

import { useDraggable } from '@dnd-kit/core';
import { Coffee, Apple, Sun, Utensils, Moon } from 'lucide-react';
import React from 'react';

export const MEAL_BLOCK_TYPES = [
    {
        id: 'Desayuno',
        label: 'Desayuno',
        description: 'Energía para el día',
        icon: Coffee,
        className: 'bg-rose-50 border-rose-100 text-rose-600',
        ring: 'ring-rose-200'
    },
    {
        id: 'Colación',
        label: 'Colación',
        description: 'Snack ligero',
        icon: Apple,
        className: 'bg-emerald-50 border-emerald-100 text-emerald-600',
        ring: 'ring-emerald-200'
    },
    {
        id: 'Almuerzo',
        label: 'Almuerzo',
        description: 'Comida principal',
        icon: Sun,
        className: 'bg-amber-50 border-amber-100 text-amber-600',
        ring: 'ring-amber-200'
    },
    {
        id: 'Merienda',
        label: 'Merienda',
        description: 'Refuerzo de tarde',
        icon: Utensils,
        className: 'bg-purple-50 border-purple-100 text-purple-600',
        ring: 'ring-purple-200'
    },
    {
        id: 'Ayuno',
        label: 'Ayuno (WIP)',
        description: 'Periodo sin ingesta',
        icon: Moon,
        className: 'bg-blue-50 border-blue-100 text-blue-600',
        ring: 'ring-blue-200'
    }
];

function DraggableBlock({ type }: { type: typeof MEAL_BLOCK_TYPES[0] }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: `palette-${type.id}`,
        data: {
            type: 'NewBlock',
            blockType: type.id
        }
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    } : undefined;

    return (
        <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            style={style}
            className={`
                relative flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-grab active:cursor-grabbing
                ${type.className} 
                ${isDragging ? 'opacity-50 z-50 shadow-xl scale-105 rotate-2' : 'hover:scale-[1.02] hover:shadow-md'}
                ${isDragging ? type.ring : 'border-transparent'}
            `}
        >
            <div className="w-10 h-10 rounded-lg bg-white/60 flex items-center justify-center shrink-0">
                <type.icon size={20} />
            </div>
            <div>
                <h3 className="font-bold text-sm">{type.label}</h3>
                <p className="text-[10px] opacity-70 font-medium">{type.description}</p>
            </div>
        </div>
    );
}

export function BlockTypePalette() {
    return (
        <div className="w-[280px] flex-shrink-0 bg-white dark:bg-cv-bg-secondary border-r border-slate-200 dark:border-slate-800 flex flex-col h-full">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Tipos de Bloque
                </h2>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {MEAL_BLOCK_TYPES.map((type) => (
                    <DraggableBlock key={type.id} type={type} />
                ))}
            </div>
        </div>
    );
}
