import React from 'react';

interface PageHeaderProps {
    title: string;
    description?: string;
    actions?: React.ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
    return (
        <div className="flex items-center justify-between py-4 mb-4">
            <div className="space-y-1">
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
                {description && (
                    <p className="text-sm text-slate-500">
                        {description}
                    </p>
                )}
            </div>
            {actions && (
                <div className="flex items-center gap-2">
                    {actions}
                </div>
            )}
        </div>
    );
}
