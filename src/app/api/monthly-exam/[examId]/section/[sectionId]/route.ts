import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** GET /api/monthly-exam/[examId]/section/[sectionId] — Questions for a section. Marks IN_PROGRESS. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ examId: string; sectionId: string }> }
) {
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

  const { examId, sectionId } = await params;

  // Fetch exam + section
  const exam = await prisma.monthlyExam.findUnique({ where: { id: examId } });
  if (!exam || !exam.isActive) {
    return NextResponse.json({ error: "Examen no disponible" }, { status: 403 });
  }

  const section = await prisma.examSection.findUnique({
    where: { id: sectionId },
    include: {
      questions: {
        orderBy: { questionOrder: "asc" },
        include: {
          options: {
            orderBy: { letter: "asc" },
            select: { id: true, letter: true, text: true },
          },
        },
      },
    },
  });

  if (!section || section.examId !== examId) {
    return NextResponse.json({ error: "Sección no encontrada" }, { status: 404 });
  }

  // Get or create attempt
  const attempt = await prisma.monthlyExamAttempt.upsert({
    where: { examId_studentId: { examId, studentId: session.user.id } },
    update: {},
    create: { examId, studentId: session.user.id },
  });

  // Check CONTINUOUS mode restrictions
  if (exam.mode === "CONTINUOUS") {
    const allSectionAttempts = await prisma.examSectionAttempt.findMany({
      where: { examAttemptId: attempt.id },
      include: { section: { select: { sectionNumber: true } } },
    });

    for (const sa of allSectionAttempts) {
      // If a prior section is still IN_PROGRESS (not this one), block
      if (
        sa.section.sectionNumber < section.sectionNumber &&
        sa.status !== "SUBMITTED"
      ) {
        return NextResponse.json(
          { error: "Debes completar las secciones anteriores primero" },
          { status: 403 }
        );
      }
    }

    // Also check that all prior sections exist and are submitted
    const priorSections = await prisma.examSection.findMany({
      where: { examId, sectionNumber: { lt: section.sectionNumber } },
      select: { id: true },
    });

    for (const ps of priorSections) {
      const sa = allSectionAttempts.find((a) => a.sectionId === ps.id);
      if (!sa || sa.status !== "SUBMITTED") {
        return NextResponse.json(
          { error: "Debes completar las secciones anteriores primero" },
          { status: 403 }
        );
      }
    }
  }

  // Get or create section attempt
  let sectionAttempt = await prisma.examSectionAttempt.findUnique({
    where: { examAttemptId_sectionId: { examAttemptId: attempt.id, sectionId } },
  });

  if (sectionAttempt?.status === "SUBMITTED") {
    return NextResponse.json(
      { error: "Esta sección ya fue entregada" },
      { status: 403 }
    );
  }

  if (!sectionAttempt) {
    sectionAttempt = await prisma.examSectionAttempt.create({
      data: {
        examAttemptId: attempt.id,
        sectionId,
        status: "IN_PROGRESS",
        startedAt: new Date(),
      },
    });
  } else if (sectionAttempt.status === "NOT_STARTED") {
    sectionAttempt = await prisma.examSectionAttempt.update({
      where: { id: sectionAttempt.id },
      data: { status: "IN_PROGRESS", startedAt: new Date() },
    });
  }

  // Calculate server-enforced elapsed time
  const now = new Date();
  const serverElapsedSeconds = sectionAttempt.startedAt
    ? Math.floor((now.getTime() - new Date(sectionAttempt.startedAt).getTime()) / 1000)
    : 0;
  const maxSeconds = section.durationMinutes * 60;
  const effectiveElapsed = Math.min(serverElapsedSeconds, maxSeconds);
  const isTimeExpired = serverElapsedSeconds >= maxSeconds;

  // If time expired and section still IN_PROGRESS, auto-submit with zero
  if (isTimeExpired && sectionAttempt.status === "IN_PROGRESS") {
    // Calculate score from any saved answers
    let totalCorrect = 0;
    if (!section.isWriting) {
      const savedAnswerRecords = await prisma.examSectionAnswer.findMany({
        where: { sectionAttemptId: sectionAttempt.id },
        include: { selectedOption: { select: { isCorrect: true } } },
      });
      totalCorrect = savedAnswerRecords.filter((a) => a.selectedOption?.isCorrect).length;
    }

    await prisma.examSectionAttempt.update({
      where: { id: sectionAttempt.id },
      data: {
        status: "SUBMITTED",
        submittedAt: now,
        totalCorrect,
        timeSpentSeconds: maxSeconds,
      },
    });

    return NextResponse.json(
      { error: "Tiempo agotado — la sección fue entregada automáticamente", autoSubmitted: true },
      { status: 410 }
    );
  }

  // Load existing answers for resume
  const existingAnswers = await prisma.examSectionAnswer.findMany({
    where: { sectionAttemptId: sectionAttempt.id },
    select: { questionId: true, selectedOptionId: true },
  });

  const savedAnswers: Record<string, string | null> = {};
  for (const a of existingAnswers) {
    savedAnswers[a.questionId] = a.selectedOptionId;
  }

  return NextResponse.json({
    section: {
      id: section.id,
      sectionNumber: section.sectionNumber,
      title: section.title,
      durationMinutes: section.durationMinutes,
      totalQuestions: section.totalQuestions,
      isWriting: section.isWriting,
    },
    sectionAttemptId: sectionAttempt.id,
    startedAt: sectionAttempt.startedAt,
    timeSpentSeconds: sectionAttempt.timeSpentSeconds,
    serverElapsedSeconds: effectiveElapsed,
    isTimeExpired,
    tabSwitches: sectionAttempt.tabSwitches,
    writingContent: sectionAttempt.writingContent,
    questions: section.questions.map((q) => ({
      id: q.id,
      questionOrder: q.questionOrder,
      caseText: q.caseText,
      questionText: q.questionText,
      options: q.options,
    })),
    savedAnswers,
  });
}
