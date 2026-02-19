import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** GET /api/notifications/unread-count — Unread count for badge */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const count = await prisma.notification.count({
    where: { userId: session.user.id, isRead: false },
  });

  return NextResponse.json({ count });
}
