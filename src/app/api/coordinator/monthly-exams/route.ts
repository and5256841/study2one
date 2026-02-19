import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** GET /api/coordinator/monthly-exams — List all exams with aggregate stats */
export async function GET() {
  const session = await auth();
  if (!session?.user?.role || session.user.role !== "COORDINATOR") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const exams = await prisma.monthlyExam.findMany({
    orderBy: { number: "asc" },
    include: {
      sections: {
        select: { id: true, title: true, totalQuestions: true },
        orderBy: { orderIndex: "asc" },
      },
      _count: { select: { attempts: true } },
      attempts: {
        where: { isCompleted: true },
        select: { totalScore: true },
      },
    },
  });

  const result = exams.map((exam) => {
    const completedScores = exam.attempts
      .filter((a) => a.totalScore !== null)
      .map((a) => a.totalScore!);
    const avgScore =
      completedScores.length > 0
        ? Math.round(
            (completedScores.reduce((a, b) => a + b, 0) / completedScores.length) * 100
          ) / 100
        : null;

    return {
      id: exam.id,
      number: exam.number,
      title: exam.title,
      mode: exam.mode,
      isActive: exam.isActive,
      availableFrom: exam.availableFrom,
      availableUntil: exam.availableUntil,
      totalSections: exam.sections.length,
      totalQuestions: exam.sections.reduce((s, sec) => s + sec.totalQuestions, 0),
      totalAttempts: exam._count.attempts,
      completedAttempts: completedScores.length,
      avgScore,
    };
  });

  return NextResponse.json({ exams: result });
}
