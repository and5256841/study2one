import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { answers, tabSwitches, timeSpentSeconds } = await req.json();

  // Get simulacro with correct answers
  const simulacro = await prisma.simulacro.findUnique({
    where: { id: params.id },
    include: {
      questions: {
        include: { options: true },
      },
    },
  });

  if (!simulacro) {
    return NextResponse.json({ error: "Simulacro no encontrado" }, { status: 404 });
  }

  // Calculate score by competency
  const competencyMap: Record<string, { correct: number; total: number }> = {};
  let totalCorrect = 0;

  for (const question of simulacro.questions) {
    const answer = answers.find((a: { questionId: string }) => a.questionId === question.id);
    const correctOption = question.options.find((o) => o.isCorrect);
    const isCorrect = answer?.optionId === correctOption?.id;

    if (isCorrect) totalCorrect++;

    const comp = question.competency || "General";
    if (!competencyMap[comp]) competencyMap[comp] = { correct: 0, total: 0 };
    competencyMap[comp].total++;
    if (isCorrect) competencyMap[comp].correct++;
  }

  const scorePercentage = Math.round((totalCorrect / simulacro.totalQuestions) * 100);

  // Create attempt
  const attempt = await prisma.simulacroAttempt.create({
    data: {
      simulacroId: params.id,
      studentId: session.user.id,
      totalCorrect,
      totalAnswered: answers.length,
      scorePercentage,
      tabSwitches: tabSwitches || 0,
      timeSpentSeconds,
      reportByCompetency: competencyMap,
      isCompleted: true,
      finishedAt: new Date(),
      answers: {
        create: answers.map((a: { questionId: string; optionId: string }) => ({
          questionId: a.questionId,
          selectedOptionId: a.optionId || null,
        })),
      },
    },
  });

  return NextResponse.json({
    success: true,
    attemptId: attempt.id,
    score: {
      correct: totalCorrect,
      total: simulacro.totalQuestions,
      percentage: scorePercentage,
    },
    tabSwitches,
    competencyReport: competencyMap,
  });
}
