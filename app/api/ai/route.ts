import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '../../../db';
import { workouts, users, aiMemories, aiLogs } from '../../../db/schema';
import { eq, desc } from 'drizzle-orm';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText } from 'ai';
import { kv } from '@vercel/kv';

const openrouter = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY,
});

export async function POST() {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const existingUser = await db.query.users.findFirst({
        where: eq(users.externalAuthId, userId),
    });
    if (!existingUser) return new NextResponse("User profile not found", { status: 404 });

    // Rate Limiting logic using Vercel KV
    try {
        const rateLimitKey = `rl_ai_${existingUser.id}`;
        const lastGenerated = await kv.get<number>(rateLimitKey);
        const twelveHoursInMs = 12 * 60 * 60 * 1000;
        if (lastGenerated && (Date.now() - lastGenerated < twelveHoursInMs)) {
            return new NextResponse("Rate limit exceeded. Please wait 12h.", { status: 429 });
        }
        await kv.set(rateLimitKey, Date.now(), { px: twelveHoursInMs });
    } catch (e) {
        console.warn("KV Rate Limiter failed, skipping strict limit for dev/local.", e);
    }

    const recentWorkouts = await db.query.workouts.findMany({
        where: eq(workouts.userId, existingUser.id),
        orderBy: [desc(workouts.fecha)],
        limit: 7,
        with: { exercises: true }
    });

    const promptText = `
Genera una sugerencia de entrenamiento (ayuda memoria) y no asumas cosas que no están especificadas.
Objetivo del usuario: ${existingUser.objetivo || "Mejora general"}. Experiencia: ${existingUser.experiencia || "Desconocida"}.
Últimos entrenamientos (formato JSON): ${JSON.stringify(recentWorkouts)}
Crea un texto estructurado en Markdown que incluya: 1. Un resumen breve; 2. Recomendación concreta para el siguiente día; 3. Ajustes precisos si aplica.
Evita incluir explicaciones extra de por qué haces la recomendación o comentarios no pedidos.
    `;

    try {
        const { text } = await generateText({
            model: openrouter('openrouter/free'),
            prompt: promptText,
        });

        await db.insert(aiLogs).values({
            id: crypto.randomUUID(),
            userId: existingUser.id,
            requestPayload: promptText,
            responsePayload: text,
        });

        await db.insert(aiMemories).values({
            id: crypto.randomUUID(),
            userId: existingUser.id,
            contenido: text
        });

        return NextResponse.json({ suggestion: text });
    } catch (error) {
        console.error("AI Generation failed", error);

        // Log the failure
        await db.insert(aiLogs).values({
            id: crypto.randomUUID(),
            userId: existingUser.id,
            requestPayload: promptText,
            responsePayload: `ERROR: ${error instanceof Error ? error.message : "Unknown API Error"}`,
        });

        return new NextResponse("AI Generation Error", { status: 500 });
    }
}
