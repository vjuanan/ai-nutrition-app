'use client';

import { Modal } from '@/components/ui/Modal';
import { FoodForm } from '@/components/foods/FoodForm';

interface FoodCreationModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialName?: string;
    onSuccess: (food: any) => void;
}

export function FoodCreationModal({ isOpen, onClose, initialName, onSuccess }: FoodCreationModalProps) {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Crear Nuevo Alimento"
            maxWidth="max-w-xl"
        >
            <FoodForm
                initialName={initialName}
                onClose={onClose}
                onSuccess={(food) => {
                    onSuccess(food);
                }}
            />
        </Modal>
    );
}
