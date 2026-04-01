interface MuscleGroup {
    nombre: string;
    dias: number;
}

interface WeeklySummaryProps {
    muscleGroups: MuscleGroup[]; // sorted desc
    totalDays: number; // out of 7
}

// Map of keywords in exercise names → muscle group labels
// This is used in the dashboard page to classify exercises on the server.

export function WeeklySummary({ muscleGroups, totalDays }: WeeklySummaryProps) {
    const top = muscleGroups[0];
    const least = muscleGroups[muscleGroups.length - 1];

    return (
        <div className="mx-4 rounded-2xl border border-border bg-card p-4 flex flex-col gap-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                📈 Resumen semanal
            </h2>

            {/* Frequency */}
            <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">{totalDays}/7</span>
                <span className="text-sm text-muted-foreground">días entrenados</span>
            </div>

            {/* Table */}
            {muscleGroups.length > 0 ? (
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-left text-xs text-muted-foreground uppercase tracking-wide border-b border-border">
                            <th className="pb-2 font-medium">Grupo muscular</th>
                            <th className="pb-2 font-medium text-right">Días</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {muscleGroups.map((mg) => (
                            <tr key={mg.nombre}>
                                <td className="py-2 font-medium capitalize">{mg.nombre}</td>
                                <td className="py-2 text-right tabular-nums">{mg.dias}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <p className="text-sm text-muted-foreground">Sin datos de la semana.</p>
            )}

            {/* Insights */}
            {muscleGroups.length > 0 && (
                <div className="border-t border-border pt-3 flex flex-col gap-1 text-sm">
                    {top && (
                        <p>
                            <span className="text-muted-foreground">Más trabajado: </span>
                            <span className="font-semibold capitalize">{top.nombre}</span>
                            <span className="text-muted-foreground"> ({top.dias} días)</span>
                        </p>
                    )}
                    {least && least.nombre !== top?.nombre && (
                        <p>
                            <span className="text-muted-foreground">Menos trabajado: </span>
                            <span className="font-semibold capitalize">{least.nombre}</span>
                            <span className="text-muted-foreground"> ({least.dias} días)</span>
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
