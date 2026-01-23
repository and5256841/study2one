import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "COORDINATOR") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // Total students
  const totalStudents = await prisma.user.count({
    where: { role: "STUDENT" },
  });

  // Pending enrollments
  const pendingEnrollments = await prisma.user.count({
    where: { role: "STUDENT", enrollmentStatus: "PENDING" },
  });

  // Active today (had audio progress or quiz today)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const activeToday = await prisma.streak.count({
    where: { lastActivityDate: { gte: today } },
  });

  // Inactive students (no activity in 3+ days)
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  const inactiveStudents = await prisma.user.count({
    where: {
      role: "STUDENT",
      enrollmentStatus: "APPROVED",
      streak: {
        OR: [
          { lastActivityDate: { lt: threeDaysAgo } },
          { lastActivityDate: null },
        ],
      },
    },
  });

  // Average progress
  const allProgress = await prisma.audioProgress.groupBy({
    by: ["studentId"],
    where: { isCompleted: true },
    _count: { id: true },
  });
  const avgDaysCompleted = allProgress.length > 0
    ? Math.round(allProgress.reduce((sum, p) => sum + p._count.id, 0) / allProgress.length)
    : 0;

  // Recent quiz scores
  const recentQuizzes = await prisma.quizAttempt.findMany({
    take: 50,
    orderBy: { startedAt: "desc" },
  });
  const avgQuizScore = recentQuizzes.length > 0
    ? Math.round(recentQuizzes.reduce((sum, q) => sum + q.score, 0) / recentQuizzes.length * 100 / 3)
    : 0;

  return NextResponse.json({
    totalStudents,
    pendingEnrollments,
    activeToday,
    inactiveStudents,
    avgDaysCompleted,
    avgQuizScore,
  });
}
