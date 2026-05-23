import { getUserRole } from '@/lib/actions';
import { DashboardShell } from '@/components/app-shell/DashboardShell';
import { AppProvider } from '@/lib/context/AppContext';

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Fetch role on server - this is INSTANT, no client-side loading flash!
    const role = await getUserRole();

    return (
        <AppProvider>
            <DashboardShell role={role}>
                {children}
            </DashboardShell>
        </AppProvider>
    );
}
