import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '../../../../db';
import { workouts, workoutExercises, users, aiLogs } from '../../../../db/schema';
import { eq } from 'drizzle-orm';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateObject } from 'ai';
import { z } from 'zod';

const openrouter = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY,
});

export async function POST(req: Request) {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const existingUser = await db.query.users.findFirst({
        where: eq(users.externalAuthId, userId),
    });
    if (!existingUser) return new NextResponse("User profile not found", { status: 404 });

    const body = await req.json();
    const { prompt, referenceDate } = body;
    if (!prompt || typeof prompt !== 'string') return new NextResponse("Prompt required", { status: 400 });
    if (!referenceDate) return new NextResponse("Reference Date required", { status: 400 });

    try {
        const { object } = await generateObject({
            model: openrouter('openrouter/free'),
            schema: z.object({
                workouts: z.array(z.object({
                    date: z.string().describe("ISO Date string (YYYY-MM-DD). Infer from text like 'monday', 'yesterday' based on the referenceDate. MUST BE PRESENT."),
                    exercises: z.array(z.object({
                        nombre: z.string().describe("Name of the exercise"),
                        series: z.number().int().default(1),
                        repeticiones: z.number().int().default(0),
                        peso: z.number().int().default(0).describe("Weight in kg. 0 if bodyweight or isometric."),
                        duracionSegundos: z.number().int().default(0).describe("Duration in seconds for isometric exercises like planks. 0 if inapplicable.")
                    }))
                }))
            }),
            prompt: `Reference Date (Hoy): ${referenceDate}\nExtract all workouts from the user's description. If no explicit day is mentioned but context implies a single workout, use the Reference Date. Never return workouts without a valid YYYY-MM-DD date. User description: "${prompt}"`,
        });

        // Insert into database
        const insertedData = [];
        for (const w of object.workouts) {
            const workoutId = crypto.randomUUID();
            await db.insert(workouts).values({
                id: workoutId,
                userId: existingUser.id,
                fecha: new Date(w.date),
            });

            if (w.exercises.length > 0) {
                const exRows = w.exercises.map(ex => ({
                    id: crypto.randomUUID(),
                    workoutId,
                    nombre: ex.nombre,
                    series: ex.series,
                    repeticiones: ex.repeticiones,
                    peso: ex.peso,
                    duracionSegundos: ex.duracionSegundos
                }));
                await db.insert(workoutExercises).values(exRows);
            }
            insertedData.push({ workoutId, date: w.date, numExercises: w.exercises.length });
        }

        // Log AI Interaction
        await db.insert(aiLogs).values({
            id: crypto.randomUUID(),
            userId: existingUser.id,
            requestPayload: prompt,
            responsePayload: JSON.stringify(object),
        });

        return NextResponse.json({ success: true, data: insertedData });
    } catch (error) {
        console.error("ETL Generation failed", error);
        return new NextResponse("ETL AI Parsing failed", { status: 500 });
    }
}
