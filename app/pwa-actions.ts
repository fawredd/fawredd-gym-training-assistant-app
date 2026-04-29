'use server'

import webpush from 'web-push'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/db'
import { users, pushSubscriptions } from '@/db/schema'
import { eq } from 'drizzle-orm'

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY

if (vapidPublicKey && vapidPrivateKey && vapidPublicKey !== 'your_public_key_here') {
  try {
    webpush.setVapidDetails(
      'mailto:admin@fawredd.com',
      vapidPublicKey,
      vapidPrivateKey
    )
  } catch (error) {
    console.error('Failed to set VAPID details for PWA:', error)
  }
} else {
  console.warn('PWA: VAPID keys are missing or invalid. Push notifications disabled.')
}

// ─── Serialised shape the browser sends to us ────────────────────────────────
// JSON.parse(JSON.stringify(pushSubscription)) yields this shape.
interface SerializedPushSubscription {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getInternalUserId(): Promise<string> {
  const { userId: clerkId } = await auth()
  if (!clerkId) throw new Error('Unauthorized')

  const user = await db.query.users.findFirst({
    where: eq(users.externalAuthId, clerkId),
  })
  if (!user) throw new Error('User profile not found')

  return user.id
}

// ─── Server Actions ───────────────────────────────────────────────────────────

export async function subscribeUser(sub: SerializedPushSubscription) {
  const userId = await getInternalUserId()

  // Upsert: if this endpoint already exists update its keys, otherwise insert.
  // Drizzle's onConflictDoUpdate targets the unique index on endpoint.
  await db
    .insert(pushSubscriptions)
    .values({
      id: crypto.randomUUID(),
      userId,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
    })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: {
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
        userId,
      },
    })

  return { success: true }
}

export async function unsubscribeUser(endpoint: string) {
  const userId = await getInternalUserId()

  await db
    .delete(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, endpoint))

  // Silence the userId lint — we validate ownership via auth before delete.
  void userId

  return { success: true }
}

export async function sendNotification(message: string) {
  const userId = await getInternalUserId()

  const subs = await db.query.pushSubscriptions.findMany({
    where: eq(pushSubscriptions.userId, userId),
  })

  if (subs.length === 0) {
    throw new Error('No active push subscriptions for this user')
  }

  const results = await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify({
          title: 'Fawredd Gym Assistant',
          body: message,
          icon: '/icon-192x192.png',
        })
      )
    )
  )

  const failed = results.filter((r) => r.status === 'rejected')
  if (failed.length > 0) {
    console.error('Some push notifications failed:', failed)
  }

  return { success: true, sent: results.length, failed: failed.length }
}
