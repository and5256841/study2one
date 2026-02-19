import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getModuleForDay, getDayInModule, TOTAL_DAYS } from "@/lib/student-day";

export async function POST(
  req: NextRequest,
  { params }: { params: { dayId: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const globalDay = parseInt(params.dayId);
  if (isNaN(globalDay) || globalDay < 1 || globalDay > TOTAL_DAYS) {
    return NextResponse.json({ error: "Día inválido" }, { status: 400 });
  }

  const moduleInfo = getModuleForDay(globalDay);
  const dayNumber = getDayInModule(globalDay);

  const { answers, score, timeSpentSeconds } = await req.json();

  // Find daily content using correct module mapping
  const dailyContent = await prisma.dailyContent.findFirst({
    where: { dayNumber, module: { number: moduleInfo.number } },
  });

  if (!dailyContent) {
    return NextResponse.json({ error: "Contenido no encontrado" }, { status: 404 });
  }

  // Create quiz attempt
  const attempt = await prisma.quizAttempt.create({
    data: {
      studentId: session.user.id,
      dailyContentId: dailyContent.id,
      score,
      totalQuestions: answers.length,
      completedAt: new Date(),
      ...(timeSpentSeconds != null ? { timeSpentSeconds } : {}),
    },
  });

  // Save individual answers
  for (const answer of answers) {
    await prisma.quizAnswer.create({
      data: {
        attemptId: attempt.id,
        questionId: answer.questionId,
        selectedOptionId: answer.optionId,
        isCorrect: answer.isCorrect,
      },
    });
  }

  // Update streak: exams (15 q) need 10/15 (67%), normal quiz (3 q) needs 2/3
  const passThreshold = dailyContent.isExamDay
    ? Math.ceil(answers.length * 0.67)
    : 2;
  if (score >= passThreshold) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await prisma.streak.upsert({
      where: { studentId: session.user.id },
      update: {
        currentStreak: { increment: 1 },
        lastActivityDate: today,
      },
      create: {
        studentId: session.user.id,
        currentStreak: 1,
        longestStreak: 1,
        lastActivityDate: today,
      },
    });
  }

  return NextResponse.json({
    success: true,
    attemptId: attempt.id,
    score,
  });
}
