import { PageHeader } from '@/components/ui/PageHeader';
import { Topbar } from '@/components/app-shell/Topbar';


export default function KnowledgePage() {
    return (
        <>
            <Topbar />
            <div className="max-w-7xl mx-auto">
                <PageHeader
                    title="Conocimiento"
                    description="Base de conocimiento para la creación de planes nutricionales basados en evidencia científica."
                />

                <div className="bg-cv-bg-secondary rounded-xl p-12 text-center border border-cv-border">
                    <div className="w-16 h-16 bg-cv-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="32"
                            height="32"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-cv-accent"
                        >
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-cv-text-primary mb-2">
                        Base de Conocimiento Nutricional
                    </h3>
                    <p className="text-cv-text-secondary max-w-md mx-auto">
                        Estamos preparando una base de datos completa con principios de nutrición, guías de suplementación y estrategias dietéticas para tus pacientes.
                    </p>
                    <div className="mt-6 inline-flex items-center px-4 py-2 bg-cv-accent/10 text-cv-accent rounded-full text-sm font-medium">
                        Próximamente
                    </div>
                </div>
            </div>
        </>
    );
}
