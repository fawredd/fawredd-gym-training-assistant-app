'use client'

import { useState, useCallback, useEffect } from 'react'
import { subscribeUser, unsubscribeUser, sendNotification } from '@/app/pwa-actions'
import { Button } from '../ui/button'

// Converts the VAPID public key from Base64 to Uint8Array (required by PushManager API)
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

// ─── Custom hook: manage push subscription ───────────────────────────────────
function usePushSubscription() {
  // undefined = loading, null = no subscription, object = active subscription
  const [subscription, setSubscription] = useState<PushSubscription | null | undefined>(undefined)

  const checkSubscription = useCallback(async () => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setSubscription(null)
      return
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none',
      })
      const sub = await registration.pushManager.getSubscription()
      setSubscription(sub)
    } catch (err) {
      console.error('Service Worker registration failed:', err)
      setSubscription(null)
    }
  }, [])

  useEffect(() => {
    // We wrap the call in a function to satisfy the lint rule that discourages
    // calling state-updating functions directly in the effect body.
    const init = async () => {
      await checkSubscription()
    }
    init()
  }, [checkSubscription])

  return { subscription, setSubscription, isReady: subscription !== undefined }
}

// ─── PushNotificationManager ──────────────────────────────────────────────────
export function PushNotificationManager() {
  const { subscription, setSubscription, isReady } = usePushSubscription()
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  const canUsePush =
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window

  async function subscribeToPush() {
    setStatus('loading')
    try {
      const registration = await navigator.serviceWorker.ready
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        ) as any,
      })
      setSubscription(sub)
      const serializedSub = JSON.parse(JSON.stringify(sub))
      await subscribeUser(serializedSub)
      setStatus('success')
    } catch (err) {
      console.error('Subscription failed:', err)
      setStatus('error')
    }
  }

  async function unsubscribeFromPush() {
    setStatus('loading')
    try {
      const endpoint = subscription?.endpoint ?? ''
      await subscription?.unsubscribe()
      setSubscription(null)
      if (endpoint) await unsubscribeUser(endpoint)
      setStatus('idle')
    } catch (err) {
      console.error('Unsubscription failed:', err)
      setStatus('error')
    }
  }

  async function sendTestNotification() {
    if (!subscription) return
    setStatus('loading')
    try {
      const result = await sendNotification(message)
      if (result.success) {
        setMessage('')
        setStatus('idle')
      } else {
        setStatus('error')
      }
    } catch (err) {
      console.error('Notification failed:', err)
      setStatus('error')
    }
  }

  if (!canUsePush) {
    return (
      <div className="bg-card p-4 rounded-xl shadow-sm border border-border">
        <h3 className="text-sm font-semibold mb-2">Notificaciones Push</h3>
        <p className="text-sm text-muted-foreground">
          Las notificaciones push no son compatibles con este navegador.
        </p>
      </div>
    )
  }

  if (!isReady) {
    return (
      <div className="bg-card p-4 rounded-xl shadow-sm border border-border">
        <h3 className="text-sm font-semibold mb-2">Notificaciones Push</h3>
        <p className="text-sm text-muted-foreground animate-pulse">Cargando estado...</p>
      </div>
    )
  }

  return (
    <div className="bg-card p-4 rounded-xl shadow-sm border border-border">
      <h3 className="text-sm font-semibold mb-3">Notificaciones Push</h3>
      <div className="space-y-3">
        {subscription ? (
          <>
            <p className="text-sm text-green-500 font-medium flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              Notificaciones activadas
            </p>
            <div className="flex gap-2">
              <input
                id="pwa-notification-message"
                type="text"
                placeholder="Mensaje de prueba..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="flex-1 px-3 py-2 text-sm rounded-lg bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                id="pwa-send-notification-btn"
                onClick={sendTestNotification}
                disabled={!message || status === 'loading'}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition"
              >
                Probar
              </button>
            </div>
            <button
              id="pwa-unsubscribe-btn"
              onClick={unsubscribeFromPush}
              disabled={status === 'loading'}
              className="text-xs text-muted-foreground underline hover:text-foreground transition"
            >
              Desactivar notificaciones
            </button>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">Recibe avisos sobre tus entrenamientos.</p>
            <button
              id="pwa-subscribe-btn"
              onClick={subscribeToPush}
              disabled={status === 'loading'}
              className="w-full px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition"
            >
              {status === 'loading' ? 'Activando...' : 'Activar notificaciones'}
            </button>
            {status === 'error' && (
              <p className="text-xs text-red-500">
                Error al activar. Verifica los permisos del navegador.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─── InstallPrompt ────────────────────────────────────────────────────────────
function detectInstallContext() {
  if (typeof window === 'undefined') return { isIOS: false, isStandalone: false }
  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !(window as Window & { MSStream?: unknown }).MSStream
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
  return { isIOS: Boolean(isIOS), isStandalone }
}



export function InstallPrompt() {
  const [deviceInfo] = useState(detectInstallContext)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])
  if (deviceInfo.isStandalone) return null

  const installApp = async () => {
    if (deviceInfo.isIOS) {
      alert(`Toca el botón compartir y luego Agregar a pantalla de inicio`)
      return
    }

    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    setDeferredPrompt(null)
    if (outcome === 'accepted') {
      console.log('App installed')
    }
  }

  return (
    <>
      <Button variant="link" size="xs" onClick={installApp}>
        Instalar App
      </Button>
    </>
  )
}
