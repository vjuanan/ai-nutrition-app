'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { getClients, updateNutritionalPlan } from '@/lib/actions';
import { Loader2, Search, User, Dumbbell, Check } from 'lucide-react';
import { toast } from 'sonner';

interface ProgramAssignmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    programId: string;
    currentClientId: string | null;
    initialClientType?: 'patient' | 'clinic' | null;
    onAssignSuccess: (clientId: string | null, clientName: string | null, clientType: 'patient' | 'clinic' | null) => void;
}

export function ProgramAssignmentModal({
    isOpen,
    onClose,
    programId,
    currentClientId,
    initialClientType,
    onAssignSuccess
}: ProgramAssignmentModalProps) {
    const [activeTab, setActiveTab] = useState<'patient' | 'clinic'>('patient');
    const [clients, setClients] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Set initial tab based on current assignment
    useEffect(() => {
        if (isOpen && initialClientType) {
            setActiveTab(initialClientType);
        }
    }, [isOpen, initialClientType]);

    // Load clients when tab changes or modal opens
    useEffect(() => {
        if (!isOpen) return;

        async function loadClients() {
            setIsLoading(true);
            try {
                const data = await getClients(activeTab);
                setClients(data || []);
            } catch (error) {
                console.error('Error loading clients:', error);
                toast.error('Error al cargar lista de clientes');
            } finally {
                setIsLoading(false);
            }
        }

        loadClients();
    }, [isOpen, activeTab]);

    const filteredClients = clients.filter(client =>
        client.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleAssign = async (clientId: string | null, clientName: string | null) => {
        setIsSaving(true);
        try {
            // Using updateNutritionalPlan to update client_id
            const result = await updateNutritionalPlan(programId, {
                client_id: clientId
            });

            if (!result.success) {
                throw new Error(result.error);
            }

            console.log('Assignment Result', result);

            onAssignSuccess(clientId, clientName, clientId ? activeTab : null);
            toast.success(clientId ? `Asignado a ${clientName}` : 'Asignación eliminada');
            onClose();
        } catch (error: any) {
            console.error('Error assigning plan:', error);
            toast.error(`Error al guardar la asignación: ${error.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Asignar Plan Nutricional"
            description="Selecciona un Atleta o Gimnasio para asignar este plan."
            maxWidth="max-w-xl"
        >
            <div className="flex flex-col h-[60vh]">
                {/* Tabs */}
                <div className="flex items-center gap-4 mb-4 border-b border-white/10 pb-4">
                    <button
                        onClick={() => setActiveTab('patient')}
                        className={`pb-2 px-1 text-sm font-medium transition-colors relative ${activeTab === 'patient'
                            ? 'text-cv-accent'
                            : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        Pacientes
                        {activeTab === 'patient' && (
                            <span className="absolute bottom-[-17px] left-0 right-0 h-0.5 bg-cv-accent" />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('clinic')}
                        className={`pb-2 px-1 text-sm font-medium transition-colors relative ${activeTab === 'clinic'
                            ? 'text-cv-accent'
                            : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        Clínicas
                        {activeTab === 'clinic' && (
                            <span className="absolute bottom-[-17px] left-0 right-0 h-0.5 bg-cv-accent" />
                        )}
                    </button>
                </div>

                {/* Search */}
                <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                    <input
                        type="text"
                        placeholder={`Buscar ${activeTab === 'patient' ? 'paciente' : 'clínica'}...`}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-black/20 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cv-accent/50"
                    />
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                    {isLoading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="animate-spin text-cv-accent" size={24} />
                        </div>
                    ) : filteredClients.length > 0 ? (
                        filteredClients.map((client) => {
                            const isSelected = currentClientId === client.id;
                            return (
                                <button
                                    key={client.id}
                                    onClick={() => handleAssign(client.id, client.name)}
                                    disabled={isSaving}
                                    className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${isSelected
                                        ? 'bg-cv-accent/10 border-cv-accent/50'
                                        : 'bg-white/5 border-transparent hover:bg-white/10'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${activeTab === 'patient' ? 'bg-blue-500/20 text-blue-400' : 'bg-orange-500/20 text-orange-400'
                                            }`}>
                                            {activeTab === 'patient' ? <User size={18} /> : <Dumbbell size={18} />}
                                        </div>
                                        <div className="text-left">
                                            <p className={`font-medium ${isSelected ? 'text-cv-accent' : 'text-white'}`}>
                                                {client.name}
                                            </p>
                                            {client.email && (
                                                <p className="text-xs text-gray-500">{client.email}</p>
                                            )}
                                        </div>
                                    </div>
                                    {isSelected && <Check size={18} className="text-cv-accent" />}
                                </button>
                            );
                        })
                    ) : (
                        <div className="text-center py-8 text-gray-500">
                            No se encontraron resultados
                        </div>
                    )}
                </div>

                {/* Footer - Unassign option */}
                {currentClientId && (
                    <div className="mt-4 pt-4 border-t border-white/10 flex justify-end">
                        <button
                            onClick={() => handleAssign(null, null)}
                            disabled={isSaving}
                            className="text-red-400 hover:text-red-300 text-sm font-medium px-4 py-2 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                            {isSaving ? 'Guardando...' : 'Quitar asignación'}
                        </button>
                    </div>
                )}
            </div>
        </Modal>
    );
}
