import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MODULES_INFO } from "@/lib/student-day";

/** GET /api/monthly-exam/[examId] — Exam overview with section states. Creates attempt if none. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { examId } = await params;

  const exam = await prisma.monthlyExam.findUnique({
    where: { id: examId },
    include: {
      sections: {
        orderBy: { orderIndex: "asc" },
        select: {
          id: true,
          sectionNumber: true,
          moduleNumber: true,
          title: true,
          durationMinutes: true,
          totalQuestions: true,
          isWriting: true,
          orderIndex: true,
        },
      },
    },
  });

  if (!exam) {
    return NextResponse.json({ error: "Examen no encontrado" }, { status: 404 });
  }

  if (!exam.isActive) {
    return NextResponse.json({ error: "Este examen aún no está disponible" }, { status: 403 });
  }

  // Module gating check
  if (exam.requiredModuleNumber && !exam.isBaseline) {
    // Check for manual unlock first
    const manualUnlock = await prisma.manualUnlock.findUnique({
      where: { studentId_examId: { studentId: session.user.id, examId } },
    });

    if (!manualUnlock) {
      // Check if module is complete
      const modInfo = MODULES_INFO.find(
        (m) => m.number === exam.requiredModuleNumber
      );
      if (modInfo) {
        const completedDays = await prisma.audioProgress.count({
          where: {
            studentId: session.user.id,
            isCompleted: true,
            dailyContent: {
              dayNumber: { gte: 1, lte: modInfo.totalDays },
              module: { number: modInfo.number },
            },
          },
        });

        if (completedDays < modInfo.totalDays) {
          const moduleName = `${modInfo.icon} ${modInfo.name}`;
          return NextResponse.json(
            {
              error: `Debes completar el módulo ${moduleName} primero`,
              requiredModuleName: moduleName,
              completedDays,
              requiredDays: modInfo.totalDays,
            },
            { status: 403 }
          );
        }
      }
    }
  }

  // Upsert attempt
  const attempt = await prisma.monthlyExamAttempt.upsert({
    where: {
      examId_studentId: { examId, studentId: session.user.id },
    },
    update: {},
    create: {
      examId,
      studentId: session.user.id,
    },
    include: {
      sectionAttempts: {
        select: {
          sectionId: true,
          status: true,
          totalCorrect: true,
          timeSpentSeconds: true,
          tabSwitches: true,
          writingWordCount: true,
        },
      },
    },
  });

  const sections = exam.sections.map((sec) => {
    const sa = attempt.sectionAttempts.find((a) => a.sectionId === sec.id);
    return {
      ...sec,
      status: sa?.status ?? "NOT_STARTED",
      totalCorrect: sa?.totalCorrect ?? 0,
      timeSpentSeconds: sa?.timeSpentSeconds ?? 0,
      tabSwitches: sa?.tabSwitches ?? 0,
      writingWordCount: sa?.writingWordCount ?? null,
    };
  });

  // For CONTINUOUS mode, determine which section can be started next
  let nextAvailableSection: number | null = null;
  if (exam.mode === "CONTINUOUS") {
    const submittedSections = sections.filter((s) => s.status === "SUBMITTED");
    const maxSubmitted = submittedSections.length > 0
      ? Math.max(...submittedSections.map((s) => s.sectionNumber))
      : 0;
    nextAvailableSection = maxSubmitted + 1;
  }

  return NextResponse.json({
    id: exam.id,
    number: exam.number,
    title: exam.title,
    mode: exam.mode,
    attemptId: attempt.id,
    isCompleted: attempt.isCompleted,
    totalScore: attempt.totalScore,
    nextAvailableSection,
    sections,
  });
}
