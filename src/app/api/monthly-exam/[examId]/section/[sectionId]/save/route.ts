import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** POST /api/monthly-exam/[examId]/section/[sectionId]/save — Auto-save answers + metrics */
export async function POST(
  req: NextRequest,
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
  const body = await req.json();

  // Validate attempt exists
  const attempt = await prisma.monthlyExamAttempt.findUnique({
    where: { examId_studentId: { examId, studentId: session.user.id } },
  });

  if (!attempt) {
    return NextResponse.json({ error: "Sin intento activo" }, { status: 404 });
  }

  const sectionAttempt = await prisma.examSectionAttempt.findUnique({
    where: { examAttemptId_sectionId: { examAttemptId: attempt.id, sectionId } },
  });

  if (!sectionAttempt || sectionAttempt.status === "SUBMITTED") {
    return NextResponse.json({ error: "Sección no activa" }, { status: 403 });
  }

  // Validate section belongs to the exam
  const section = await prisma.examSection.findUnique({
    where: { id: sectionId },
    select: { examId: true, durationMinutes: true, isWriting: true },
  });

  if (!section) {
    return NextResponse.json({ error: "Sección no encontrada" }, { status: 404 });
  }

  if (section.examId !== examId) {
    return NextResponse.json({ error: "La sección no pertenece a este simulacro" }, { status: 400 });
  }

  // Server-enforced timing: calculate real elapsed from startedAt

  const now = new Date();
  const serverElapsed = sectionAttempt.startedAt
    ? Math.floor((now.getTime() - new Date(sectionAttempt.startedAt).getTime()) / 1000)
    : 0;
  const maxSeconds = section.durationMinutes * 60;

  // If time expired, reject save — client should handle via isTimeExpired on next load
  if (serverElapsed >= maxSeconds) {
    return NextResponse.json(
      { error: "Tiempo agotado", autoSubmitted: true },
      { status: 410 }
    );
  }

  // Use server-calculated elapsed (not client value)
  const updateData: Record<string, unknown> = {
    timeSpentSeconds: Math.min(serverElapsed, maxSeconds),
  };

  if (typeof body.tabSwitches === "number") {
    updateData.tabSwitches = body.tabSwitches;
  }

  // Save writing content
  if (typeof body.writingContent === "string") {
    updateData.writingContent = body.writingContent;
    updateData.writingWordCount = body.writingContent
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;
  }

  await prisma.examSectionAttempt.update({
    where: { id: sectionAttempt.id },
    data: updateData,
  });

  // Save MC answers
  if (body.answers && Array.isArray(body.answers)) {
    for (const ans of body.answers) {
      if (!ans.questionId) continue;
      await prisma.examSectionAnswer.upsert({
        where: {
          sectionAttemptId_questionId: {
            sectionAttemptId: sectionAttempt.id,
            questionId: ans.questionId,
          },
        },
        update: { selectedOptionId: ans.optionId || null },
        create: {
          sectionAttemptId: sectionAttempt.id,
          questionId: ans.questionId,
          selectedOptionId: ans.optionId || null,
        },
      });
    }
  }

  // Save answer events (research metrics)
  if (body.answerEvents && Array.isArray(body.answerEvents) && body.answerEvents.length > 0) {
    // Build correctness map from DB to avoid trusting client-sent isCorrect
    const eventOptionIds = body.answerEvents
      .map((e: { selectedOptionId: string | null }) => e.selectedOptionId)
      .filter((id: string | null): id is string => !!id);

    const correctnessMap = new Map<string, boolean>();
    if (eventOptionIds.length > 0) {
      const options = await prisma.examSectionOption.findMany({
        where: { id: { in: eventOptionIds } },
        select: { id: true, isCorrect: true },
      });
      for (const opt of options) {
        correctnessMap.set(opt.id, opt.isCorrect);
      }
    }

    await prisma.examAnswerEvent.createMany({
      data: body.answerEvents.map((e: {
        questionId: string;
        selectedOptionId: string | null;
        previousOptionId: string | null;
        eventType: string;
        isCorrect: boolean;
        timestamp: string;
      }) => ({
        sectionAttemptId: sectionAttempt.id,
        questionId: e.questionId,
        selectedOptionId: e.selectedOptionId || null,
        previousOptionId: e.previousOptionId || null,
        eventType: e.eventType as "SELECTED" | "CHANGED" | "CLEARED",
        isCorrect: e.selectedOptionId ? (correctnessMap.get(e.selectedOptionId) ?? false) : false,
        timestamp: new Date(e.timestamp),
      })),
    });

    const changeCount = body.answerEvents.filter(
      (e: { eventType: string }) => e.eventType === "CHANGED"
    ).length;
    if (changeCount > 0) {
      await prisma.examSectionAttempt.update({
        where: { id: sectionAttempt.id },
        data: { totalAnswerChanges: { increment: changeCount } },
      });
    }
  }

  // Save question views (research metrics)
  if (body.questionViews && Array.isArray(body.questionViews) && body.questionViews.length > 0) {
    await prisma.examQuestionView.createMany({
      data: body.questionViews.map((v: {
        questionId: string;
        viewedAt: string;
        leftAt: string | null;
        durationSeconds: number | null;
      }) => ({
        sectionAttemptId: sectionAttempt.id,
        questionId: v.questionId,
        viewedAt: new Date(v.viewedAt),
        leftAt: v.leftAt ? new Date(v.leftAt) : null,
        durationSeconds: v.durationSeconds ?? null,
      })),
    });
  }

  return NextResponse.json({ success: true });
}
