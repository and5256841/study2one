import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** POST /api/coordinator/students/[studentId]/unlock — Unlock simulacro for student */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  const session = await auth();
  if (!session?.user?.role || session.user.role !== "COORDINATOR") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { studentId } = await params;
  const body = await req.json();
  const { examId, reason } = body;

  if (!examId) {
    return NextResponse.json(
      { error: "examId es requerido" },
      { status: 400 }
    );
  }

  // Verify student exists
  const student = await prisma.user.findUnique({
    where: { id: studentId, role: "STUDENT" },
    select: { id: true, fullName: true },
  });
  if (!student) {
    return NextResponse.json({ error: "Estudiante no encontrado" }, { status: 404 });
  }

  // Verify exam exists
  const exam = await prisma.monthlyExam.findUnique({
    where: { id: examId },
    select: { id: true, title: true },
  });
  if (!exam) {
    return NextResponse.json({ error: "Examen no encontrado" }, { status: 404 });
  }

  // Check if already unlocked
  const existing = await prisma.manualUnlock.findUnique({
    where: { studentId_examId: { studentId, examId } },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Ya fue desbloqueado anteriormente" },
      { status: 409 }
    );
  }

  // Create unlock + notification in transaction
  await prisma.$transaction(async (tx) => {
    await tx.manualUnlock.create({
      data: {
        studentId,
        examId,
        unlockedById: session.user.id,
        reason: reason?.trim() || null,
      },
    });

    await tx.notification.create({
      data: {
        userId: studentId,
        senderId: session.user.id,
        title: "Simulacro desbloqueado",
        body: `${student.fullName.split(" ")[0]}, el coordinador te ha desbloqueado el ${exam.title}. ¡Ya puedes acceder!`,
        type: "COORDINATOR_MESSAGE",
        templateKey: "simulacro_unlocked",
      },
    });
  });

  return NextResponse.json({ success: true });
}
