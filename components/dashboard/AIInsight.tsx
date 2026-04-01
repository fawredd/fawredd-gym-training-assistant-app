interface AIInsightProps {
    contenido: string | null;
    fecha: Date | null;
}

export function AIInsight({ contenido, fecha }: AIInsightProps) {
    return (
        <div className="mx-4 rounded-2xl border border-primary/30 bg-primary/5 p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    🤖 Ayuda Memoria (IA)
                </h2>
                {fecha && (
                    <span className="text-xs text-muted-foreground">
                        {fecha.toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
                    </span>
                )}
            </div>

            {contenido ? (
                <div className="text-sm text-foreground leading-relaxed space-y-2">
                    {contenido
                        .split("\n")
                        .map((line) => line.trim())
                        .filter(Boolean)
                        .map((line, i) => (
                            <p key={i}>{line}</p>
                        ))}
                </div>
            ) : (
                <p className="text-sm text-muted-foreground">
                    Aún no generaste una ayuda memoria. Cargá entrenamientos y generá tu primera recomendación.
                </p>
            )}
        </div>
    );
}
