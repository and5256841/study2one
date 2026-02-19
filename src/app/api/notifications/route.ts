import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** GET /api/notifications — List student notifications */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = 20;
  const skip = (page - 1) * limit;

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        title: true,
        body: true,
        type: true,
        templateKey: true,
        isRead: true,
        createdAt: true,
      },
    }),
    prisma.notification.count({
      where: { userId: session.user.id },
    }),
  ]);

  return NextResponse.json({
    notifications,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}
