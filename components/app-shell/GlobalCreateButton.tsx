// Force rebuild: solo MAS final - 2026-02-02-1125
'use client';

import { useState, useRef, useEffect } from 'react';
import { useEscapeKey } from '@/hooks/use-escape-key';
import { useRouter, usePathname } from 'next/navigation';
import { Plus, Users, Building2, Dumbbell, Loader2 } from 'lucide-react';
import { ProgramSetupWizard } from './ProgramSetupWizard';

import { NutritionalPlanWizard } from './NutritionalPlanWizard';

export function GlobalCreateButton() {
    const [isOpen, setIsOpen] = useState(false);
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [isNutritionalWizardOpen, setIsNutritionalWizardOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const pathname = usePathname();

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEscapeKey(() => setIsOpen(false), isOpen);

    const handleCreateProgram = () => {
        setIsOpen(false);
        // Check context to decide which wizard to open
        if (pathname.includes('/meal-plans') || pathname.includes('/foods') || pathname.includes('/recipes')) {
            setIsNutritionalWizardOpen(true);
        } else {
            setIsWizardOpen(true);
        }
    };

    const menuItems = [
        {
            label: 'Nuevo Paciente', // Updated label for Nutrition
            icon: <Users size={16} />,
            href: '/athletes/new',
            color: 'text-blue-400'
        },
        {
            label: 'Nueva Clínica', // Updated label for Nutrition
            icon: <Building2 size={16} />,
            href: '/gyms/new',
            color: 'text-purple-400'
        },
        {
            label: 'Nuevo Plan', // Updated label
            icon: <Dumbbell size={16} />,
            action: handleCreateProgram,
            color: 'text-cv-accent' // Or green?
        },
    ];

    return (
        <>
            <div className="relative" ref={dropdownRef}>
                {/* Main Button */}
                <button
                    onClick={() => {
                        if (pathname === '/programs') {
                            setIsWizardOpen(true);
                        } else if (pathname === '/meal-plans') {
                            setIsNutritionalWizardOpen(true);
                        } else {
                            setIsOpen(!isOpen);
                        }
                    }}
                    className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-500 text-white shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:scale-105 active:scale-95 transition-all duration-200"
                    title="Crear..."
                >
                    <Plus size={20} className={`transition-transform duration-200 ${isOpen ? 'rotate-45' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {isOpen && (
                    <div className="absolute right-0 top-full mt-2 w-52 py-2 bg-cv-bg-secondary border border-cv-border rounded-lg shadow-cv-lg z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                        {menuItems.map((item, index) => (
                            item.href ? (
                                <a
                                    key={index}
                                    href={item.href}
                                    onClick={() => setIsOpen(false)}
                                    className="flex items-center gap-3 px-4 py-2.5 text-cv-text-secondary hover:text-cv-text-primary hover:bg-cv-bg-tertiary transition-colors"
                                >
                                    <span className={item.color}>{item.icon}</span>
                                    <span className="text-sm font-medium">{item.label}</span>
                                </a>
                            ) : (
                                <button
                                    key={index}
                                    onClick={item.action}
                                    className="flex items-center gap-3 px-4 py-2.5 w-full text-left text-cv-text-secondary hover:text-cv-text-primary hover:bg-cv-bg-tertiary transition-colors"
                                >
                                    <span className={item.color}>{item.icon}</span>
                                    <span className="text-sm font-medium">{item.label}</span>
                                </button>
                            )
                        ))}
                    </div>
                )}
            </div>

            {/* Program Setup Wizard Modal (Training) */}
            <ProgramSetupWizard
                isOpen={isWizardOpen}
                onClose={() => setIsWizardOpen(false)}
            />

            {/* Nutritional Plan Wizard Modal */}
            <NutritionalPlanWizard
                isOpen={isNutritionalWizardOpen}
                onClose={() => setIsNutritionalWizardOpen(false)}
            />
        </>
    );
}

