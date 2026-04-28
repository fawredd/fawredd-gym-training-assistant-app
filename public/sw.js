// Fawredd Gym Assistant — Service Worker

self.addEventListener('install', () => {
  console.log('Service Worker installed')
  self.skipWaiting()
})

self.addEventListener('activate', () => {
  console.log('Service Worker activated')
  self.clients.claim()
})

// Handle incoming push messages
self.addEventListener('push', function (event) {
  if (event.data) {
    const data = event.data.json()
    const options = {
      body: data.body,
      icon: data.icon || '/icon-192x192.png',
      badge: '/icon-192x192.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: '1',
      },
    }
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    )
  }
})

// Handle notification clicks — open the app
self.addEventListener('notificationclick', function (event) {
  console.log('Notification click received.')
  event.notification.close()
  event.waitUntil(
    clients.openWindow(self.registration.scope)
  )
})
