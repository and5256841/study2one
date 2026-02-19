import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MODULES_INFO } from "@/lib/student-day";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "COORDINATOR") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  // Run all queries in parallel
  const [
    totalStudents,
    pendingEnrollments,
    activeToday,
    inactiveStudents,
    allProgress,
    recentQuizzes,
    audioSpeedData,
    photosPending,
    studentsWithStreaks,
    moduleCompletionData,
  ] = await Promise.all([
    // Total students
    prisma.user.count({ where: { role: "STUDENT", enrollmentStatus: "APPROVED" } }),
    // Pending enrollments
    prisma.user.count({ where: { role: "STUDENT", enrollmentStatus: "PENDING" } }),
    // Active today
    prisma.streak.count({ where: { lastActivityDate: { gte: today } } }),
    // Inactive 3+ days
    prisma.user.count({
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
    }),
    // Audio progress grouped by student
    prisma.audioProgress.groupBy({
      by: ["studentId"],
      where: { isCompleted: true },
      _count: { id: true },
    }),
    // Recent quizzes for avg score
    prisma.quizAttempt.findMany({
      take: 100,
      orderBy: { startedAt: "desc" },
      select: { score: true, totalQuestions: true },
    }),
    // Avg audio playback speed
    prisma.audioProgress.aggregate({
      _avg: { playbackSpeed: true },
      where: { playbackSpeed: { gt: 0 } },
    }),
    // Photos pending approval
    prisma.photoUpload.count({
      where: { isApproved: false, photoUrl: { not: null } },
    }),
    // Students with streak + progress info (for top/at-risk)
    prisma.user.findMany({
      where: { role: "STUDENT", enrollmentStatus: "APPROVED" },
      select: {
        id: true,
        fullName: true,
        streak: {
          select: { currentStreak: true, lastActivityDate: true },
        },
        _count: {
          select: {
            audioProgress: { where: { isCompleted: true } },
            quizAttempts: true,
          },
        },
        quizAttempts: {
          select: { score: true, totalQuestions: true },
          take: 20,
          orderBy: { startedAt: "desc" },
        },
      },
    }),
    // Module completion data
    prisma.audioProgress.findMany({
      where: { isCompleted: true },
      select: {
        dailyContent: {
          select: {
            dayNumber: true,
            module: { select: { number: true } },
          },
        },
      },
    }),
  ]);

  // Avg days completed
  const avgDaysCompleted =
    allProgress.length > 0
      ? Math.round(
          allProgress.reduce((sum, p) => sum + p._count.id, 0) /
            allProgress.length
        )
      : 0;

  // Avg quiz score
  const avgQuizScore =
    recentQuizzes.length > 0
      ? Math.round(
          (recentQuizzes.reduce((sum, q) => sum + q.score, 0) /
            recentQuizzes.reduce((sum, q) => sum + q.totalQuestions, 0)) *
            100
        )
      : 0;

  // Avg audio speed
  const avgAudioSpeed =
    Math.round((audioSpeedData._avg.playbackSpeed ?? 1.0) * 100) / 100;

  // Top 5 students (by days completed)
  const topStudents = studentsWithStreaks
    .map((s) => {
      const quizAvg =
        s.quizAttempts.length > 0
          ? Math.round(
              (s.quizAttempts.reduce((sum, q) => sum + q.score, 0) /
                s.quizAttempts.reduce(
                  (sum, q) => sum + q.totalQuestions,
                  0
                )) *
                100
            )
          : 0;
      return {
        id: s.id,
        name: s.fullName,
        daysCompleted: s._count.audioProgress,
        streak: s.streak?.currentStreak ?? 0,
        quizAvg,
      };
    })
    .sort((a, b) => b.daysCompleted - a.daysCompleted)
    .slice(0, 5);

  // Top 5 at-risk students (inactive, low streak, or low quiz scores)
  const atRiskStudents = studentsWithStreaks
    .map((s) => {
      const lastAct = s.streak?.lastActivityDate;
      const daysInactive = lastAct
        ? Math.floor(
            (Date.now() - new Date(lastAct).getTime()) / 86400000
          )
        : 999;
      const quizAvg =
        s.quizAttempts.length > 0
          ? Math.round(
              (s.quizAttempts.reduce((sum, q) => sum + q.score, 0) /
                s.quizAttempts.reduce(
                  (sum, q) => sum + q.totalQuestions,
                  0
                )) *
                100
            )
          : 0;
      return {
        id: s.id,
        name: s.fullName,
        daysInactive,
        streak: s.streak?.currentStreak ?? 0,
        daysCompleted: s._count.audioProgress,
        quizAvg,
      };
    })
    .filter((s) => s.daysInactive >= 3 || s.quizAvg < 50)
    .sort((a, b) => b.daysInactive - a.daysInactive)
    .slice(0, 5);

  // Module progress (avg completion per module across all students)
  const moduleCompletionMap = new Map<number, Set<string>>();
  for (const ap of moduleCompletionData) {
    const modNum = ap.dailyContent.module.number;
    if (!moduleCompletionMap.has(modNum)) {
      moduleCompletionMap.set(modNum, new Set());
    }
    // Use a unique key per student+day to avoid counting duplicates
    moduleCompletionMap
      .get(modNum)!
      .add(`${ap.dailyContent.dayNumber}`);
  }

  const moduleProgress = MODULES_INFO.map((mod) => {
    // Count total completions across all students for this module
    const completedCount = moduleCompletionMap.get(mod.number)?.size ?? 0;
    const avgPercent =
      totalStudents > 0 && mod.totalDays > 0
        ? Math.round((completedCount / (totalStudents * mod.totalDays)) * 100)
        : 0;

    return {
      moduleNumber: mod.number,
      moduleName: mod.name,
      moduleIcon: mod.icon,
      avgPercent: Math.min(avgPercent, 100),
    };
  });

  return NextResponse.json({
    totalStudents,
    pendingEnrollments,
    activeToday,
    inactiveStudents,
    avgDaysCompleted,
    avgQuizScore,
    avgAudioSpeed,
    photosPending,
    topStudents,
    atRiskStudents,
    moduleProgress,
  });
}
