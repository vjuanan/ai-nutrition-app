'use client';

import { useDraggable } from '@dnd-kit/core';
import {
    Utensils,
    Coffee,
    Sun,
    Moon,
    Apple,
    Cookie,
    Dumbbell,
    Activity
} from 'lucide-react';

export const MEAL_BLOCK_TYPES = [
    {
        id: 'Desayuno',
        label: 'Desayuno',
        icon: Coffee,
        color: 'text-orange-500',
        bg: 'bg-orange-50 dark:bg-orange-950/30',
        ring: 'ring-orange-500'
    },
    {
        id: 'Almuerzo',
        label: 'Almuerzo',
        icon: Utensils,
        color: 'text-blue-500',
        bg: 'bg-blue-50 dark:bg-blue-950/30',
        ring: 'ring-blue-500'
    },
    {
        id: 'Merienda',
        label: 'Merienda',
        icon: Cookie,
        color: 'text-pink-500',
        bg: 'bg-pink-50 dark:bg-pink-950/30',
        ring: 'ring-pink-500'
    },
    {
        id: 'Cena',
        label: 'Cena',
        icon: Moon,
        color: 'text-indigo-500',
        bg: 'bg-indigo-50 dark:bg-indigo-950/30',
        ring: 'ring-indigo-500'
    },
    {
        id: 'Colación',
        label: 'Colación',
        icon: Apple,
        color: 'text-green-500',
        bg: 'bg-green-50 dark:bg-green-950/30',
        ring: 'ring-green-500'
    },
    {
        id: 'Pre-Entreno',
        label: 'Pre-Entreno',
        icon: Dumbbell,
        color: 'text-red-500',
        bg: 'bg-red-50 dark:bg-red-950/30',
        ring: 'ring-red-500'
    },
    {
        id: 'Post-Entreno',
        label: 'Post-Entreno',
        icon: Activity,
        color: 'text-purple-500',
        bg: 'bg-purple-50 dark:bg-purple-950/30',
        ring: 'ring-purple-500'
    },
];

export function PaletteItem({ type, className }: { type: (typeof MEAL_BLOCK_TYPES)[0]; className?: string }) {
    const Icon = type.icon;
    return (
        <div className={`
            p-3 rounded-xl border border-dashed transition-all duration-200
            flex items-center gap-3 bg-white dark:bg-slate-900 group
            ${type.bg} ${type.color} ${className || 'border-transparent hover:border-current'}
        `}>
            <div className={`
                w-8 h-8 rounded-lg flex items-center justify-center shrink-0
                bg-white/80 dark:bg-black/20 shadow-sm
            `}>
                <Icon size={18} />
            </div>
            <span className="font-medium text-slate-700 dark:text-slate-200">{type.label}</span>
        </div>
    );
}

interface BlockTypePaletteProps {
    onItemClick?: (typeId: string) => void;
}

export function BlockTypePalette({ onItemClick }: BlockTypePaletteProps) {
    return (
        <div className="w-80 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-black flex flex-col h-full overflow-hidden shadow-sm z-10">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 backdrop-blur-sm">
                <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-1">Bloques de Comida</h3>
                <p className="text-xs text-slate-500 font-medium">Arrastra o haz click para añadir</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {MEAL_BLOCK_TYPES.map((type) => (
                    <DraggableBlock key={type.id} type={type} onClick={() => onItemClick?.(type.id)} />
                ))}
            </div>
        </div>
    );
}

function DraggableBlock({ type, onClick }: { type: (typeof MEAL_BLOCK_TYPES)[0]; onClick?: () => void }) {
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
            onClick={onClick}
            className={`cursor-grab active:cursor-grabbing ${isDragging ? 'pointer-events-none' : ''}`}
        >
            <PaletteItem
                type={type}
                className={`
                    ${isDragging ? 'opacity-50 z-50 shadow-xl scale-105 rotate-2' : 'hover:scale-[1.02] hover:shadow-md'}
                    ${isDragging ? type.ring : 'border-transparent'}
                `}
            />
        </div>
    );
}
