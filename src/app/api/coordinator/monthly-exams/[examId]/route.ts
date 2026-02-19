import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** PATCH /api/coordinator/monthly-exams/[examId] — Activate/deactivate exam */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  const session = await auth();
  if (!session?.user?.role || session.user.role !== "COORDINATOR") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { examId } = await params;
  const body = await req.json();

  const exam = await prisma.monthlyExam.findUnique({ where: { id: examId } });
  if (!exam) {
    return NextResponse.json({ error: "Examen no encontrado" }, { status: 404 });
  }

  const updateData: Record<string, unknown> = {};
  if (typeof body.isActive === "boolean") {
    updateData.isActive = body.isActive;
  }
  if (body.availableFrom !== undefined) {
    updateData.availableFrom = body.availableFrom ? new Date(body.availableFrom) : null;
  }
  if (body.availableUntil !== undefined) {
    updateData.availableUntil = body.availableUntil ? new Date(body.availableUntil) : null;
  }

  const updated = await prisma.monthlyExam.update({
    where: { id: examId },
    data: updateData,
  });

  return NextResponse.json({ success: true, exam: updated });
}
