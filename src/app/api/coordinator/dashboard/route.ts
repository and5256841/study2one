import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MODULES_INFO } from "@/lib/student-day";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "COORDINATOR") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // Find cohorts belonging to this coordinator
  const coordinatorCohorts = await prisma.cohort.findMany({
    where: { coordinatorId: session.user.id },
    select: { id: true },
  });
  const cohortIds = coordinatorCohorts.map((c) => c.id);

  // Base filter: approved students in coordinator's cohorts
  const cohortStudentFilter = {
    role: "STUDENT" as const,
    enrollmentStatus: "APPROVED" as const,
    cohortStudents: {
      some: { cohortId: { in: cohortIds } },
    },
  };

  // Get student IDs for this coordinator's cohorts (used in progress/quiz filters)
  const cohortStudentRecords = await prisma.cohortStudent.findMany({
    where: { cohortId: { in: cohortIds } },
    select: { studentId: true },
  });
  const studentIds = Array.from(new Set(cohortStudentRecords.map((cs) => cs.studentId)));

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
    // Total students in coordinator's cohorts
    prisma.user.count({ where: cohortStudentFilter }),
    // Pending enrollments (in coordinator's cohorts or unassigned)
    prisma.user.count({
      where: {
        role: "STUDENT",
        enrollmentStatus: "PENDING",
        OR: [
          { cohortStudents: { some: { cohortId: { in: cohortIds } } } },
          { cohortStudents: { none: {} } },
        ],
      },
    }),
    // Active today (only coordinator's students)
    prisma.streak.count({
      where: {
        lastActivityDate: { gte: today },
        student: cohortStudentFilter,
      },
    }),
    // Inactive 3+ days (only coordinator's students)
    prisma.user.count({
      where: {
        ...cohortStudentFilter,
        streak: {
          OR: [
            { lastActivityDate: { lt: threeDaysAgo } },
            { lastActivityDate: null },
          ],
        },
      },
    }),
    // Audio progress grouped by student (only coordinator's students)
    prisma.audioProgress.groupBy({
      by: ["studentId"],
      where: { isCompleted: true, studentId: { in: studentIds } },
      _count: { id: true },
    }),
    // Recent quizzes for avg score (only coordinator's students)
    prisma.quizAttempt.findMany({
      where: { studentId: { in: studentIds } },
      take: 100,
      orderBy: { startedAt: "desc" },
      select: { score: true, totalQuestions: true },
    }),
    // Avg audio playback speed (only coordinator's students)
    prisma.audioProgress.aggregate({
      _avg: { playbackSpeed: true },
      where: { playbackSpeed: { gt: 0 }, studentId: { in: studentIds } },
    }),
    // Photos pending approval (only coordinator's students)
    prisma.photoUpload.count({
      where: {
        isApproved: false,
        photoUrl: { not: null },
        studentId: { in: studentIds },
      },
    }),
    // Students with streak + progress info (for top/at-risk) — scoped to coordinator
    prisma.user.findMany({
      where: cohortStudentFilter,
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
    // Module completion data (only coordinator's students)
    prisma.audioProgress.findMany({
      where: { isCompleted: true, studentId: { in: studentIds } },
      select: {
        studentId: true,
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
    // Use composite key student+day to properly count unique completions
    moduleCompletionMap
      .get(modNum)!
      .add(`${ap.studentId}_${ap.dailyContent.dayNumber}`);
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
