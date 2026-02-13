// Force dynamic rendering to prevent SSG prerender issues with Supabase client
export const dynamic = 'force-dynamic';

export default function OnboardingLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
