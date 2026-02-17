'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Apple, AlertCircle, Mail, Lock, ChevronRight } from 'lucide-react';
import { login } from '@/app/auth/actions';
import Image from 'next/image';

export default function LoginPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);
    const router = useRouter();

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        const formData = new FormData(e.currentTarget);

        try {
            const result = await login(formData);

            if (result.error) {
                if (result.error.includes('Invalid login credentials')) {
                    throw new Error('Credenciales incorrectas. Por favor, verifica tu correo y contraseña.');
                }
                throw new Error(result.error);
            }

            if (result.needsOnboarding) {
                router.push('/onboarding');
            } else {
                router.push('/');
            }
            router.refresh();
        } catch (err: any) {
            setError(err.message || 'Error al iniciar sesión');
            setIsLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen w-full overflow-hidden flex items-center justify-center">
            {/* Background Video Layer */}
            <div className="absolute inset-0 z-0">
                <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover scale-105"
                    poster="/images/hero-nutrition-poster.png"
                >
                    <source src="/videos/hero-nutrition.mp4" type="video/mp4" />
                    {/* Fallback is the background color/image if video fails */}
                </video>
                {/* Overlay gradient for readability */}
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 via-slate-900/80 to-slate-900/40 backdrop-blur-[2px]" />

                {/* Floating Particles/Glow Effects */}
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl animate-float" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-500/20 rounded-full blur-3xl animate-float-delayed" />
            </div>

            {/* Main Content */}
            <div className={`relative z-10 w-full max-w-md px-4 transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>

                {/* Branding Section */}
                <div className="flex flex-col items-center mb-8 animate-fade-in-up delay-100">
                    <div className="relative group">
                        <div className="absolute inset-0 bg-emerald-500 blur-xl opacity-40 group-hover:opacity-60 transition-opacity duration-500 rounded-full" />
                        <div className="relative w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-2xl flex items-center justify-center shadow-2xl border border-white/10 group-hover:scale-105 transition-transform duration-500">
                            <Apple className="text-white drop-shadow-md" size={40} />
                        </div>
                    </div>

                    <h1 className="mt-6 text-4xl md:text-5xl font-bold text-center tracking-tight text-white drop-shadow-xl">
                        AI <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-200">Nutrition</span>
                    </h1>
                    <p className="mt-3 text-slate-300 text-center text-lg font-light tracking-wide">
                        Plataforma de Nutrición Inteligente
                    </p>
                </div>

                {/* Glassmorphism Card */}
                <div className="glass-card rounded-2xl p-8 animate-fade-in-up delay-200 ring-1 ring-white/10">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3 text-red-200 animate-in fade-in slide-in-from-top-2 backdrop-blur-sm">
                                <AlertCircle size={20} className="shrink-0 text-red-400" />
                                <span className="text-sm font-medium">{error}</span>
                            </div>
                        )}

                        <div className="space-y-5">
                            <div className="group space-y-2">
                                <label className="text-xs uppercase tracking-wider font-semibold text-slate-400 ml-1">
                                    Correo Electrónico
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Mail className="h-5 w-5 text-slate-400 group-focus-within:text-emerald-400 transition-colors" />
                                    </div>
                                    <input
                                        name="email"
                                        type="email"
                                        className="w-full pl-11 pr-4 py-3.5 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all hover:bg-slate-900/70"
                                        placeholder="coach@ejemplo.com"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="group space-y-2">
                                <div className="flex justify-between items-center ml-1">
                                    <label className="text-xs uppercase tracking-wider font-semibold text-slate-400">
                                        Contraseña
                                    </label>
                                    <a
                                        href="/auth/forgot-password"
                                        className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors font-medium"
                                    >
                                        ¿Olvidaste tu contraseña?
                                    </a>
                                </div>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-emerald-400 transition-colors" />
                                    </div>
                                    <input
                                        name="password"
                                        type="password"
                                        className="w-full pl-11 pr-4 py-3.5 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all hover:bg-slate-900/70"
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="group relative w-full py-4 px-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden transform active:scale-[0.98]"
                        >
                            {/* Shimmer Effect */}
                            <div className="absolute inset-0 -translate-x-full group-hover:animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                            <div className="relative flex items-center justify-center gap-2">
                                {isLoading ? (
                                    <>
                                        <Loader2 className="animate-spin" size={20} />
                                        <span>Entrando...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Iniciar Sesión</span>
                                        <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </div>
                        </button>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-white/10"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-transparent text-slate-400">o</span>
                            </div>
                        </div>

                        <div className="text-center">
                            <p className="text-slate-400 text-sm">
                                ¿No tienes cuenta?{' '}
                                <a
                                    href="/auth/signup"
                                    className="text-white hover:text-emerald-300 font-semibold transition-colors inline-flex items-center gap-1 group/link"
                                >
                                    Registrarse
                                    <span className="block max-w-0 group-hover/link:max-w-full transition-all duration-300 h-0.5 bg-emerald-400"></span>
                                </a>
                            </p>
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <p className="mt-8 text-center text-xs text-slate-500/80 animate-fade-in-up delay-300">
                    &copy; {new Date().getFullYear()} EPN Store. Todos los derechos reservados.
                </p>
            </div>
        </div>
    );
}
