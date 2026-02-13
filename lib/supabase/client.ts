import { createBrowserClient } from '@supabase/ssr';

// Factory function for client-side usage with cookies
export const createClient = () => {
    // Use placeholder during SSG build — real values available at runtime
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

    return createBrowserClient(
        supabaseUrl,
        supabaseKey
    );
};

// Lazy singleton — only created when accessed at runtime, not during SSG build
let _supabase: ReturnType<typeof createClient> | null = null;
export const supabase = new Proxy({} as ReturnType<typeof createClient>, {
    get(_, prop) {
        if (!_supabase) _supabase = createClient();
        return (_supabase as any)[prop];
    }
});
