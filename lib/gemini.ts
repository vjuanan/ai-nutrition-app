import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY;

let genAI: GoogleGenerativeAI | null = null;
if (apiKey) {
    genAI = new GoogleGenerativeAI(apiKey);
}

export async function getFoodAlternatives(foodName: string, context?: string) {
    if (!genAI) {
        throw new Error('GEMINI_API_KEY is not set');
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const prompt = `
        Act as a professional nutritionist. I need 3 nutritious alternatives for "${foodName}".
        Context: ${context || 'General healthy diet'}.
        
        Return ONLY a raw JSON array with objects containing:
        - name: string (Name of the food)
        - reason: string (Why it is a good alternative, max 10 words)
        - calories_per_100g: number (approximate)
        - protein_per_100g: number (approximate)
        
        Example:
        [
            {"name": "Turkey Breast", "reason": "Leaner protein source", "calories_per_100g": 135, "protein_per_100g": 30},
            ...
        ]
    `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Clean up markdown code blocks if present
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();

        return JSON.parse(jsonStr);
    } catch (error) {
        console.error('Error generating alternatives:', error);
        return [];
    }
}
