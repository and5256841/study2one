import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // Get streak
  const streak = await prisma.streak.findUnique({
    where: { studentId: session.user.id },
  });

  // Get completed days (audio completed)
  const completedAudio = await prisma.audioProgress.findMany({
    where: {
      studentId: session.user.id,
      isCompleted: true,
    },
    include: { dailyContent: true },
    orderBy: { dailyContent: { dayNumber: "asc" } },
  });

  // Get quiz attempts
  const quizAttempts = await prisma.quizAttempt.findMany({
    where: { studentId: session.user.id },
    include: { dailyContent: true },
  });

  // Determine current day (next uncompleted day)
  const completedDayNumbers = completedAudio.map((ap) => ap.dailyContent.dayNumber);
  const quizDayNumbers = quizAttempts.map((qa) => qa.dailyContent.dayNumber);

  // A day is fully completed when audio is done AND quiz is passed (score >= 2)
  const fullyCompletedDays = completedDayNumbers.filter((day) => quizDayNumbers.includes(day));

  let currentDay = 1;
  for (let i = 1; i <= 15; i++) {
    if (!fullyCompletedDays.includes(i)) {
      currentDay = i;
      break;
    }
    if (i === 15) currentDay = 15;
  }

  // Get user info
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { fullName: true, pseudonym: true, avatarSeed: true, avatarStyle: true },
  });

  return NextResponse.json({
    studentName: user?.pseudonym || user?.fullName || "Estudiante",
    avatarSeed: user?.avatarSeed,
    avatarStyle: user?.avatarStyle,
    currentDay,
    currentModule: "Lectura Critica",
    streak: {
      current: streak?.currentStreak || 0,
      longest: streak?.longestStreak || 0,
      lastActivity: streak?.lastActivityDate,
    },
    progress: {
      completedDays: fullyCompletedDays.length,
      totalDays: 120,
      percentage: Math.round((fullyCompletedDays.length / 120) * 100),
    },
  });
}
