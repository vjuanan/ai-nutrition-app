import { useState, useEffect } from 'react';
import { getAllFoodsLight } from '@/lib/actions';

// Singleton cache to share data across all inputs in the app
let globalFoodCache: any[] | null = null;
let globalFetchPromise: Promise<any[]> | null = null;

export function useFoodCache() {
    const [foods, setFoods] = useState<any[]>(globalFoodCache || []);
    const [isLoading, setIsLoading] = useState(!globalFoodCache);

    useEffect(() => {
        // If we already have data, just set it
        if (globalFoodCache) {
            if (foods.length === 0) setFoods(globalFoodCache);
            setIsLoading(false);
            return;
        }

        // If a fetch is already in progress, wait for it
        if (globalFetchPromise) {
            globalFetchPromise.then(data => {
                setFoods(data);
                setIsLoading(false);
            });
            return;
        }

        // Otherwise, start the fetch
        globalFetchPromise = getAllFoodsLight().then(data => {
            globalFoodCache = data || [];
            return globalFoodCache;
        }).catch(err => {
            console.error('Failed to pre-fetch foods', err);
            return [];
        });

        globalFetchPromise.then(data => {
            setFoods(data);
            setIsLoading(false);
        });

    }, []);

    const searchLocal = (query: string) => {
        const lowerQuery = query ? query.toLowerCase().trim() : '';

        return (foods || []).filter(food =>
            food.name.toLowerCase().includes(lowerQuery)
        ).slice(0, 50); // Limit results for performance
    };

    return {
        foods,
        searchLocal,
        isLoading
    };
}

