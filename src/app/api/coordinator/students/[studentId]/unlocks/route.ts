import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** GET /api/coordinator/students/[studentId]/unlocks — Unlock history */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  const session = await auth();
  if (!session?.user?.role || session.user.role !== "COORDINATOR") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { studentId } = await params;

  const unlocks = await prisma.manualUnlock.findMany({
    where: { studentId },
    include: {
      exam: { select: { id: true, title: true, number: true } },
      unlockedBy: { select: { fullName: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    unlocks: unlocks.map((u) => ({
      id: u.id,
      examId: u.exam.id,
      examTitle: u.exam.title,
      examNumber: u.exam.number,
      unlockedBy: u.unlockedBy.fullName,
      reason: u.reason,
      createdAt: u.createdAt,
    })),
  });
}
