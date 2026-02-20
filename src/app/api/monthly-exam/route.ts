import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MODULES_INFO } from "@/lib/student-day";

/** GET /api/monthly-exam — List all 6 monthly exams + student progress + gating */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (session.user.role !== "STUDENT") {
    return NextResponse.json(
      { error: "Solo estudiantes pueden acceder a simulacros" },
      { status: 403 }
    );
  }

  const [exams, manualUnlocks, completedAudioDays] = await Promise.all([
    prisma.monthlyExam.findMany({
      orderBy: { number: "asc" },
      include: {
        sections: {
          select: { id: true, sectionNumber: true, title: true, totalQuestions: true, isWriting: true },
          orderBy: { orderIndex: "asc" },
        },
        attempts: {
          where: { studentId: session.user.id },
          select: {
            id: true,
            isCompleted: true,
            totalScore: true,
            sectionAttempts: {
              select: {
                sectionId: true,
                status: true,
                totalCorrect: true,
              },
            },
          },
        },
      },
    }),
    prisma.manualUnlock.findMany({
      where: { studentId: session.user.id },
      select: { examId: true },
    }),
    prisma.audioProgress.findMany({
      where: { studentId: session.user.id, isCompleted: true },
      select: {
        dailyContent: {
          select: { dayNumber: true, module: { select: { number: true } } },
        },
      },
    }),
  ]);

  const unlockSet = new Set(manualUnlocks.map((u) => u.examId));

  // Build set of completed global day numbers
  const completedGlobalDays = new Set<number>();
  for (const ap of completedAudioDays) {
    const modInfo = MODULES_INFO.find(
      (m) => m.number === ap.dailyContent.module.number
    );
    if (modInfo) {
      const globalDay = modInfo.startDay + ap.dailyContent.dayNumber - 1;
      completedGlobalDays.add(globalDay);
    }
  }

  // Check if a module is complete
  const isModuleComplete = (moduleNumber: number): boolean => {
    const mod = MODULES_INFO.find((m) => m.number === moduleNumber);
    if (!mod) return false;
    for (let d = mod.startDay; d <= mod.endDay; d++) {
      if (!completedGlobalDays.has(d)) return false;
    }
    return true;
  };

  const result = exams.map((exam) => {
    const attempt = exam.attempts[0] || null;
    const sectionsCompleted = attempt
      ? attempt.sectionAttempts.filter((sa) => sa.status === "SUBMITTED").length
      : 0;

    // Determine lock status
    const isManuallyUnlocked = unlockSet.has(exam.id);
    let isLocked = false;
    let requiredModuleName: string | null = null;

    if (
      exam.requiredModuleNumber &&
      !exam.isBaseline &&
      !isManuallyUnlocked
    ) {
      const moduleComplete = isModuleComplete(exam.requiredModuleNumber);
      if (!moduleComplete) {
        isLocked = true;
        const modInfo = MODULES_INFO.find(
          (m) => m.number === exam.requiredModuleNumber
        );
        requiredModuleName = modInfo
          ? `${modInfo.icon} ${modInfo.name}`
          : `Módulo ${exam.requiredModuleNumber}`;
      }
    }

    return {
      id: exam.id,
      number: exam.number,
      title: exam.title,
      mode: exam.mode,
      isActive: exam.isActive,
      availableFrom: exam.availableFrom,
      availableUntil: exam.availableUntil,
      totalSections: exam.sections.length,
      sectionsCompleted,
      isCompleted: attempt?.isCompleted ?? false,
      totalScore: attempt?.totalScore ?? null,
      hasAttempt: !!attempt,
      isBaseline: exam.isBaseline,
      requiredModuleNumber: exam.requiredModuleNumber,
      requiredModuleName,
      isLocked,
      isManuallyUnlocked,
    };
  });

  return NextResponse.json({ exams: result });
}
