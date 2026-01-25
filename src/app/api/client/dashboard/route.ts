import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "CLIENT") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // Get cohorts this client owns
  const cohorts = await prisma.cohort.findMany({
    where: { clientId: session.user.id },
    include: {
      students: { include: { student: { include: { streak: true } } } },
      _count: { select: { students: true, simulacros: true } },
    },
  });

  // Aggregate metrics across all cohorts
  const studentIds = cohorts.flatMap((c) => c.students.map((s) => s.studentId));

  const totalStudents = studentIds.length;

  // Active students (streak updated recently)
  const activeStudents = cohorts.flatMap((c) =>
    c.students.filter((s) => {
      const lastActivity = s.student.streak?.lastActivityDate;
      if (!lastActivity) return false;
      const days = Math.floor((Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
      return days <= 3;
    })
  ).length;

  // Average progress
  const audioProgress = await prisma.audioProgress.groupBy({
    by: ["studentId"],
    where: { studentId: { in: studentIds }, isCompleted: true },
    _count: { id: true },
  });
  const avgProgress = audioProgress.length > 0
    ? Math.round(audioProgress.reduce((sum, p) => sum + p._count.id, 0) / audioProgress.length)
    : 0;

  // Quiz performance
  const quizAttempts = await prisma.quizAttempt.findMany({
    where: { studentId: { in: studentIds } },
  });
  const avgQuiz = quizAttempts.length > 0
    ? Math.round(quizAttempts.reduce((sum, q) => sum + q.score, 0) / quizAttempts.length * 100 / 3)
    : 0;

  return NextResponse.json({
    totalCohorts: cohorts.length,
    totalStudents,
    activeStudents,
    inactiveStudents: totalStudents - activeStudents,
    avgDaysCompleted: avgProgress,
    avgQuizScore: avgQuiz,
    cohorts: cohorts.map((c) => ({
      id: c.id,
      name: c.name,
      studentCount: c._count.students,
      simulacroCount: c._count.simulacros,
    })),
  });
}
