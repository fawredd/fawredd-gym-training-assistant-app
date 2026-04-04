interface DailyStatusProps {
    trainedToday: boolean;
    lastAiSnippet: string | null;
}

export function DailyStatus({ trainedToday, lastAiSnippet }: DailyStatusProps) {
    return (
        <div className="mx-4 rounded-2xl border border-border bg-card p-4 flex flex-col gap-3">
            {/* Today status badge */}
            <div className="flex items-center gap-3">
                <span className={`text-3xl ${trainedToday ? "" : "grayscale opacity-60"}`}>
                    {trainedToday ? "✅" : "⏳"}
                </span>
                <div>
                    <p className="font-semibold text-base leading-tight">
                        {trainedToday ? "¡Ya entrenaste hoy!" : "No registraste entrenamiento hoy"}
                    </p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        {trainedToday
                            ? "Buen trabajo, mantén el ritmo."
                            : "Aprovecha el día — registra tu sesión ahora."}
                    </p>
                </div>
            </div>

            {/* AI hint */}
            {lastAiSnippet && (
                <div className="border-t border-border pt-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                        💡 Recomendación IA
                    </p>
                    {/* Show first non-empty line only (1-line snippet) */}
                    <p className="text-sm text-foreground line-clamp-2 leading-relaxed">
                        {lastAiSnippet
                            .split("\n")
                            .map((l) => l.trim())
                            .filter(Boolean)[0]}
                    </p>
                </div>
            )}
        </div>
    );
}
