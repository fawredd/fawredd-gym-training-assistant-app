import Link from "next/link";

export default function ObjectiveCard({
  objective,
}: {
  objective: string | null;
}) {
  return (
    <div className="mx-4 bg-card p-4 rounded-xl shadow-sm border border-border">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold">Objetivo actual</h2>
        <Link
          href="/entrenamientos/objective"
          className="text-xs text-primary hover:underline"
        >
          {objective ? "Editar" : "Agregar"}
        </Link>
      </div>
      {objective ? (
        <p className="text-sm text-foreground">{objective}</p>
      ) : (
        <div className="text-sm text-muted-foreground">
          No hay objetivo definido.{" "}
          <Link
            href="/entrenamientos/objective"
            className="text-primary underline"
          >
            Agregar objetivo
          </Link>
        </div>
      )}
    </div>
  );
}
