import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** GET /api/coordinator/monthly-exams/[examId]/analytics — Detailed metrics */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  const session = await auth();
  if (!session?.user?.role || session.user.role !== "COORDINATOR") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { examId } = await params;

  const exam = await prisma.monthlyExam.findUnique({
    where: { id: examId },
    include: {
      sections: {
        orderBy: { orderIndex: "asc" },
        select: { id: true, sectionNumber: true, title: true, totalQuestions: true, isWriting: true, durationMinutes: true },
      },
    },
  });

  if (!exam) {
    return NextResponse.json({ error: "Simulacro no encontrado" }, { status: 404 });
  }

  // Get all attempts with full detail
  const attempts = await prisma.monthlyExamAttempt.findMany({
    where: { examId },
    include: {
      student: { select: { id: true, fullName: true, pseudonym: true } },
      sectionAttempts: {
        include: {
          section: { select: { sectionNumber: true, title: true, totalQuestions: true, isWriting: true } },
        },
      },
    },
    orderBy: { startedAt: "desc" },
  });

  const studentResults = attempts.map((attempt) => ({
    studentId: attempt.student.id,
    studentName: attempt.student.pseudonym || attempt.student.fullName || "Sin nombre",
    isCompleted: attempt.isCompleted,
    totalScore: attempt.totalScore,
    startedAt: attempt.startedAt,
    sections: attempt.sectionAttempts
      .sort((a, b) => a.section.sectionNumber - b.section.sectionNumber)
      .map((sa) => ({
        sectionNumber: sa.section.sectionNumber,
        title: sa.section.title,
        status: sa.status,
        totalCorrect: sa.totalCorrect,
        totalQuestions: sa.section.totalQuestions,
        isWriting: sa.section.isWriting,
        timeSpentSeconds: sa.timeSpentSeconds,
        tabSwitches: sa.tabSwitches,
        totalAnswerChanges: sa.totalAnswerChanges,
        writingWordCount: sa.writingWordCount,
      })),
  }));

  // Aggregates
  const completedAttempts = attempts.filter((a) => a.isCompleted);
  const scores = completedAttempts
    .filter((a) => a.totalScore !== null)
    .map((a) => a.totalScore!);
  const avgScore = scores.length > 0
    ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100
    : null;
  const sortedScores = [...scores].sort((a, b) => a - b);
  const mid = Math.floor(sortedScores.length / 2);
  const medianScore = sortedScores.length > 0
    ? sortedScores.length % 2 === 0
      ? Math.round((sortedScores[mid - 1] + sortedScores[mid]) / 2)
      : sortedScores[mid]
    : null;

  return NextResponse.json({
    exam: {
      id: exam.id,
      title: exam.title,
      number: exam.number,
      mode: exam.mode,
      sections: exam.sections,
    },
    studentResults,
    aggregates: {
      totalAttempts: attempts.length,
      completedAttempts: completedAttempts.length,
      avgScore,
      medianScore,
    },
  });
}
