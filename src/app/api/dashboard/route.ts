import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getStudentCurrentDay,
  getModuleForDay,
  getDayInModule,
  MODULES_INFO,
  TOTAL_DAYS,
} from "@/lib/student-day";
import { getStudentRhythmFromActivity } from "@/lib/ecg-rhythms";
import { getTodaysSection } from "@/lib/exam-schedule";
import type { ExamMode } from "@/lib/exam-schedule";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const studentId = session.user.id;

  // Get student day info from cohort
  const studentDayInfo = await getStudentCurrentDay(studentId);

  if (!studentDayInfo) {
    return NextResponse.json(
      { error: "No tienes un cohort asignado. Contacta a tu coordinador." },
      { status: 400 }
    );
  }

  const { dayNumber: maxUnlockedDay } = studentDayInfo;

  // Get streak
  const streak = await prisma.streak.findUnique({
    where: { studentId },
  });

  // Get completed days (audio completed)
  const completedAudio = await prisma.audioProgress.findMany({
    where: {
      studentId,
      isCompleted: true,
    },
    include: {
      dailyContent: {
        include: { module: true },
      },
    },
  });

  // Get all quiz attempts to determine pass/fail dynamically based on isExamDay
  const allQuizAttemptsForDays = await prisma.quizAttempt.findMany({
    where: { studentId },
    include: {
      dailyContent: {
        include: { module: true },
      },
    },
  });

  // Filter passed quizzes: exam days need 67% (ceil), normal quizzes need 2/3
  const passedQuizzes = allQuizAttemptsForDays.filter((q) => {
    const threshold = q.dailyContent.isExamDay
      ? Math.ceil(q.totalQuestions * 0.67)
      : 2;
    return q.score >= threshold;
  });

  // Calculate fully completed days using new module structure
  const completedDaysSet = new Set<number>();
  for (const progress of completedAudio) {
    const moduleNum = progress.dailyContent.module.number;
    const dayNum = progress.dailyContent.dayNumber;
    const moduleInfo = MODULES_INFO[moduleNum - 1];
    if (moduleInfo) {
      const globalDay = moduleInfo.startDay + dayNum - 1;
      completedDaysSet.add(globalDay);
    }
  }

  const passedQuizDaysSet = new Set<number>();
  for (const quiz of passedQuizzes) {
    const moduleNum = quiz.dailyContent.module.number;
    const dayNum = quiz.dailyContent.dayNumber;
    const moduleInfo = MODULES_INFO[moduleNum - 1];
    if (moduleInfo) {
      const globalDay = moduleInfo.startDay + dayNum - 1;
      passedQuizDaysSet.add(globalDay);
    }
  }

  // Fully completed = audio + quiz passed
  const fullyCompletedDays: number[] = [];
  completedDaysSet.forEach((day) => {
    if (passedQuizDaysSet.has(day)) {
      fullyCompletedDays.push(day);
    }
  });

  // Find current day (first uncompleted day up to maxUnlockedDay)
  let currentDay = 1;
  for (let i = 1; i <= maxUnlockedDay; i++) {
    if (!fullyCompletedDays.includes(i)) {
      currentDay = i;
      break;
    }
    currentDay = i + 1;
  }
  currentDay = Math.min(currentDay, maxUnlockedDay);

  // Get current module info using new structure
  const currentModuleInfo = getModuleForDay(currentDay);

  // Get next 5 days info
  const upcomingDays = [];
  for (let i = 0; i < 5; i++) {
    const globalDay = currentDay + i;
    if (globalDay > TOTAL_DAYS) break;

    const moduleInfo = getModuleForDay(globalDay);
    const dayInModule = getDayInModule(globalDay);

    // Get daily content info
    const dailyContent = await prisma.dailyContent.findFirst({
      where: {
        dayNumber: dayInModule,
        module: { number: moduleInfo.number },
      },
      select: {
        id: true,
        title: true,
      },
    });

    const isUnlocked = globalDay <= maxUnlockedDay;
    const isCompleted = fullyCompletedDays.includes(globalDay);

    upcomingDays.push({
      globalDay,
      dayInModule,
      moduleNumber: moduleInfo.number,
      moduleName: moduleInfo.name,
      moduleIcon: moduleInfo.icon,
      title: dailyContent?.title || `Dia ${dayInModule}`,
      dailyContentId: dailyContent?.id || null,
      isUnlocked,
      isCompleted,
      isCurrent: i === 0,
    });
  }

  // Get user info
  const user = await prisma.user.findUnique({
    where: { id: studentId },
    select: { fullName: true, pseudonym: true },
  });

  // Calculate average quiz score for rhythm
  const allQuizAttempts = await prisma.quizAttempt.findMany({
    where: { studentId },
    select: { score: true, totalQuestions: true },
  });
  const avgQuizScore = allQuizAttempts.length > 0
    ? Math.round(
        (allQuizAttempts.reduce((sum, q) => sum + q.score, 0) /
          allQuizAttempts.reduce((sum, q) => sum + q.totalQuestions, 0)) * 100
      )
    : 0;
  const rhythm = getStudentRhythmFromActivity(
    streak?.lastActivityDate?.toISOString() ?? null,
    streak?.currentStreak ?? 0,
    avgQuizScore,
  );

  // Check if today has a scheduled simulacro section
  let todaySimulacro: {
    examId: string;
    examTitle: string;
    examNumber: number;
    sectionNumber: number;
    sectionTitle: string;
    sectionId: string;
    durationMinutes: number;
    alreadySubmitted: boolean;
  } | null = null;

  try {
    const examSchedules = await prisma.cohortExamSchedule.findMany({
      where: { cohortId: studentDayInfo.cohortId },
      include: {
        exam: {
          select: {
            id: true,
            title: true,
            number: true,
            mode: true,
            isActive: true,
            sections: {
              select: { id: true, sectionNumber: true, title: true, durationMinutes: true },
              orderBy: { orderIndex: "asc" },
            },
          },
        },
      },
    });

    for (const schedule of examSchedules) {
      if (!schedule.exam.isActive) continue;
      const examMode = schedule.exam.mode as ExamMode;
      const sectionNum = getTodaysSection(schedule.startDay, maxUnlockedDay, examMode);
      if (sectionNum === null) continue;

      const section = schedule.exam.sections.find(
        (s) => s.sectionNumber === sectionNum
      );
      if (!section) continue;

      // Check if already submitted
      const existingAttempt = await prisma.monthlyExamAttempt.findUnique({
        where: { examId_studentId: { examId: schedule.exam.id, studentId } },
        select: {
          sectionAttempts: {
            where: { sectionId: section.id },
            select: { status: true },
          },
        },
      });

      const alreadySubmitted =
        existingAttempt?.sectionAttempts?.[0]?.status === "SUBMITTED";

      todaySimulacro = {
        examId: schedule.exam.id,
        examTitle: schedule.exam.title,
        examNumber: schedule.exam.number,
        sectionNumber: sectionNum,
        sectionTitle: section.title,
        sectionId: section.id,
        durationMinutes: section.durationMinutes,
        alreadySubmitted,
      };
      break;
    }
  } catch {
    // Don't fail dashboard if exam check fails
  }

  return NextResponse.json({
    studentName: user?.pseudonym || user?.fullName || "Estudiante",
    rhythm: {
      type: rhythm.type,
      label: rhythm.label,
      color: rhythm.color,
      description: rhythm.description,
    },
    currentDay,
    maxUnlockedDay,
    currentModule: {
      number: currentModuleInfo.number,
      name: currentModuleInfo.name,
      icon: currentModuleInfo.icon,
    },
    upcomingDays,
    streak: {
      current: streak?.currentStreak || 0,
      longest: streak?.longestStreak || 0,
      lastActivity: streak?.lastActivityDate,
    },
    progress: {
      completedDays: fullyCompletedDays.length,
      totalDays: TOTAL_DAYS,
      percentage: Math.round((fullyCompletedDays.length / TOTAL_DAYS) * 100),
    },
    cohort: {
      id: studentDayInfo.cohortId,
      name: studentDayInfo.cohortName,
      startDate: studentDayInfo.cohortStartDate.toISOString(),
    },
    todaySimulacro,
  });
}
