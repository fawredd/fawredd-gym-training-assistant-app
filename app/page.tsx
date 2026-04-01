import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white px-4 bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="max-w-xl w-full text-center space-y-8 mt-[-10vh]">
        <div className="space-y-4">
          <h1 className="text-5xl font-extrabold tracking-tight text-gray-900 sm:text-6xl text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 pb-2">
            Fawredd Gym
          </h1>
          <p className="text-xl text-gray-600 max-w-md mx-auto leading-relaxed">
            Tu asistente personal de entrenamiento impulsado por Inteligencia Artificial.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-8">
          <Link
            href="/dashboard"
            className="w-full sm:w-auto px-8 py-3 font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition shadow-md hover:shadow-lg"
          >
            Ir al Dashboard
          </Link>
          <Link
            href="/sign-in"
            className="w-full sm:w-auto px-8 py-3 font-semibold text-indigo-700 bg-white border border-indigo-200 rounded-xl hover:bg-indigo-50 transition shadow-sm"
          >
            Iniciar Sesión
          </Link>
        </div>
      </div>

      <div className="absolute bottom-8 text-center text-sm text-gray-400">
        <p>Registra tus rutinas, controla tu volumen térmico y mejora tus marcas.</p>
      </div>
    </div>
  );
}
