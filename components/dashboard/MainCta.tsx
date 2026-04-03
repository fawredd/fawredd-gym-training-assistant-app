import Link from "next/link";

export function MainCta() {
  return (
    <div className="px-4 pt-4">
      <Link
        href="/entrenamientos"
        className="flex items-center justify-center gap-2 w-full rounded-2xl bg-primary text-primary-foreground font-semibold text-lg py-4 shadow-lg active:scale-95 transition-transform"
      >
        <span className="text-2xl">🏋️</span>
        Registrar entrenamiento
      </Link>
    </div>
  );
}
