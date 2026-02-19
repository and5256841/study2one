import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** PATCH /api/notifications/[notificationId] — Mark as read */
export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ notificationId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { notificationId } = await params;

  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification || notification.userId !== session.user.id) {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  }

  await prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });

  return NextResponse.json({ success: true });
}
