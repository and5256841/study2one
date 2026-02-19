import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStudentRhythmFromActivity } from "@/lib/ecg-rhythms";

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
      streak: true,
      quizAttempts: {
        select: { score: true, totalQuestions: true },
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
      const quizzesPassed = s.quizAttempts.filter((q) => q.score >= 2).length;
      const score = completedDays * 10 + quizzesPassed * 5 + (s.streak?.currentStreak || 0) * 3;

      // ECG rhythm based on quiz performance + activity
      const avgQuizScore = s.quizAttempts.length > 0
        ? Math.round(
            (s.quizAttempts.reduce((sum, q) => sum + q.score, 0) /
              s.quizAttempts.reduce((sum, q) => sum + q.totalQuestions, 0)) * 100
          )
        : 0;
      const rhythm = getStudentRhythmFromActivity(
        s.streak?.lastActivityDate?.toISOString() ?? null,
        s.streak?.currentStreak ?? 0,
        avgQuizScore,
      );

      return {
        id: s.id,
        name: s.pseudonym || s.fullName.split(" ")[0],
        rhythmType: rhythm.type,
        rhythmColor: rhythm.color,
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
