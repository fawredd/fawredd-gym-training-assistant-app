import { ChartData } from "@/lib/muscleGraphData";
import MiniProgressChart from "./MiniProgressChart";

interface MuscleGroup {
    nombre: string;
    dias: number;
}

interface PeriodSummaryProps {
    muscleGroups: MuscleGroup[]; // sorted desc
    totalDays: number; 
    chartData: ChartData; // for potential future use in a graph
}

// Map of keywords in exercise names → muscle group labels
// This is used in the dashboard page to classify exercises on the server.

export function PeriodSummary({ muscleGroups, totalDays, chartData }: PeriodSummaryProps) {
    const top = muscleGroups[0];
    const least = muscleGroups[muscleGroups.length - 1];

    return (
        <div className="mx-4 rounded-2xl border border-border bg-card p-4 flex flex-col gap-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                📈 Resumen
            </h2>

            {/* Frequency */}
            <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">{totalDays}/20</span>
                <span className="text-sm text-muted-foreground">días entrenados</span>
            </div>

            {/* Table */}
            {muscleGroups.length > 0 ? (
                <table className="w-full text-sm border-collapse border-spacing-x-2">
                    <thead>
                        <tr className="text-left text-xs text-muted-foreground uppercase tracking-wide border-b border-border">
                            <th className="pb-2 font-medium">Grupo muscular</th>
                            <th className="pb-2 font-medium text-center px-2">Días</th>
                            <th className="pb-2 font-medium text-center px-2">Evolución</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {muscleGroups.map((mg) => (
                            <tr key={mg.nombre}>
                                <td className="py-2 font-medium capitalize">{mg.nombre}</td>
                                <td className="py-2 text-center tabular-nums">{mg.dias}</td>
                                <td className="p-0 m-0 text-center">
                                    <MiniProgressChart data={chartData[mg.nombre]} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <p className="text-sm text-muted-foreground">Sin datos.</p>
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
