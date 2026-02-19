import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** POST /api/monthly-exam/[examId]/section/[sectionId]/submit — Submit and lock section */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ examId: string; sectionId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { examId, sectionId } = await params;
  const body = await req.json();

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
    return NextResponse.json({ error: "Sección ya entregada o no iniciada" }, { status: 403 });
  }

  const section = await prisma.examSection.findUnique({
    where: { id: sectionId },
  });

  if (!section) {
    return NextResponse.json({ error: "Sección no encontrada" }, { status: 404 });
  }

  // Server-enforced timing
  const now = new Date();
  const serverElapsed = sectionAttempt.startedAt
    ? Math.floor((now.getTime() - new Date(sectionAttempt.startedAt).getTime()) / 1000)
    : body.timeSpentSeconds ?? 0;
  const maxSeconds = section.durationMinutes * 60;
  const finalTime = Math.min(serverElapsed, maxSeconds);

  // Save final answers (MC)
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

  // Save writing content
  let writingWordCount = sectionAttempt.writingWordCount;
  if (typeof body.writingContent === "string") {
    writingWordCount = body.writingContent.trim().split(/\s+/).filter(Boolean).length;
  }

  // Flush remaining answer events
  if (body.answerEvents && Array.isArray(body.answerEvents) && body.answerEvents.length > 0) {
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
        isCorrect: e.isCorrect ?? false,
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

  // Flush remaining question views
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

  // Calculate score for MC sections
  let totalCorrect = 0;
  if (!section.isWriting) {
    const answers = await prisma.examSectionAnswer.findMany({
      where: { sectionAttemptId: sectionAttempt.id },
      include: {
        selectedOption: { select: { isCorrect: true } },
      },
    });
    totalCorrect = answers.filter((a) => a.selectedOption?.isCorrect).length;
  }

  // Mark section as submitted with server-enforced time
  await prisma.examSectionAttempt.update({
    where: { id: sectionAttempt.id },
    data: {
      status: "SUBMITTED",
      submittedAt: now,
      totalCorrect,
      timeSpentSeconds: finalTime,
      tabSwitches: body.tabSwitches ?? sectionAttempt.tabSwitches,
      ...(typeof body.writingContent === "string"
        ? { writingContent: body.writingContent, writingWordCount }
        : {}),
    },
  });

  // Check if all sections are now submitted → mark exam complete
  const allSectionAttempts = await prisma.examSectionAttempt.findMany({
    where: { examAttemptId: attempt.id },
    include: { section: { select: { totalQuestions: true, isWriting: true } } },
  });

  const allSections = await prisma.examSection.findMany({
    where: { examId },
  });

  const allSubmitted =
    allSectionAttempts.filter((sa) => sa.status === "SUBMITTED").length ===
    allSections.length;

  if (allSubmitted) {
    const mcAttempts = allSectionAttempts.filter(
      (sa) => !sa.section.isWriting && sa.status === "SUBMITTED"
    );
    const totalMcCorrect = mcAttempts.reduce((sum, sa) => sum + sa.totalCorrect, 0);
    const totalMcQuestions = mcAttempts.reduce(
      (sum, sa) => sum + sa.section.totalQuestions,
      0
    );
    const totalScore =
      totalMcQuestions > 0
        ? Math.round((totalMcCorrect / totalMcQuestions) * 10000) / 100
        : 0;

    await prisma.monthlyExamAttempt.update({
      where: { id: attempt.id },
      data: { isCompleted: true, totalScore },
    });
  }

  return NextResponse.json({
    success: true,
    totalCorrect,
    totalQuestions: section.totalQuestions,
    isWriting: section.isWriting,
    examCompleted: allSubmitted,
  });
}
