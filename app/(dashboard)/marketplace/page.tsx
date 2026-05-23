'use client';

import React, { useState } from 'react';
import { useApp } from '@/lib/context/AppContext';
import { Search, Sparkles, Star, Award, ShieldCheck, MapPin, Activity } from 'lucide-react';
import Link from 'next/link';

export default function MarketplacePage() {
    const [search, setSearch] = useState('');

    const nutritionists = [
        {
            id: 'n1',
            name: 'Lic. Juan Pérez',
            headline: 'Especialista en Nutrición Deportiva y Recomposición Corporal',
            bio: 'Ayudo a atletas de alto rendimiento y personas recreativas a optimizar sus macros y recuperar su vitalidad.',
            specialties: ['Deportiva', 'Hipertrofia', 'Definición'],
            price: '15.000',
            location: 'Buenos Aires, ARG',
            rating: '4.9',
            reviews: 42,
            avatarLetter: 'P'
        },
        {
            id: 'n2',
            name: 'Lic. Lucía Fernández',
            headline: 'Especialista en Sobrepeso, Obesidad y Trastornos Metabólicos',
            bio: 'Abordaje clínico integrativo enfocado en la salud hormonal, descenso de grasa saludable y cambio de hábitos duradero.',
            specialties: ['Clínica', 'Hormonal', 'Hábitos'],
            price: '18.000',
            location: 'Córdoba, ARG',
            rating: '5.0',
            reviews: 28,
            avatarLetter: 'F'
        },
        {
            id: 'n3',
            name: 'Lic. Esteban Gatti',
            headline: 'Nutrición Vegana, Vegetariana y Transición Alimentaria',
            bio: 'Planificación de alimentación basada en plantas 100% segura para todas las etapas de la vida y rendimiento deportivo.',
            specialties: ['Vegana', 'Vegetariana', 'Plant-based'],
            price: '16.500',
            location: 'Rosario, ARG',
            rating: '4.8',
            reviews: 35,
            avatarLetter: 'G'
        }
    ];

    const filtered = nutritionists.filter(n =>
        n.name.toLowerCase().includes(search.toLowerCase()) ||
        n.specialties.some(s => s.toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Marketplace</h1>
                <p className="text-sm text-slate-500 font-semibold mt-1">Explorá y contratá nutricionistas certificados y verificados por AI Nutrition.</p>
            </div>

            {/* Buscador */}
            <div className="flex bg-white rounded-2xl border border-olive-200 p-3 shadow-cv-sm max-w-lg items-center gap-3">
                <Search size={18} className="text-slate-400 shrink-0 ml-1" />
                <input
                    type="text"
                    placeholder="Buscar por nombre o especialidad (ej. Deportiva)..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full text-xs font-bold text-slate-700 placeholder-slate-400 outline-none bg-transparent"
                />
            </div>

            {/* Listado de Profesionales */}
            <div className="grid gap-8 lg:grid-cols-2">
                {filtered.map((nutri) => (
                    <div key={nutri.id} className="cv-card p-6 flex flex-col justify-between h-[340px]">
                        <div>
                            {/* Profesional Header */}
                            <div className="flex justify-between items-start gap-4">
                                <div className="flex items-center gap-3">
                                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-olive-800 text-white font-black text-lg shadow-cv-sm">
                                        {nutri.avatarLetter}
                                    </span>
                                    <div>
                                        <div className="flex items-center gap-1.5">
                                            <h3 className="text-sm font-black text-slate-900 leading-none">{nutri.name}</h3>
                                            <span className="text-emerald-600 bg-emerald-50 border border-emerald-100 p-0.5 rounded-md" title="Matrícula Verificada">
                                                <ShieldCheck size={14} />
                                            </span>
                                        </div>
                                        <p className="text-[11px] font-bold text-slate-400 mt-1 max-w-[280px] truncate">{nutri.headline}</p>
                                    </div>
                                </div>

                                {/* Calificación */}
                                <div className="flex items-center gap-1 text-amber-500 font-mono text-xs font-black bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-100/50">
                                    <Star size={14} fill="currentColor" />
                                    {nutri.rating}
                                </div>
                            </div>

                            {/* Bio */}
                            <p className="text-xs font-semibold text-slate-500 mt-4 leading-relaxed line-clamp-3">
                                {nutri.bio}
                            </p>

                            {/* Tags de Especialidades */}
                            <div className="flex flex-wrap gap-2 mt-4">
                                {nutri.specialties.map((spec, i) => (
                                    <span key={i} className="text-[10px] font-black text-olive-800 bg-olive-100/50 px-2.5 py-0.5 rounded-md border border-olive-200/30">
                                        {spec}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Footer con precio y acción */}
                        <div className="border-t border-olive-100 pt-4 flex justify-between items-center mt-6">
                            <div>
                                <span className="block text-[9px] text-slate-400 font-bold uppercase leading-none">Abono Mensual</span>
                                <span className="text-base font-black font-mono text-slate-950">ARS {nutri.price}</span>
                            </div>

                            <Link
                                href="/messages"
                                className="cv-btn-primary h-10 px-5 text-xs"
                            >
                                Consultar y Contratar
                            </Link>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
