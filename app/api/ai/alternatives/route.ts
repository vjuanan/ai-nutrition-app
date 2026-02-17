import { NextRequest, NextResponse } from 'next/server';
import { getFoodAlternatives } from '@/lib/gemini';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { foodName, context } = body;

        if (!foodName) {
            return NextResponse.json({ error: 'Food name is required' }, { status: 400 });
        }

        const alternatives = await getFoodAlternatives(foodName, context);
        return NextResponse.json(alternatives);
    } catch (error) {
        console.error('Error in alternatives route:', error);
        return NextResponse.json({ error: 'Failed to generate alternatives', details: String(error) }, { status: 500 });
    }
}
