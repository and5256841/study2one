import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // Get all students with their streaks and progress
  const students = await prisma.user.findMany({
    where: { role: "STUDENT", isActive: true },
    select: {
      id: true,
      pseudonym: true,
      fullName: true,
      avatarSeed: true,
      avatarStyle: true,
      streak: true,
      quizAttempts: {
        where: { score: { gte: 2 } },
        select: { dailyContentId: true },
      },
      audioProgress: {
        where: { isCompleted: true },
        select: { dailyContentId: true },
      },
    },
  });

  // Calculate scores and rank
  const ranked = students
    .map((s) => {
      const completedDays = s.audioProgress.length;
      const quizzesPassed = s.quizAttempts.length;
      // Score: weighted combination of days completed + streak
      const score = completedDays * 10 + quizzesPassed * 5 + (s.streak?.currentStreak || 0) * 3;

      return {
        id: s.id,
        name: s.pseudonym || s.fullName.split(" ")[0],
        streak: s.streak?.currentStreak || 0,
        completedDays,
        quizzesPassed,
        score,
        isCurrentUser: s.id === session.user!.id,
      };
    })
    .sort((a, b) => b.score - a.score)
    .map((s, i) => ({ ...s, rank: i + 1 }));

  return NextResponse.json({ leaderboard: ranked });
}
