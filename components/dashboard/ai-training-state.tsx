import { db } from "@/db";
import { trainingStates, users } from "@/db/schema";
import { auth } from "@clerk/nextjs/server";
import { format, parseISO } from "date-fns";
import { desc, eq } from "drizzle-orm";

const FIELDS_TO_RENDER = [
  "priorityGoals",
  "secondaryGoals",
  "progressionFocus",
  "weakAreas",
  "recoveryNotes",
  "weeklyStrategy",
  "recommendationNext",
  "evolutionAnalysis",
] as const;
type RenderField = (typeof FIELDS_TO_RENDER)[number];
const FIELD_LABELS: Record<RenderField, string> = {
  priorityGoals: "Objetivos principales",
  secondaryGoals: "Objetivos secundarios",
  progressionFocus: "Foco de progresión",
  weakAreas: "Áreas débiles",
  recoveryNotes: "Notas de recuperación",
  weeklyStrategy: "Estrategia semanal",
  recommendationNext: "Próxima recomendación",
  evolutionAnalysis: "Análisis de evolución",
};
function renderMultilineText(text: string) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, i) => <p key={i}>{line}</p>);
}

export async function AITrainingState() {
  const { userId } = await auth();
  if (!userId) return null;

  const existingUser = await db.query.users.findFirst({
    where: eq(users.externalAuthId, userId),
  });
  if (!existingUser) return null;

  const latestState = await db.query.trainingStates.findFirst({
    where: eq(trainingStates.userId, existingUser.id),
    orderBy: [desc(trainingStates.createdAt)],
  });

  return (
    <div className="mx-4 rounded-2xl border border-primary/30 bg-primary/5 p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          🤖 Entrenador (IA)
        </h2>
        <span className="text-xs text-muted-foreground">
          {format(latestState?.createdAt || new Date(), "dd-MM-yyyy")}
        </span>
      </div>
      {latestState?.evolutionAnalysis ? (
        <div className="text-sm text-foreground leading-relaxed space-y-2">
          <ul className="list-disc list-inside space-y-2">
            {FIELDS_TO_RENDER.map((field) => (
              <li key={field} className="space-y-1">
                <span className="font-bold">{FIELD_LABELS[field]}</span>
                {renderMultilineText(latestState[field])}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Aún no se genero un plan de entrenamiento.
        </p>
      )}
    </div>
  );
}
