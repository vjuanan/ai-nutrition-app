import { PageHeader } from '@/components/ui/PageHeader';
import { Topbar } from '@/components/app-shell/Topbar';
import { getFoods } from '@/lib/actions';
import { FoodList } from '@/components/foods/FoodList';

export default async function FoodsPage({
    searchParams
}: {
    searchParams: { q?: string; category?: string; page?: string }
}) {
    const query = searchParams.q || '';
    const category = searchParams.category || 'all';
    const page = Number(searchParams.page) || 1;
    const limit = 50;

    const { data: foods, count } = await getFoods({
        query,
        category,
        page,
        limit
    });

    return (
        <>
            <Topbar />
            <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
                <PageHeader
                    title="Alimentos"
                    description="Gestiona tu base de datos de alimentos. Añade información nutricional detallada para usar en tus planes."
                />

                <FoodList
                    initialFoods={foods || []}
                    totalCount={count || 0}
                    initialCategory={category}
                    initialQuery={query}
                />
            </div>
        </>
    );
}
