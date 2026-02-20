'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import {
    Download,
    FileText,
    Image as ImageIcon,
    Loader2,
    Target,
    X
} from 'lucide-react';
import type { DraftDay } from '@/lib/store';
import { toast } from 'sonner';

interface NutritionPlanExporterProps {
    isOpen: boolean;
    onClose: () => void;
    planName: string;
    days: DraftDay[];
}

type ExportFormat = 'png' | 'pdf';

const EXPORT_COLORS = {
    pageBg: '#f8fafc',
    cardBg: '#ffffff',
    textPrimary: '#0f172a',
    textSecondary: '#334155',
    textMuted: '#64748b',
    border: '#e2e8f0',
    accent: '#0ea5e9',
};

const MOBILE_EXPORT_WIDTH = 430;
const PDF_MARGIN = 18;

type MealMetrics = {
    id: string;
    name: string;
    time?: string | null;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    itemsLabel: string;
};

type DayMetrics = {
    id: string;
    name: string;
    trainingSlot: string;
    targetCalories: number;
    targetProtein: number;
    totalCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFats: number;
    caloriePct: number;
    proteinPct: number;
    meals: MealMetrics[];
};

function calculateMealMacros(meal: DraftDay['meals'][number]) {
    return meal.items.reduce((acc, item) => {
        const factor = item.quantity / (item.food?.serving_size || 100);
        acc.calories += (item.food?.calories || 0) * factor;
        acc.protein += (item.food?.protein || 0) * factor;
        acc.carbs += (item.food?.carbs || 0) * factor;
        acc.fats += (item.food?.fats || 0) * factor;
        return acc;
    }, { calories: 0, protein: 0, carbs: 0, fats: 0 });
}

function formatTrainingSlot(slot?: string | null) {
    switch (slot) {
        case 'rest': return 'Descanso';
        case 'morning': return 'Mañana';
        case 'afternoon': return 'Tarde';
        case 'night': return 'Noche';
        default: return 'Mañana';
    }
}

function progressTone(pct: number) {
    if (pct < 90) return '#f59e0b';
    if (pct <= 105) return '#10b981';
    return '#ef4444';
}

function sanitizeFilename(name: string) {
    return name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9-_ ]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .toLowerCase();
}

async function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
    return await new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (!blob) {
                reject(new Error('No se pudo generar la imagen de exportación'));
                return;
            }
            resolve(blob);
        }, 'image/png');
    });
}

function triggerBlobDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 500);
}

function createCanvasSlice(source: HTMLCanvasElement, y: number, height: number) {
    const slice = document.createElement('canvas');
    slice.width = source.width;
    slice.height = height;
    const ctx = slice.getContext('2d');
    if (!ctx) throw new Error('No se pudo preparar una página de PDF');
    ctx.drawImage(source, 0, y, source.width, height, 0, 0, source.width, height);
    return slice;
}

async function exportPdfFromCanvas(canvas: HTMLCanvasElement, filename: string) {
    const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4',
        compress: true,
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const renderWidth = pageWidth - (PDF_MARGIN * 2);
    const renderHeight = pageHeight - (PDF_MARGIN * 2);

    // Convert available page height to source-canvas pixels to create clean slices.
    const pxPerPt = canvas.width / renderWidth;
    const sliceHeightPx = Math.floor(renderHeight * pxPerPt);

    let y = 0;
    let pageIndex = 0;
    while (y < canvas.height) {
        const currentSliceHeight = Math.min(sliceHeightPx, canvas.height - y);
        const sliceCanvas = createCanvasSlice(canvas, y, currentSliceHeight);
        const imageData = sliceCanvas.toDataURL('image/png');
        const pageRenderHeight = currentSliceHeight / pxPerPt;

        if (pageIndex > 0) pdf.addPage();
        pdf.addImage(
            imageData,
            'PNG',
            PDF_MARGIN,
            PDF_MARGIN,
            renderWidth,
            pageRenderHeight,
            undefined,
            'FAST'
        );

        y += currentSliceHeight;
        pageIndex += 1;
    }

    pdf.save(filename);
}

export function NutritionPlanExporter({ isOpen, onClose, planName, days }: NutritionPlanExporterProps) {
    const exportRef = useRef<HTMLDivElement>(null);
    const [isExporting, setIsExporting] = useState(false);
    const [format, setFormat] = useState<ExportFormat>('pdf');

    useEffect(() => {
        if (!isOpen) return;
        const onEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onEsc);
        return () => window.removeEventListener('keydown', onEsc);
    }, [isOpen, onClose]);

    const dayMetrics = useMemo<DayMetrics[]>(() => {
        return days
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((day) => {
                const meals = day.meals
                    .slice()
                    .sort((a, b) => a.order - b.order)
                    .map((meal) => {
                        const macros = calculateMealMacros(meal);
                        return {
                            id: meal.id,
                            name: meal.name,
                            time: meal.time,
                            calories: macros.calories,
                            protein: macros.protein,
                            carbs: macros.carbs,
                            fats: macros.fats,
                            itemsLabel: meal.items
                                .map((item) => `${item.food?.name || 'Alimento'} ${item.quantity}${item.food?.unit || 'g'}`)
                                .join(', ')
                        };
                    });

                const totals = meals.reduce((acc, meal) => ({
                    calories: acc.calories + meal.calories,
                    protein: acc.protein + meal.protein,
                    carbs: acc.carbs + meal.carbs,
                    fats: acc.fats + meal.fats
                }), { calories: 0, protein: 0, carbs: 0, fats: 0 });

                const targetCalories = day.target_calories || 3100;
                const targetProtein = day.target_protein || 176;
                const caloriePct = targetCalories > 0 ? (totals.calories / targetCalories) * 100 : 0;
                const proteinPct = targetProtein > 0 ? (totals.protein / targetProtein) * 100 : 0;

                return {
                    id: day.id,
                    name: day.name || `Día ${day.order + 1}`,
                    trainingSlot: formatTrainingSlot(day.training_slot),
                    targetCalories,
                    targetProtein,
                    totalCalories: totals.calories,
                    totalProtein: totals.protein,
                    totalCarbs: totals.carbs,
                    totalFats: totals.fats,
                    caloriePct,
                    proteinPct,
                    meals,
                };
            });
    }, [days]);

    const summary = useMemo(() => {
        return dayMetrics.reduce((acc, day) => {
            acc.calories += day.totalCalories;
            acc.protein += day.totalProtein;
            return acc;
        }, { calories: 0, protein: 0 });
    }, [dayMetrics]);

    const handleExport = async () => {
        if (!exportRef.current) {
            toast.error('No se pudo inicializar el contenido a exportar.');
            return;
        }

        if (dayMetrics.length === 0) {
            toast.error('No hay contenido para exportar.');
            return;
        }

        setIsExporting(true);
        try {
            const width = exportRef.current.scrollWidth;
            const height = exportRef.current.scrollHeight;
            const exportScale = Math.min(2, Math.max(1.4, window.devicePixelRatio || 1.6));
            const canvas = await html2canvas(exportRef.current, {
                backgroundColor: EXPORT_COLORS.pageBg,
                scale: exportScale,
                useCORS: true,
                logging: false,
                width,
                height,
                windowWidth: width,
                windowHeight: height,
                scrollX: 0,
                scrollY: 0,
            });

            const baseFilename = sanitizeFilename(planName) || 'plan-nutricional';
            if (format === 'png') {
                const blob = await canvasToBlob(canvas);
                triggerBlobDownload(blob, `${baseFilename}-mobile.png`);
                toast.success('PNG exportado');
            } else {
                await exportPdfFromCanvas(canvas, `${baseFilename}-mobile.pdf`);
                toast.success('PDF exportado');
            }
        } catch (error) {
            console.error('Nutrition export failed', error);
            toast.error('Falló la exportación. Reintenta en unos segundos.');
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        className="fixed inset-4 z-50 bg-cv-bg-secondary rounded-xl border border-cv-border shadow-cv-xl flex flex-col overflow-hidden"
                    >
                        <div className="flex items-center justify-between px-4 py-3 border-b border-cv-border bg-cv-bg-secondary shrink-0">
                            <div>
                                <h2 className="font-semibold text-cv-text-primary">Exportar Plan Nutricional</h2>
                                <p className="text-xs text-cv-text-tertiary">
                                    Vista semanal con objetivos y macros por comida
                                </p>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="flex bg-cv-bg-tertiary rounded-lg p-1">
                                    <button
                                        onClick={() => setFormat('pdf')}
                                        className={`px-3 py-1 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${format === 'pdf' ? 'bg-cv-accent text-white' : 'text-cv-text-secondary hover:text-cv-text-primary'
                                            }`}
                                    >
                                        <FileText size={14} />
                                        PDF
                                    </button>
                                    <button
                                        onClick={() => setFormat('png')}
                                        className={`px-3 py-1 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${format === 'png' ? 'bg-cv-accent text-white' : 'text-cv-text-secondary hover:text-cv-text-primary'
                                            }`}
                                    >
                                        <ImageIcon size={14} />
                                        PNG
                                    </button>
                                </div>

                                <button
                                    onClick={handleExport}
                                    disabled={isExporting}
                                    className="cv-btn-primary"
                                >
                                    {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                                    {isExporting ? 'Exportando...' : 'Exportar'}
                                </button>

                                <button onClick={onClose} className="cv-btn-ghost p-2">
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto p-4 md:p-6 bg-cv-bg-primary">
                            <div
                                ref={exportRef}
                                style={{
                                    width: '100%',
                                    maxWidth: `${MOBILE_EXPORT_WIDTH}px`,
                                    margin: '0 auto',
                                    backgroundColor: EXPORT_COLORS.pageBg,
                                    borderRadius: '16px',
                                    padding: '14px',
                                    color: EXPORT_COLORS.textPrimary,
                                    fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
                                }}
                            >
                                <div
                                    style={{
                                        backgroundColor: EXPORT_COLORS.cardBg,
                                        border: `1px solid ${EXPORT_COLORS.border}`,
                                        borderRadius: '14px',
                                        padding: '14px',
                                        marginBottom: '14px',
                                    }}
                                >
                                    <div>
                                        <h1 style={{ fontSize: '20px', fontWeight: 700, margin: 0, lineHeight: 1.2 }}>{planName}</h1>
                                        <p style={{ margin: '6px 0 0', color: EXPORT_COLORS.textMuted, fontSize: '12px' }}>
                                            Plan semanal proteico - volumen limpio (80kg)
                                        </p>
                                        <p style={{ margin: '6px 0 0', color: EXPORT_COLORS.textMuted, fontSize: '11px' }}>
                                            Formato optimizado para celular (PDF y PNG)
                                        </p>
                                    </div>
                                    <div style={{ marginTop: '10px' }}>
                                        <p style={{ margin: 0, fontSize: '11px', color: EXPORT_COLORS.textMuted }}>
                                            Total semanal
                                        </p>
                                        <p style={{ margin: '4px 0 0', fontWeight: 700, fontSize: '14px' }}>
                                            {Math.round(summary.calories)} kcal | {Math.round(summary.protein)} g proteína
                                        </p>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gap: '16px' }}>
                                    {dayMetrics.map((day) => (
                                        <div
                                            key={day.id}
                                            style={{
                                                backgroundColor: EXPORT_COLORS.cardBg,
                                                border: `1px solid ${EXPORT_COLORS.border}`,
                                                borderRadius: '14px',
                                                padding: '12px',
                                            }}
                                        >
                                            <div style={{ marginBottom: '10px' }}>
                                                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700 }}>
                                                    {day.name}
                                                </h3>
                                                <p style={{ margin: '4px 0 0', fontSize: '11px', color: EXPORT_COLORS.textMuted }}>
                                                    Slot de entreno: {day.trainingSlot}
                                                </p>
                                            </div>

                                            <div style={{ fontSize: '12px', color: EXPORT_COLORS.textSecondary, marginBottom: '10px' }}>
                                                <div>Objetivo: {Math.round(day.targetCalories)} kcal / {Math.round(day.targetProtein)} g proteína</div>
                                                <div>Logrado: {Math.round(day.totalCalories)} kcal / {Math.round(day.totalProtein)} g proteína</div>
                                            </div>

                                            <div style={{ display: 'grid', gap: '8px', marginBottom: '12px' }}>
                                                <div>
                                                    <div style={{ fontSize: '11px', color: EXPORT_COLORS.textMuted, marginBottom: '4px' }}>
                                                        Progreso calórico ({Math.round(day.caloriePct)}%)
                                                    </div>
                                                    <div style={{ height: '7px', borderRadius: '999px', background: '#e2e8f0', overflow: 'hidden' }}>
                                                        <div
                                                            style={{
                                                                width: `${Math.min(day.caloriePct, 100)}%`,
                                                                height: '100%',
                                                                background: progressTone(day.caloriePct),
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '11px', color: EXPORT_COLORS.textMuted, marginBottom: '4px' }}>
                                                        Progreso proteína ({Math.round(day.proteinPct)}%)
                                                    </div>
                                                    <div style={{ height: '7px', borderRadius: '999px', background: '#e2e8f0', overflow: 'hidden' }}>
                                                        <div
                                                            style={{
                                                                width: `${Math.min(day.proteinPct, 100)}%`,
                                                                height: '100%',
                                                                background: progressTone(day.proteinPct),
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div style={{ display: 'grid', gap: '8px' }}>
                                                {day.meals.map((meal) => (
                                                    <div
                                                        key={meal.id}
                                                        style={{
                                                            border: `1px solid ${EXPORT_COLORS.border}`,
                                                            borderRadius: '10px',
                                                            padding: '10px',
                                                            backgroundColor: '#fcfdff',
                                                        }}
                                                    >
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' }}>
                                                            <div style={{ fontSize: '12px', fontWeight: 700 }}>
                                                                {meal.name}{meal.time ? ` (${meal.time})` : ''}
                                                            </div>
                                                            <div style={{ fontSize: '11px', color: EXPORT_COLORS.textSecondary }}>
                                                                {Math.round(meal.calories)} kcal
                                                            </div>
                                                        </div>
                                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: '6px', marginBottom: '6px' }}>
                                                            <span style={{ fontSize: '11px', color: EXPORT_COLORS.textSecondary }}>P: {Math.round(meal.protein)}g</span>
                                                            <span style={{ fontSize: '11px', color: EXPORT_COLORS.textSecondary }}>C: {Math.round(meal.carbs)}g</span>
                                                            <span style={{ fontSize: '11px', color: EXPORT_COLORS.textSecondary }}>G: {Math.round(meal.fats)}g</span>
                                                        </div>
                                                        <div style={{ fontSize: '10px', lineHeight: 1.4, color: EXPORT_COLORS.textMuted }}>
                                                            {meal.itemsLabel}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            <div
                                                style={{
                                                    marginTop: '10px',
                                                    borderTop: `1px solid ${EXPORT_COLORS.border}`,
                                                    paddingTop: '8px',
                                                    fontSize: '11px',
                                                    color: EXPORT_COLORS.textSecondary,
                                                    display: 'grid',
                                                    gap: '2px'
                                                }}
                                            >
                                                <span>Resumen diario: {Math.round(day.totalCalories)} kcal / {Math.round(day.totalProtein)} g proteína</span>
                                                <span>Carbos: {Math.round(day.totalCarbs)} g | Grasas: {Math.round(day.totalFats)} g</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div
                                    style={{
                                        marginTop: '14px',
                                        fontSize: '10px',
                                        color: EXPORT_COLORS.textMuted,
                                        display: 'grid',
                                        gap: '6px',
                                    }}
                                >
                                    <span>Generado desde AI Nutrition</span>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Target size={12} color={EXPORT_COLORS.accent} />
                                        Objetivo dinámico por día (kcal + proteína)
                                    </span>
                                    <span>{new Date().toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
