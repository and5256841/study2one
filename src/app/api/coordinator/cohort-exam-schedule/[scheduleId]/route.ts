import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** DELETE /api/coordinator/cohort-exam-schedule/[scheduleId] — Remove a schedule */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ scheduleId: string }> }
) {
  const session = await auth();
  if (!session?.user?.role || session.user.role !== "COORDINATOR") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { scheduleId } = await params;

  const schedule = await prisma.cohortExamSchedule.findUnique({
    where: { id: scheduleId },
    include: { cohort: { select: { coordinatorId: true } } },
  });

  if (!schedule) {
    return NextResponse.json({ error: "Programación no encontrada" }, { status: 404 });
  }

  if (schedule.cohort.coordinatorId !== session.user.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  await prisma.cohortExamSchedule.delete({ where: { id: scheduleId } });

  return NextResponse.json({ success: true });
}
