'use client';

import { useState, useEffect, useRef } from 'react';
import { searchFoods } from '@/lib/actions';
import { Search, Loader2, Utensils } from 'lucide-react';

interface FoodAutocompleteProps {
    value: string;
    onChange: (value: string) => void;
    // Optional: Pass full food object back
    onSelect?: (food: any) => void;
    placeholder?: string;
    className?: string;
    inputRef?: React.RefObject<HTMLInputElement>;
}

export function FoodAutocomplete({
    value,
    onChange,
    onSelect,
    placeholder = "Buscar alimento...",
    className,
    inputRef
}: FoodAutocompleteProps) {
    const [query, setQuery] = useState(value);
    const [results, setResults] = useState<any[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const internalRef = useRef<HTMLInputElement>(null);

    // Use external ref if provided, otherwise internal
    const actualInputRef = inputRef || internalRef;

    // Debounce logic manually since we don't have the hook file yet
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (query.trim().length < 2) {
                setResults([]);
                return;
            }

            // Don't search if the query exactly matches the current value (prevents searching on selection)
            if (query === value) return;

            setIsLoading(true);
            try {
                const data = await searchFoods(query);
                setResults(data || []);
                setIsOpen(true);
            } catch (error) {
                console.error(error);
            } finally {
                setIsLoading(false);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [query, value]);

    // Sync internal state with external value prop
    useEffect(() => {
        setQuery(value);
    }, [value]);

    // Click outside to close
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (food: any) => {
        setQuery(food.name);
        onChange(food.name);
        if (onSelect) onSelect(food);
        setIsOpen(false);
    };

    return (
        <div ref={wrapperRef} className="relative w-full">
            <div className="relative">
                <input
                    ref={actualInputRef}
                    type="text"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        onChange(e.target.value); // Allow free text typing
                    }}
                    onFocus={() => query.length >= 2 && setIsOpen(true)}
                    placeholder={placeholder}
                    className={`${className} pr-8`}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 text-cv-text-tertiary">
                    {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                </div>
            </div>

            {isOpen && results.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-cv-bg-elevated border border-cv-border rounded-lg shadow-cv-lg max-h-60 overflow-y-auto transform transition-all">
                    {results.map((food) => (
                        <button
                            key={food.id}
                            onClick={() => handleSelect(food)}
                            className="w-full text-left px-3 py-2 text-sm text-cv-text-secondary hover:bg-cv-bg-tertiary hover:text-cv-text-primary transition-colors flex flex-col gap-0.5 border-b border-cv-border last:border-0"
                        >
                            <div className="flex justify-between items-center">
                                <span className="font-medium">{food.name}</span>
                                <span className="text-xs text-cv-text-tertiary">{food.calories} kcal</span>
                            </div>
                            <span className="text-xs text-cv-text-tertiary flex items-center gap-1">
                                {food.brand && <span className="text-cv-accent">{food.brand} • </span>}
                                <span>{food.category || 'General'}</span>
                                <span className="ml-auto">
                                    P: {food.protein} | C: {food.carbs} | F: {food.fats}
                                </span>
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
