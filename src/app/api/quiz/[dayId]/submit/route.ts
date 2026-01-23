import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: { dayId: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const dayNumber = parseInt(params.dayId);
  const { answers, score } = await req.json();

  // Find daily content
  const dailyContent = await prisma.dailyContent.findFirst({
    where: { dayNumber },
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

  // Update streak if score >= 2/3
  if (score >= 2) {
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
