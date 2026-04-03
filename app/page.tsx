import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-card px-4 bg-linear-to-br from-primary/10 via-card to-secondary/10">
      <div className="max-w-xl w-full text-center space-y-8 mt-[-10vh]">
        <div className="space-y-4">
          <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl text-transparent bg-clip-text bg-linear-to-r from-primary to-secondary pb-2">
            Fawredd Gym
          </h1>
          <p className="text-xl text-muted-foreground max-w-md mx-auto leading-relaxed">
            Tu asistente personal de entrenamiento impulsado por Inteligencia Artificial.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-8">
          <Link
            href="/dashboard"
            className="w-full sm:w-auto px-8 py-3 font-semibold text-card-foreground bg-primary rounded-xl hover:bg-primary/90 transition shadow-md hover:shadow-lg"
          >
            Ir al Dashboard
          </Link>
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
