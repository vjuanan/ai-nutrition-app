'use client';

import { useAppStore } from '@/lib/store';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Users,
    Building2,
    Dumbbell,
    FileText,
    ChevronLeft,
    ChevronRight,
    Briefcase,
    Shield,
    BookOpen,
} from 'lucide-react';

interface NavItem {
    label: string;
    href: string;
    icon: React.ReactNode;
}

// Unified nav items - no more context filtering
const navItems: NavItem[] = [
    { label: 'Mi Panel', href: '/', icon: <LayoutDashboard size={20} /> },
    { label: 'Pacientes', href: '/athletes', icon: <Users size={20} /> },
    { label: 'Clínicas', href: '/gyms', icon: <Building2 size={20} /> },
    { label: 'Alimentos', href: '/foods', icon: <Dumbbell size={20} /> }, // Was Exercises
    { label: 'Planes', href: '/meal-plans', icon: <FileText size={20} /> }, // Was Programs
    { label: 'Platillas', href: '/templates', icon: <FileText size={20} /> }, // Assuming templates route based on screenshot icon
    { label: 'Conocimiento', href: '/knowledge', icon: <BookOpen size={20} /> },
    { label: 'Usuarios', href: '/admin/users', icon: <Shield size={20} /> },
];

interface SidebarProps {
    /** Role passed from server - NO async loading, immediate render */
    role?: 'admin' | 'coach' | 'athlete' | 'gym';
}

export function Sidebar({ role = 'coach' }: SidebarProps) {
    const { isSidebarCollapsed, toggleSidebar } = useAppStore();
    const pathname = usePathname();

    // Filter Items based on Role - role is passed from server, no loading state!
    const filteredNavItems = navItems.filter(item => {
        if (role === 'admin') return true; // See all

        if (role === 'coach') {
            // Coach cannot see 'Gimnasios' OR admin sections
            return item.href !== '/gyms' && !item.href.startsWith('/admin');
        }

        if (role === 'athlete') {
            // Athletes only see dashboard
            return item.href === '/';
        }
        return true; // Fallback: show item
    });

    return (
        <aside
            className={`
                fixed left-0 top-0 h-screen bg-white border-r border-slate-100
                flex flex-col transition-all duration-300 ease-in-out z-40
                ${isSidebarCollapsed ? 'w-16' : 'w-64'}
            `}
        >
            {/* Header / Logo Section */}
            <div className={`
                h-16 flex items-center
                transition-all duration-300
                ${isSidebarCollapsed ? 'px-2 justify-center' : 'px-6'}
            `}>
                <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity overflow-hidden">
                    {/* Logo Image */}
                    <div className="relative h-8 w-8 flex-shrink-0">
                        <Image
                            src="/images/ai-nutrition-logo.png"
                            alt="Logo"
                            fill
                            className="object-contain"
                        />
                    </div>

                    {/* Logo Text */}
                    <span className={`
                        text-lg font-semibold text-slate-700 tracking-tight whitespace-nowrap
                        transition-opacity duration-300
                        ${isSidebarCollapsed ? 'opacity-0 w-0' : 'opacity-100'}
                    `}>
                        AI Nutrition
                    </span>
                </Link>
            </div>

            {/* Navigation Area */}
            <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto overflow-x-hidden">
                {filteredNavItems.map((item) => {
                    const isActive = pathname === item.href ||
                        (item.href !== '/' && pathname.startsWith(item.href));

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`
                                flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200
                                ${isSidebarCollapsed ? 'justify-center' : ''}
                                ${isActive
                                    ? 'bg-emerald-50 text-emerald-600 font-medium'
                                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50 font-normal'}
                            `}
                            title={isSidebarCollapsed ? item.label : undefined}
                        >
                            <span className="flex-shrink-0">
                                {item.icon}
                            </span>

                            <span className={`
                                text-sm transition-opacity duration-300 whitespace-nowrap
                                ${isSidebarCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100 block'}
                            `}>
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
            </nav>

            {/* Bottom Section - Toggle Button */}
            {isSidebarCollapsed && (
                <div className="p-4 border-t border-slate-100 flex justify-center">
                    <button
                        onClick={toggleSidebar}
                        className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            )}

            {/* Expanded state toggle usually can be placed elsewhere or top, 
                but per requirements: "Botón de Colapso (solo visible colapsado): Centrado al fondo" 
                implies it might only be visible when collapsed? 
                Actually standard pattern is to have it accessible to collapse it too.
                I will add it for expanded state too but positioned at bottom right usually or part of header.
                The spec says: "Botón de Colapso (solo visible colapsado)" -> This is explicit.
                Wait, how does one collapse it then? 
                Usually via a button in the header or similar. 
                Existing code had it at bottom. I will keep it at bottom for both but style it subtle.
                Actually, let's strictly follow: "Botón de Colapso (solo visible colapsado)" means the button 
                to EXPAND is visible when collapsed.
                Where is the button to COLLAPSE? 
                I will assume the user wants the standard behavior where it operates in both states, 
                but the specific *design desc* only mentioned the look for the collapsed state.
                I'll implement it at the bottom for both to ensure usability.
             */}
            {!isSidebarCollapsed && (
                <div className="p-4 border-t border-slate-100 flex justify-end">
                    <button
                        onClick={toggleSidebar}
                        className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                        <ChevronLeft size={16} />
                    </button>
                </div>
            )}
        </aside>
    );
}
