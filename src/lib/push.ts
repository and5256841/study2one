import webpush from "web-push";
import { prisma } from "./prisma";

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY!;

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(
    "mailto:study2one@study2one.com",
    VAPID_PUBLIC,
    VAPID_PRIVATE
  );
}

export async function sendPushToUser(userId: string, title: string, body: string, url?: string) {
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  });

  const payload = JSON.stringify({ title, body, url: url || "/dashboard" });

  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dhKey, auth: sub.authKey },
        },
        payload
      )
    )
  );

  // Clean up invalid subscriptions
  for (let i = 0; i < results.length; i++) {
    if (results[i].status === "rejected") {
      await prisma.pushSubscription.delete({
        where: { id: subscriptions[i].id },
      }).catch(() => {});
    }
  }

  return results.filter((r) => r.status === "fulfilled").length;
}

export async function sendPushToAll(title: string, body: string, url?: string) {
  const subscriptions = await prisma.pushSubscription.findMany();
  const payload = JSON.stringify({ title, body, url: url || "/dashboard" });

  await Promise.allSettled(
    subscriptions.map((sub) =>
      webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dhKey, auth: sub.authKey },
        },
        payload
      )
    )
  );
}
