import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowRight, CheckCircle2, ShieldCheck, Sparkles, Apple, Utensils, Clipboard } from 'lucide-react';

export function PublicHome() {
    return (
        <main className="min-h-screen overflow-hidden bg-olive-50 text-slate-900">
            <section className="relative min-h-screen overflow-hidden border-b border-olive-200">
                <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
                    <nav className="flex items-center justify-between gap-4">
                        <Link href="/" className="flex items-center gap-3">
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-olive-800 text-white">
                                <Apple size={20} />
                            </span>
                            <span className="text-sm font-black tracking-[-0.02em] text-olive-800">AI Nutrition</span>
                        </Link>

                        <div className="flex items-center gap-2 text-sm font-medium">
                            <Link href="/privacidad" className="hidden rounded-lg px-3 py-2 text-slate-600 transition hover:text-slate-950 sm:inline-flex">
                                Privacidad
                            </Link>
                            <Link
                                href="/login"
                                className="cv-btn-secondary h-10 px-4"
                            >
                                Ya tengo cuenta
                            </Link>
                        </div>
                    </nav>

                    <div className="grid flex-1 items-center gap-10 py-12 lg:grid-cols-[0.88fr_1.12fr] lg:py-10">
                        <div className="max-w-2xl">
                            <p className="inline-flex items-center gap-1.5 rounded-full border border-olive-200 bg-white px-3 py-1 text-xs font-semibold text-olive-800 shadow-cv-sm">
                                <span className="h-1.5 w-1.5 rounded-full bg-olive-500" />
                                Software para Nutricionistas y Clínicas
                            </p>
                            <h1 className="mt-5 max-w-4xl text-5xl font-black leading-[0.98] tracking-tight text-slate-900 md:text-6xl">
                                Convertí tu nutrición en un <span className="text-olive-500">sistema</span>.
                            </h1>
                            <p className="mt-6 max-w-xl text-lg font-normal leading-8 text-slate-600 md:text-xl">
                                Diseñá, organizá, asigná y entregá planes alimentarios profesionales sin vivir entre planillas, PDFs y WhatsApp.
                            </p>

                            <div className="mt-8 flex flex-wrap items-center gap-3">
                                <Link
                                    href="/onboarding"
                                    className="cv-btn-primary px-6"
                                >
                                    Empezar 7 días gratis
                                    <ArrowRight size={17} />
                                </Link>
                                <Link
                                    href="/marketplace"
                                    className="cv-btn-secondary px-6"
                                >
                                    Explorar Marketplace
                                </Link>
                            </div>
                            <p className="mt-3 text-xs font-normal text-slate-500">
                                Sin tarjeta · Cancelas cuando quieras · Suite profesional.
                            </p>
                        </div>

                        <div className="relative">
                            <div className="relative rounded-[2rem] border border-olive-200 bg-white p-3.5 shadow-cv-lg">
                                <div className="absolute left-6 top-6 z-10 rounded-xl border border-olive-200 bg-white px-3 py-1.5 text-xs font-black text-olive-800 shadow-cv-sm">
                                    Después: sistema AI Nutrition
                                </div>
                                <div className="aspect-[16/10] w-full rounded-2xl bg-olive-100 flex flex-col p-6 justify-between overflow-hidden relative border border-olive-200/50">
                                    {/* Mockup UI de alta gama del builder de comidas */}
                                    <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-cv-sm border border-olive-200/40">
                                        <div className="flex items-center gap-3">
                                            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-olive-50 text-olive-800">
                                                <Utensils size={20} />
                                            </span>
                                            <div>
                                                <h3 className="text-sm font-black text-slate-900">Almuerzo Pre-Entreno</h3>
                                                <p className="text-[11px] font-medium text-slate-400">Día de Fuerza - 13:00 HS</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-4 font-mono text-xs">
                                            <div className="text-right">
                                                <span className="block text-[10px] text-slate-400 font-sans font-bold">PROT</span>
                                                <span className="font-bold text-olive-800">42g</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="block text-[10px] text-slate-400 font-sans font-bold">CARBS</span>
                                                <span className="font-bold text-amber-600">65g</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="block text-[10px] text-slate-400 font-sans font-bold">GRASAS</span>
                                                <span className="font-bold text-rose-500">12g</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Lista de alimentos interactiva simulada */}
                                    <div className="space-y-2 mt-4 flex-1">
                                        {[
                                            { name: "Pechuga de pollo grillada", qty: "150g", desc: "Aporta 38g de proteína magra" },
                                            { name: "Arroz integral hervido", qty: "120g", desc: "Carbohidratos complejos de absorción lenta" },
                                            { name: "Palta / Aguacate", qty: "40g", desc: "Ácidos grasos saludables y fibra" }
                                        ].map((food, i) => (
                                            <div key={i} className="flex justify-between items-center bg-white/70 backdrop-blur-sm px-4 py-2.5 rounded-xl border border-white/60">
                                                <div>
                                                    <span className="text-xs font-black text-slate-900">{food.name}</span>
                                                    <span className="block text-[10px] text-slate-500">{food.desc}</span>
                                                </div>
                                                <span className="text-xs font-bold text-olive-800 font-mono bg-olive-100/50 px-2.5 py-0.5 rounded-md">{food.qty}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex justify-between items-center bg-olive-800 text-white p-3 rounded-xl mt-4">
                                        <span className="text-xs font-bold">Calorías Totales del Día</span>
                                        <span className="text-sm font-black font-mono">2,150 Kcal</span>
                                    </div>
                                </div>
                                <div className="absolute bottom-6 right-6 rounded-xl bg-slate-950 px-3 py-1.5 text-xs font-black text-white shadow-cv-md">
                                    Producto Real
                                </div>
                            </div>

                            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
                                <span className="rounded-lg border border-olive-200 bg-white px-3 py-1 shadow-cv-sm">Antes: planillas</span>
                                <span className="rounded-lg border border-olive-200 bg-white px-3 py-1 shadow-cv-sm">PDFs</span>
                                <span className="rounded-lg border border-olive-200 bg-white px-3 py-1 shadow-cv-sm">WhatsApp</span>
                            </div>

                            <div className="mx-auto mt-4 flex max-w-xl items-start gap-3 rounded-2xl border border-olive-200 bg-white p-4 text-sm font-medium leading-6 text-slate-600 shadow-cv-sm">
                                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-olive-500" />
                                <p>Una experiencia clínica y operativa premium para tus pacientes.</p>
                            </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3 lg:col-span-2 lg:max-w-3xl">
                            {[
                                { step: 'Diseñar', desc: 'Planes calóricos y macros' },
                                { step: 'Asignar', desc: 'Envío directo al portal del paciente' },
                                { step: 'Trackear', desc: 'Adherencia y evolución antropométrica' }
                            ].map((item) => (
                                <div key={item.step} className="rounded-2xl border border-olive-200 bg-white p-4 shadow-cv-sm">
                                    <p className="text-sm font-black text-olive-800">{item.step}</p>
                                    <p className="text-xs text-slate-500 mt-1">{item.desc}</p>
                                    <div className="mt-3 h-1.5 rounded-full bg-olive-100" />
                                    <div className="mt-2 h-1.5 w-2/3 rounded-full bg-olive-200/50" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <section className="relative bg-white px-4 py-16 sm:px-6">
                <div className="mx-auto grid max-w-6xl gap-5 md:grid-cols-3">
                    <FeaturePoint
                        icon={<Sparkles size={20} />}
                        title="Biblioteca de Recetas y Alimentos"
                        body="Tus recetas, alimentos, porciones y equivalencias viven en una sola base de datos organizada. Crear planes nunca fue tan rápido."
                    />
                    <FeaturePoint
                        icon={<Utensils size={20} />}
                        title="Portal para Pacientes"
                        body="Tus pacientes acceden a una app web donde ven sus ingestas, leen recetas detalladas y obtienen la lista de compras automatizada."
                    />
                    <FeaturePoint
                        icon={<Clipboard size={20} />}
                        title="Onboarding e Intake Clínico"
                        body="Formularios clínicos post-pago integrados para recopilar patologías, laboratorios, intolerancias y preferencias antes de diseñar."
                    />
                </div>
            </section>
        </main>
    );
}

function FeaturePoint({
    icon,
    title,
    body,
}: {
    icon: ReactNode;
    title: string;
    body: string;
}) {
    return (
        <div className="rounded-3xl border border-olive-200 bg-white p-6 shadow-cv-sm hover:shadow-cv-md transition duration-200">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-olive-50 text-olive-800">
                {icon}
            </div>
            <h2 className="mt-5 text-base font-black text-slate-900">{title}</h2>
            <p className="mt-2 text-sm font-normal leading-6 text-slate-500">{body}</p>
        </div>
    );
}
