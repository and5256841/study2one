import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MODULES_INFO, getStudentCurrentDay } from "@/lib/student-day";

/** GET /api/coordinator/students/[studentId] — Full student profile */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  const session = await auth();
  if (!session?.user?.role || session.user.role !== "COORDINATOR") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { studentId } = await params;

  const student = await prisma.user.findUnique({
    where: { id: studentId, role: "STUDENT" },
    select: {
      id: true,
      fullName: true,
      email: true,
      pseudonym: true,
      createdAt: true,
      streak: {
        select: {
          currentStreak: true,
          longestStreak: true,
          lastActivityDate: true,
        },
      },
      audioProgress: {
        select: {
          dailyContentId: true,
          isCompleted: true,
          totalListenedSeconds: true,
          playbackSpeed: true,
          completionPercentage: true,
          completedAt: true,
          dailyContent: {
            select: {
              dayNumber: true,
              title: true,
              module: { select: { number: true } },
            },
          },
        },
        orderBy: { dailyContent: { dayNumber: "asc" } },
      },
      quizAttempts: {
        select: {
          dailyContentId: true,
          score: true,
          totalQuestions: true,
          timeSpentSeconds: true,
          completedAt: true,
          dailyContent: {
            select: { dayNumber: true, title: true },
          },
        },
        orderBy: { completedAt: "desc" },
      },
      photoUploads: {
        select: {
          id: true,
          photoUrl: true,
          thumbnailUrl: true,
          photoType: true,
          uploadedAt: true,
          isApproved: true,
          approvedAt: true,
          dailyContent: {
            select: { dayNumber: true, title: true },
          },
        },
        orderBy: { uploadedAt: "desc" },
      },
      writingSubmissions: {
        select: {
          dailyContentId: true,
          wordCount: true,
          timeSpentSeconds: true,
          submittedAt: true,
          dailyContent: {
            select: { dayNumber: true, title: true },
          },
        },
        orderBy: { submittedAt: "desc" },
      },
    },
  });

  if (!student) {
    return NextResponse.json({ error: "Estudiante no encontrado" }, { status: 404 });
  }

  // Get cohort info
  const cohortStudent = await prisma.cohortStudent.findFirst({
    where: { studentId },
    include: { cohort: { select: { id: true, name: true, startDate: true } } },
    orderBy: { joinedAt: "desc" },
  });

  // Current day info
  const currentDayInfo = await getStudentCurrentDay(studentId);

  // Calculate overview metrics
  const completedAudio = student.audioProgress.filter((a) => a.isCompleted);
  const totalListenSeconds = student.audioProgress.reduce(
    (sum, a) => sum + a.totalListenedSeconds,
    0
  );
  const avgPlaybackSpeed =
    student.audioProgress.length > 0
      ? student.audioProgress.reduce((sum, a) => sum + a.playbackSpeed, 0) /
        student.audioProgress.length
      : 1.0;

  const quizzesWithScore = student.quizAttempts.filter((q) => q.completedAt);
  const avgQuizScore =
    quizzesWithScore.length > 0
      ? Math.round(
          (quizzesWithScore.reduce((sum, q) => sum + q.score, 0) /
            quizzesWithScore.reduce((sum, q) => sum + q.totalQuestions, 0)) *
            100
        )
      : 0;
  const quizzesPassed = quizzesWithScore.filter(
    (q) => q.score >= Math.ceil(q.totalQuestions * 0.67)
  ).length;

  const pendingPhotos = student.photoUploads.filter((p) => !p.isApproved && p.photoUrl);
  const approvedPhotos = student.photoUploads.filter((p) => p.isApproved);

  // Module progress — use module-relative day numbers (1-based) and filter by module number
  const moduleProgress = MODULES_INFO.map((mod) => {
    const moduleDays = Array.from(
      { length: mod.totalDays },
      (_, i) => i + 1
    );
    const completedDays = moduleDays.filter((d) =>
      completedAudio.some(
        (a) =>
          a.dailyContent.module.number === mod.number &&
          a.dailyContent.dayNumber === d
      )
    ).length;

    return {
      moduleNumber: mod.number,
      moduleName: mod.name,
      moduleIcon: mod.icon,
      daysCompleted: completedDays,
      totalDays: mod.totalDays,
      percent: Math.round((completedDays / mod.totalDays) * 100),
    };
  });

  return NextResponse.json({
    student: {
      id: student.id,
      fullName: student.fullName,
      email: student.email,
      pseudonym: student.pseudonym,
      createdAt: student.createdAt,
    },
    cohort: cohortStudent
      ? {
          name: cohortStudent.cohort.name,
          startDate: cohortStudent.cohort.startDate,
        }
      : null,
    currentDay: currentDayInfo
      ? {
          dayNumber: currentDayInfo.dayNumber,
          moduleNumber: currentDayInfo.moduleNumber,
          moduleName:
            MODULES_INFO[currentDayInfo.moduleNumber - 1]?.name ?? "",
        }
      : null,
    streak: {
      current: student.streak?.currentStreak ?? 0,
      longest: student.streak?.longestStreak ?? 0,
      lastActivity: student.streak?.lastActivityDate ?? null,
    },
    overview: {
      daysCompleted: completedAudio.length,
      totalDays: 125,
      progressPercent: Math.round((completedAudio.length / 125) * 100),
      quizzesTaken: quizzesWithScore.length,
      quizzesPassedPercent:
        quizzesWithScore.length > 0
          ? Math.round((quizzesPassed / quizzesWithScore.length) * 100)
          : 0,
      avgQuizScore,
      photosUploaded: student.photoUploads.length,
      photosPending: pendingPhotos.length,
      photosApproved: approvedPhotos.length,
      totalListenHours: Math.round((totalListenSeconds / 3600) * 10) / 10,
      avgPlaybackSpeed: Math.round(avgPlaybackSpeed * 100) / 100,
      writingSubmissions: student.writingSubmissions.length,
    },
    moduleProgress,
    audioDetails: student.audioProgress.map((a) => ({
      dayNumber: a.dailyContent.dayNumber,
      title: a.dailyContent.title,
      playbackSpeed: a.playbackSpeed,
      totalListened: a.totalListenedSeconds,
      completionPercent: Math.round(a.completionPercentage),
      isCompleted: a.isCompleted,
      completedAt: a.completedAt,
    })),
    quizDetails: quizzesWithScore.map((q) => ({
      dayNumber: q.dailyContent.dayNumber,
      title: q.dailyContent.title,
      score: q.score,
      totalQuestions: q.totalQuestions,
      timeSpent: q.timeSpentSeconds,
      passed: q.score >= Math.ceil(q.totalQuestions * 0.67),
      completedAt: q.completedAt,
    })),
    photos: student.photoUploads.map((p) => ({
      id: p.id,
      dayNumber: p.dailyContent.dayNumber,
      title: p.dailyContent.title,
      photoUrl: p.photoUrl,
      thumbnailUrl: p.thumbnailUrl,
      photoType: p.photoType,
      uploadedAt: p.uploadedAt,
      isApproved: p.isApproved,
      approvedAt: p.approvedAt,
    })),
    writingDetails: student.writingSubmissions.map((w) => ({
      dayNumber: w.dailyContent.dayNumber,
      title: w.dailyContent.title,
      wordCount: w.wordCount,
      timeSpent: w.timeSpentSeconds,
      submittedAt: w.submittedAt,
    })),
  });
}
