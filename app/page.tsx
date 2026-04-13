import { auth } from "@clerk/nextjs/server";
import Link from 'next/link';
import { redirect } from "next/navigation";

export default async function Home() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 m-4">
      <div className="max-w-xl w-full text-center space-y-8 mt-[-10vh]">
        <div className="space-y-4">
          <h1 className="text-3xl font-extrabold sm:text-4xl pb-2">
            Fawredd Gym app
          </h1>
          <p className="text-xl text-muted-foreground max-w-md mx-auto leading-relaxed">
            Tu asistente personal de entrenamiento impulsado por Inteligencia Artificial.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-8">
          <Link
            href="/sign-in"
            className="w-full sm:w-auto px-8 py-3 font-semibold text-primary bg-card border border-border rounded-xl hover:bg-muted transition shadow-sm"
          >
            Iniciar Sesión
          </Link>
        </div>
      </div>

      <div className="absolute bottom-8 text-center text-sm text-muted-foreground">
        <p>Registra tus rutinas, controla tu volumen térmico y mejora tus marcas.</p>
      </div>
    </div>
  );
}
