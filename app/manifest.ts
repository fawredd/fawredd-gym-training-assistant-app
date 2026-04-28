import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Fawredd Gym Assistant',
    short_name: 'Fawredd',
    description: 'Tu asistente personal de entrenamiento impulsado por Inteligencia Artificial.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0d0d1a',
    theme_color: '#7c3aed',
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
