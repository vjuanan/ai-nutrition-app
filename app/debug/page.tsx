import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function DebugPage() {
    const supabase = createServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    // Check if env vars are set (without exposing full secrets)
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    return (
        <div className="p-8 space-y-4">
            <h1 className="text-2xl font-bold">Debug Info</h1>
            <div className="bg-gray-100 p-4 rounded-lg font-mono text-sm break-all">
                <p><strong>URL:</strong> {url || 'MISSING'}</p>
                <p><strong>Anon Key:</strong> {key ? `${key.substring(0, 5)}...${key.substring(key.length - 5)}` : 'MISSING'}</p>
                <p><strong>Service Role Key:</strong> {serviceKey ? 'PRESENT (Hidden)' : 'MISSING'}</p>
                <p><strong>Node Env:</strong> {process.env.NODE_ENV}</p>
            </div>

            <h2 className="text-xl font-bold mt-6">Supabase Connection Test</h2>
            <div className={`p-4 rounded-lg ${error ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                {error ? (
                    <>
                        <p><strong>Error:</strong> {error.message}</p>
                        <pre className="mt-2 text-xs overflow-auto">{JSON.stringify(error, null, 2)}</pre>
                    </>
                ) : (
                    <p><strong>Success:</strong> Connection established. User: {user ? user.email : 'None (Unauthenticated)'}</p>
                )}
            </div>
        </div>
    );
}
