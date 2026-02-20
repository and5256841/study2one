import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getModuleForDay, getDayInModule, getStudentCurrentDay, TOTAL_DAYS } from "@/lib/student-day";

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

  // Future day access control (skip for coordinators/clients)
  if (session.user.role === "STUDENT") {
    const studentDayInfo = await getStudentCurrentDay(session.user.id);
    if (studentDayInfo && globalDay > studentDayInfo.dayNumber) {
      return NextResponse.json(
        { error: "No tienes acceso a este día aún" },
        { status: 403 }
      );
    }
  }

  const moduleInfo = getModuleForDay(globalDay);
  const dayNumber = getDayInModule(globalDay);

  const { answers, timeSpentSeconds } = await req.json();

  // Find daily content using correct module mapping
  const dailyContent = await prisma.dailyContent.findFirst({
    where: { dayNumber, module: { number: moduleInfo.number } },
  });

  if (!dailyContent) {
    return NextResponse.json({ error: "Contenido no encontrado" }, { status: 404 });
  }

  // Server-side score recalculation: look up correct options from DB
  const questionIds = answers.map((a: { questionId: string }) => a.questionId);
  const correctOptions = await prisma.questionOption.findMany({
    where: {
      question: { id: { in: questionIds } },
      isCorrect: true,
    },
    select: { id: true, questionId: true },
  });

  // Build a map: questionId -> set of correct option IDs
  const correctOptionMap = new Map<string, Set<string>>();
  for (const opt of correctOptions) {
    if (!correctOptionMap.has(opt.questionId)) {
      correctOptionMap.set(opt.questionId, new Set());
    }
    correctOptionMap.get(opt.questionId)!.add(opt.id);
  }

  // Calculate the real score server-side
  let serverScore = 0;
  const answersWithCorrectness = answers.map(
    (answer: { questionId: string; selectedOptionId?: string; optionId?: string }) => {
      const selectedId = answer.selectedOptionId || answer.optionId;
      const correctSet = correctOptionMap.get(answer.questionId);
      const isCorrect = !!(selectedId && correctSet && correctSet.has(selectedId));
      if (isCorrect) serverScore++;
      return { ...answer, isCorrect, selectedOptionId: selectedId };
    }
  );

  // Check if student already passed this quiz today (prevent streak gaming)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const existingPassToday = await prisma.quizAttempt.findFirst({
    where: {
      studentId: session.user.id,
      dailyContentId: dailyContent.id,
      completedAt: { gte: today, lt: tomorrow },
      score: { gte: dailyContent.isExamDay ? Math.ceil(answers.length * 0.67) : 2 },
    },
  });

  // Create quiz attempt with server-calculated score
  const attempt = await prisma.quizAttempt.create({
    data: {
      studentId: session.user.id,
      dailyContentId: dailyContent.id,
      score: serverScore,
      totalQuestions: answers.length,
      completedAt: new Date(),
      ...(timeSpentSeconds != null ? { timeSpentSeconds } : {}),
    },
  });

  // Save individual answers with server-verified correctness (batch insert)
  await prisma.quizAnswer.createMany({
    data: answersWithCorrectness.map(
      (answer: { questionId: string; selectedOptionId?: string; isCorrect: boolean }) => ({
        attemptId: attempt.id,
        questionId: answer.questionId,
        selectedOptionId: answer.selectedOptionId || null,
        isCorrect: answer.isCorrect,
      })
    ),
  });

  // Update streak: exams (15 q) need 10/15 (67%), normal quiz (3 q) needs 2/3
  // Only increment if this is the first passing attempt today (prevents streak gaming)
  const passThreshold = dailyContent.isExamDay
    ? Math.ceil(answers.length * 0.67)
    : 2;
  if (serverScore >= passThreshold && !existingPassToday) {
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

    // Update longestStreak = max(longestStreak, currentStreak)
    await prisma.$executeRaw`UPDATE streaks SET longest_streak = GREATEST(longest_streak, current_streak) WHERE student_id = ${session.user.id}`;
  }

  return NextResponse.json({
    success: true,
    attemptId: attempt.id,
    score: serverScore,
  });
}
