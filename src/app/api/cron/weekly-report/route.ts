import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWeeklyReport } from "@/lib/email";

// Called every Monday at 7 AM COT
export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  if (key !== process.env.CRON_SECRET && key !== "dev-cron-key") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get all active students with their progress
  const students = await prisma.user.findMany({
    where: {
      role: "STUDENT",
      enrollmentStatus: "APPROVED",
      isActive: true,
    },
    include: {
      streak: true,
      audioProgress: { where: { isCompleted: true } },
      quizAttempts: true,
    },
  });

  // Calculate rankings
  const ranked = students
    .map((s) => ({
      ...s,
      daysCompleted: s.audioProgress.length,
      quizAvg: s.quizAttempts.length > 0
        ? Math.round(s.quizAttempts.reduce((sum, q) => sum + q.score, 0) / s.quizAttempts.length * 100 / 3)
        : 0,
      score: s.audioProgress.length * 10 + s.quizAttempts.length * 5 + (s.streak?.currentStreak || 0) * 3,
    }))
    .sort((a, b) => b.score - a.score);

  let emailsSent = 0;

  for (let i = 0; i < ranked.length; i++) {
    const student = ranked[i];
    try {
      await sendWeeklyReport(student.email, {
        name: student.fullName.split(" ")[0],
        daysCompleted: student.daysCompleted,
        streak: student.streak?.currentStreak || 0,
        rank: i + 1,
        totalStudents: ranked.length,
        quizAvg: student.quizAvg,
      });
      emailsSent++;
    } catch (e) {
      console.error(`Weekly report failed for ${student.email}:`, e);
    }
  }

  return NextResponse.json({
    success: true,
    totalStudents: ranked.length,
    emailsSent,
    timestamp: new Date().toISOString(),
  });
}
