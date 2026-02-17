'use client';

import { useAppStore } from '@/lib/store';
import { getDashboardStats } from '@/lib/actions'; // Keep for getting the name
import {
    Users,
    Utensils,
    ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { NutritionalPlanWizard } from '@/components/app-shell/NutritionalPlanWizard';
import { motion } from 'framer-motion';

export default function DashboardPage() {
    const { currentView } = useAppStore();
    const [stats, setStats] = useState({
        userName: 'Coach'
    });
    const [isNutritionalWizardOpen, setIsNutritionalWizardOpen] = useState(false);

    useEffect(() => {
        async function fetchData() {
            try {
                // We only really need the user name for now, but keeping the call compatible
                const statsData = await getDashboardStats();
                setStats(curr => ({ ...curr, userName: statsData.userName || 'Coach' }));
            } catch (err) {
                console.error(err);
            }
        }
        fetchData();
    }, []);

    // Animation variants
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.2
            }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: { type: 'spring', stiffness: 50 }
        }
    };

    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background Atmosphere */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-primary/5 rounded-full blur-3xl" />
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-brand-secondary/5 rounded-full blur-3xl" />
            </div>

            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="z-10 w-full max-w-4xl text-center space-y-12"
            >
                {/* Hero Section */}
                <motion.div variants={itemVariants} className="space-y-4">
                    <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-cv-text-primary">
                        Bienvenido, <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500">{stats.userName}</span>
                    </h1>
                    <p className="text-xl text-cv-text-secondary font-light">
                        ¿Qué deseas hacer hoy?
                    </p>
                </motion.div>

                {/* Action Cards */}
                <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
                    {/* View Patients Card */}
                    <Link href="/athletes" className="group">
                        <div className="h-full p-8 rounded-2xl bg-cv-bg-secondary/50 backdrop-blur-xl border border-cv-border hover:border-emerald-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/10 hover:-translate-y-1 flex flex-col items-center text-center gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400/10 to-emerald-600/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                <Users size={32} className="text-emerald-500" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-2xl font-semibold text-cv-text-primary">Ver Pacientes</h3>
                                <p className="text-cv-text-tertiary">Gestiona tus atletas y sus progresos</p>
                            </div>
                            <div className="mt-auto pt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-2 group-hover:translate-y-0">
                                <span className="flex items-center gap-2 text-emerald-500 font-medium">
                                    Ir a pacientes <ArrowRight size={16} />
                                </span>
                            </div>
                        </div>
                    </Link>

                    {/* Create Nutrition Program Card */}
                    <button
                        onClick={() => setIsNutritionalWizardOpen(true)}
                        className="w-full text-left group"
                    >
                        <div className="h-full p-8 rounded-2xl bg-cv-bg-secondary/50 backdrop-blur-xl border border-cv-border hover:border-cyan-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10 hover:-translate-y-1 flex flex-col items-center text-center gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400/10 to-cyan-600/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                <Utensils size={32} className="text-cyan-500" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-2xl font-semibold text-cv-text-primary">Crear Programa</h3>
                                <p className="text-cv-text-tertiary">Diseña un nuevo plan nutricional</p>
                            </div>
                            <div className="mt-auto pt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-2 group-hover:translate-y-0">
                                <span className="flex items-center gap-2 text-cyan-500 font-medium">
                                    Comenzar ahora <ArrowRight size={16} />
                                </span>
                            </div>
                        </div>
                    </button>
                </motion.div>
            </motion.div>

            {/* Wizards */}
            <NutritionalPlanWizard
                isOpen={isNutritionalWizardOpen}
                onClose={() => setIsNutritionalWizardOpen(false)}
            />
        </div>
    );
}
