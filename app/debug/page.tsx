import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function DebugPage() {
    // 1. Safe Env Var Check
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // 2. Safe Connection Test
    let connectionResult: any = { status: 'Not Attempted' };

    try {
        const supabase = createServerClient();
        const { data, error } = await supabase.auth.getUser();
        if (error) {
            connectionResult = { status: 'Error', error };
        } else {
            connectionResult = { status: 'Success', user: data.user?.email || 'None' };
        }
    } catch (e: any) {
        connectionResult = { status: 'Crash during init/fetch', error: e.message, stack: e.stack };
    }

    return (
        <div className="p-8 space-y-4">
            <h1 className="text-2xl font-bold">Debug Info (Safe Mode)</h1>
            <div className="bg-gray-100 p-4 rounded-lg font-mono text-sm break-all">
                <p><strong>URL:</strong> {url || 'MISSING'}</p>
                <p><strong>Anon Key:</strong> {key ? `${key.substring(0, 5)}...${key.substring(key.length - 5)}` : 'MISSING'}</p>
                <p><strong>Service Role Key:</strong> {serviceKey ? 'PRESENT (Hidden)' : 'MISSING'}</p>
                <p><strong>Node Env:</strong> {process.env.NODE_ENV}</p>
            </div>

            <h2 className="text-xl font-bold mt-6">Supabase Connection Test</h2>
            <div className={`p-4 rounded-lg ${connectionResult.status === 'Success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                <pre className="text-xs overflow-auto">{JSON.stringify(connectionResult, null, 2)}</pre>
            </div>
        </div>
    );
}
