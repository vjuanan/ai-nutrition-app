'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { X, Save, Loader2 } from 'lucide-react';
import { createFood, updateFood } from '@/lib/actions';
import { toast } from 'sonner';
import { Food } from '@/lib/supabase/types';

interface FoodFormProps {
    food?: Food; // Optional for edit mode
    onClose: () => void;
    onSuccess: () => void;
}

const CATEGORIES = [
    { value: 'Proteína', label: 'Proteína' },
    { value: 'Carbohidratos', label: 'Carbohidratos' },
    { value: 'Grasas', label: 'Grasas' },
    { value: 'Frutas', label: 'Frutas' },
    { value: 'Verduras', label: 'Verduras' },
    { value: 'Lácteos', label: 'Lácteos' },
    { value: 'Otros', label: 'Otros' }
];

export function FoodForm({ food, onClose, onSuccess }: FoodFormProps) {
    const [isLoading, setIsLoading] = useState(false);

    const { register, handleSubmit, formState: { errors } } = useForm({
        defaultValues: {
            name: food?.name || '',
            brand: food?.brand || '',
            category: food?.category || 'Proteína',
            calories: food?.calories || 0,
            protein: food?.protein || 0,
            carbs: food?.carbs || 0,
            fats: food?.fats || 0,
            serving_size: food?.serving_size || 100,
            unit: food?.unit || 'g'
        }
    });

    const onSubmit = async (data: any) => {
        setIsLoading(true);
        try {
            // Convert numeric strings to numbers
            const formattedData = {
                ...data,
                calories: Number(data.calories),
                protein: Number(data.protein),
                carbs: Number(data.carbs),
                fats: Number(data.fats),
                serving_size: Number(data.serving_size)
            };

            let result;
            if (food) {
                result = await updateFood(food.id, formattedData);
            } else {
                result = await createFood(formattedData);
            }

            if (result.error) {
                toast.error(`Error: ${result.error}`);
            } else {
                toast.success(food ? 'Alimento actualizado' : 'Alimento creado');
                onSuccess();
            }
        } catch (error) {
            console.error(error);
            toast.error('Ocurrió un error inesperado');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

            {/* Basic Info */}
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-cv-text-secondary mb-1">Nombre del Alimento <span className="text-red-500">*</span></label>
                    <input
                        {...register('name', { required: 'El nombre es obligatorio' })}
                        className="w-full bg-white dark:bg-black/20 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-cv-text-primary focus:outline-none focus:ring-2 focus:ring-cv-accent/50"
                        placeholder="Ej: Pechuga de Pollo"
                    />
                    {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message as string}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-cv-text-secondary mb-1">Marca (Opcional)</label>
                        <input
                            {...register('brand')}
                            className="w-full bg-white dark:bg-black/20 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-cv-text-primary focus:outline-none focus:ring-2 focus:ring-cv-accent/50"
                            placeholder="Ej: Hacendado"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-cv-text-secondary mb-1">Categoría</label>
                        <select
                            {...register('category')}
                            className="w-full bg-white dark:bg-black/20 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-cv-text-primary focus:outline-none focus:ring-2 focus:ring-cv-accent/50"
                        >
                            {CATEGORIES.map(cat => (
                                <option key={cat.value} value={cat.value}>{cat.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                <h3 className="text-sm font-bold text-cv-text-primary mb-3">Información Nutricional</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-medium text-cv-text-secondary mb-1">Porción (Serving Size)</label>
                        <div className="flex gap-2">
                            <input
                                {...register('serving_size', { required: true, min: 0 })}
                                type="number" step="0.1"
                                className="w-full bg-white dark:bg-black/20 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-cv-text-primary focus:outline-none focus:ring-2 focus:ring-cv-accent/50"
                            />
                            <select
                                {...register('unit')}
                                className="w-24 bg-white dark:bg-black/20 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-cv-text-primary focus:outline-none focus:ring-2 focus:ring-cv-accent/50"
                            >
                                <option value="g">gramos (g)</option>
                                <option value="ml">mililitros (ml)</option>
                                <option value="unidad">unidad</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-cv-text-secondary mb-1">Calorías (Kcal)</label>
                        <input
                            {...register('calories', { required: true, min: 0 })}
                            type="number" step="0.1"
                            className="w-full bg-white dark:bg-black/20 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-cv-text-primary focus:outline-none focus:ring-2 focus:ring-cv-accent/50"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-blue-500 mb-1 uppercase">Proteína (g)</label>
                        <input
                            {...register('protein', { required: true, min: 0 })}
                            type="number" step="0.1"
                            className="w-full bg-white dark:bg-black/20 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-cv-text-primary focus:outline-none focus:ring-2 focus:ring-cv-accent/50"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-orange-500 mb-1 uppercase">Carbos (g)</label>
                        <input
                            {...register('carbs', { required: true, min: 0 })}
                            type="number" step="0.1"
                            className="w-full bg-white dark:bg-black/20 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-cv-text-primary focus:outline-none focus:ring-2 focus:ring-cv-accent/50"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-yellow-500 mb-1 uppercase">Grasas (g)</label>
                        <input
                            {...register('fats', { required: true, min: 0 })}
                            type="number" step="0.1"
                            className="w-full bg-white dark:bg-black/20 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-cv-text-primary focus:outline-none focus:ring-2 focus:ring-cv-accent/50"
                        />
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-cv-text-secondary hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    disabled={isLoading}
                    className="flex items-center gap-2 px-6 py-2 rounded-xl bg-cv-accent hover:bg-cv-accent/90 text-white shadow-lg shadow-cv-accent/20 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                    {food ? 'Guardar Cambios' : 'Crear Alimento'}
                </button>
            </div>
        </form>
    );
}
