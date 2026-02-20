'use client';

import { Flame, Gauge, Target, Zap } from 'lucide-react';

type TrainingSlot = 'rest' | 'morning' | 'afternoon' | 'night';

interface DayGoalsCompactHeaderProps {
    dayLabel: string;
    targetCalories: number;
    targetProtein: number;
    trainingSlot: TrainingSlot;
    totalCalories: number;
    totalProtein: number;
    caloriesPct: number;
    proteinPct: number;
    onChangeCalories: (value: number) => void;
    onChangeProtein: (value: number) => void;
    onChangeTrainingSlot: (value: TrainingSlot) => void;
}

type ProgressTone = {
    barClass: string;
    badgeClass: string;
    labelClass: string;
};

function progressToneClass(pct: number): ProgressTone {
    if (pct < 90) {
        return {
            barClass: 'bg-amber-500',
            badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
            labelClass: 'text-amber-700',
        };
    }

    if (pct <= 105) {
        return {
            barClass: 'bg-emerald-500',
            badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
            labelClass: 'text-emerald-700',
        };
    }

    return {
        barClass: 'bg-red-500',
        badgeClass: 'bg-red-50 text-red-700 border-red-200',
        labelClass: 'text-red-700',
    };
}

function slotLabel(slot: TrainingSlot) {
    switch (slot) {
        case 'rest': return 'Descanso';
        case 'morning': return 'Mañana';
        case 'afternoon': return 'Tarde';
        case 'night': return 'Noche';
        default: return 'Mañana';
    }
}

interface CompactFieldProps {
    label: string;
    value: number;
    suffix?: string;
    onChange: (value: number) => void;
}

function CompactNumberField({ label, value, suffix, onChange }: CompactFieldProps) {
    return (
        <label className="relative rounded-2xl border border-slate-200/80 bg-white/80 px-3 py-2.5 shadow-[0_1px_0_rgba(255,255,255,0.85)_inset,0_8px_20px_rgba(15,23,42,0.04)] backdrop-blur-sm transition-all duration-200 hover:border-slate-300/80">
            <span className="mb-1 block text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">
                {label}
            </span>
            <div className="flex items-center gap-2">
                <input
                    type="number"
                    min={0}
                    value={value}
                    onChange={(e) => onChange(Number(e.target.value) || 0)}
                    className="w-full bg-transparent text-base font-semibold text-slate-900 outline-none [appearance:textfield]"
                />
                {suffix ? (
                    <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                        {suffix}
                    </span>
                ) : null}
            </div>
        </label>
    );
}

interface ProgressCompactCardProps {
    icon: React.ReactNode;
    label: string;
    total: number;
    target: number;
    pct: number;
    tone: ProgressTone;
    suffix: string;
}

function ProgressCompactCard({
    icon,
    label,
    total,
    target,
    pct,
    tone,
    suffix
}: ProgressCompactCardProps) {
    return (
        <div className="rounded-2xl border border-slate-200/80 bg-white/82 px-3 py-2.5 shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_8px_16px_rgba(15,23,42,0.03)] backdrop-blur-sm">
            <div className="mb-2 flex items-center justify-between gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 font-medium text-slate-600">
                    {icon}
                    {label}
                </span>
                <span className="font-semibold text-slate-800">
                    {Math.round(total)} / {Math.round(target)} {suffix}
                </span>
            </div>
            <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                    className={`h-full ${tone.barClass} transition-all duration-300 ease-out`}
                    style={{ width: `${Math.min(Math.max(pct, 0), 100)}%` }}
                />
            </div>
            <div className="flex justify-end">
                <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${tone.badgeClass} ${tone.labelClass}`}>
                    {Math.round(pct)}%
                </span>
            </div>
        </div>
    );
}

export function DayGoalsCompactHeader({
    dayLabel,
    targetCalories,
    targetProtein,
    trainingSlot,
    totalCalories,
    totalProtein,
    caloriesPct,
    proteinPct,
    onChangeCalories,
    onChangeProtein,
    onChangeTrainingSlot
}: DayGoalsCompactHeaderProps) {
    const caloriesTone = progressToneClass(caloriesPct);
    const proteinTone = progressToneClass(proteinPct);

    return (
        <div className="sticky top-0 z-30 border-b border-slate-200/80 bg-gradient-to-b from-white/95 via-slate-50/92 to-slate-50/84 backdrop-blur-xl">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_20%,rgba(34,193,195,0.07),transparent_45%),radial-gradient(circle_at_100%_10%,rgba(79,156,249,0.08),transparent_40%)]" />
            <div className="relative mx-auto max-w-5xl px-4 py-2.5 md:px-6 md:py-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                    <h3 className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight text-slate-800">
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-cyan-200 bg-cyan-50 text-cyan-600 shadow-[0_0_0_1px_rgba(34,193,195,0.05)]">
                            <Target size={12} />
                        </span>
                        Objetivos
                    </h3>
                    <span className="inline-flex h-7 items-center rounded-full border border-slate-200/90 bg-white/82 px-3 text-xs font-semibold text-slate-600 shadow-[0_1px_0_rgba(255,255,255,0.85)_inset]">
                        {dayLabel}
                    </span>
                </div>

                <div className="mb-2.5 grid grid-cols-2 gap-2 lg:grid-cols-3">
                    <CompactNumberField
                        label="Kcal objetivo"
                        value={targetCalories}
                        onChange={onChangeCalories}
                    />
                    <CompactNumberField
                        label="Proteína"
                        value={targetProtein}
                        suffix="g"
                        onChange={onChangeProtein}
                    />

                    <label className="col-span-2 rounded-2xl border border-slate-200/80 bg-white/80 px-3 py-2.5 shadow-[0_1px_0_rgba(255,255,255,0.85)_inset,0_8px_20px_rgba(15,23,42,0.04)] backdrop-blur-sm transition-all duration-200 hover:border-slate-300/80 lg:col-span-1">
                        <span className="mb-1 block text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">
                            Slot entreno
                        </span>
                        <div className="flex items-center justify-between gap-2">
                            <select
                                value={trainingSlot}
                                onChange={(e) => onChangeTrainingSlot(e.target.value as TrainingSlot)}
                                className="h-9 w-full cursor-pointer bg-transparent text-sm font-semibold text-slate-900 outline-none"
                            >
                                <option value="rest">Descanso</option>
                                <option value="morning">Mañana</option>
                                <option value="afternoon">Tarde</option>
                                <option value="night">Noche</option>
                            </select>
                            <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                                {slotLabel(trainingSlot)}
                            </span>
                        </div>
                    </label>
                </div>

                <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
                    <ProgressCompactCard
                        icon={<Flame size={12} className="text-cyan-600" />}
                        label="Progreso Kcal"
                        total={totalCalories}
                        target={targetCalories}
                        pct={caloriesPct}
                        tone={caloriesTone}
                        suffix="kcal"
                    />
                    <ProgressCompactCard
                        icon={<Zap size={12} className="text-cyan-600" />}
                        label="Progreso Proteína"
                        total={totalProtein}
                        target={targetProtein}
                        pct={proteinPct}
                        tone={proteinTone}
                        suffix="g"
                    />
                </div>

                <div className="mt-2 flex justify-end">
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
                        <Gauge size={12} className="text-slate-400" />
                        Live tracking
                    </span>
                </div>
            </div>
        </div>
    );
}
