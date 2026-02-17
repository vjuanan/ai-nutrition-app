'use client';

import { useState, useEffect } from 'react';
import { Loader2, Sparkles, AlertCircle, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

interface Alternative {
    name: string;
    reason: string;
    calories_per_100g: number;
    protein_per_100g: number;
}

interface SmartAlternativesModalProps {
    isOpen: boolean;
    onClose: () => void;
    foodName: string;
    onSelect: (alternativeName: string) => void;
}

export function SmartAlternativesModal({ isOpen, onClose, foodName, onSelect }: SmartAlternativesModalProps) {
    const [alternatives, setAlternatives] = useState<Alternative[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchAlternatives = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await fetch('/api/ai/alternatives', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ foodName }),
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch alternatives');
                }

                const data = await response.json();
                if (data.error) throw new Error(data.error);
                setAlternatives(data);
            } catch (err) {
                console.error(err);
                setError('Could not generate alternatives. Please ensure the API Key is configured.');
            } finally {
                setIsLoading(false);
            }
        };

        if (isOpen && foodName) {
            fetchAlternatives();
        }
    }, [isOpen, foodName]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-cv-bg-elevated rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="bg-gradient-to-r from-cv-accent to-cv-accent-muted p-4 text-white flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Sparkles size={20} />
                        <h3 className="font-bold text-lg">AI Alternatives</h3>
                    </div>
                </div>

                <div className="p-6">
                    <p className="text-cv-text-secondary mb-4">
                        Finding alternatives for <span className="font-bold text-cv-text-primary">&quot;{foodName}&quot;</span>
                    </p>

                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-8 gap-3">
                            <Loader2 size={32} className="animate-spin text-cv-accent" />
                            <p className="text-sm text-cv-text-tertiary">Consulting AI nutritionist...</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center py-6 text-center gap-2 text-red-500">
                            <AlertCircle size={32} />
                            <p className="text-sm">{error}</p>
                            <button
                                onClick={onClose}
                                className="mt-2 text-sm text-cv-text-tertiary hover:underline"
                            >
                                Close
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {alternatives.map((alt, idx) => (
                                <div
                                    key={idx}
                                    className="p-3 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-cv-accent hover:bg-cv-accent/5 transition-colors cursor-pointer group"
                                    onClick={() => {
                                        onSelect(alt.name);
                                        onClose();
                                    }}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <h4 className="font-bold text-cv-text-primary">{alt.name}</h4>
                                        <span className="text-xs text-cv-text-tertiary group-hover:text-cv-accent">
                                            Select <ArrowRight size={10} className="inline ml-1" />
                                        </span>
                                    </div>
                                    <p className="text-xs text-cv-text-secondary mb-2">{alt.reason}</p>
                                    <div className="flex gap-3 text-xs text-cv-text-tertiary bg-slate-50 dark:bg-slate-800/50 p-1.5 rounded">
                                        <span>🔥 ~{alt.calories_per_100g} kcal</span>
                                        <span>💪 ~{alt.protein_per_100g}g prot</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                    <button
                        onClick={onClose}
                        className="text-sm text-cv-text-tertiary hover:text-cv-text-primary px-3 py-1.5"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
