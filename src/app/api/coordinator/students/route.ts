import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "COORDINATOR") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const students = await prisma.user.findMany({
    where: { role: "STUDENT", enrollmentStatus: "APPROVED" },
    select: {
      id: true,
      fullName: true,
      email: true,
      pseudonym: true,
      university: true,
      createdAt: true,
      streak: true,
      audioProgress: {
        where: { isCompleted: true },
        select: { id: true },
      },
      quizAttempts: {
        select: { score: true },
      },
      photoUploads: {
        select: { id: true },
      },
    },
    orderBy: { fullName: "asc" },
  });

  const result = students.map((s) => {
    const avgScore = s.quizAttempts.length > 0
      ? Math.round(s.quizAttempts.reduce((sum, q) => sum + q.score, 0) / s.quizAttempts.length * 100 / 3)
      : 0;

    return {
      id: s.id,
      name: s.fullName,
      email: s.email,
      pseudonym: s.pseudonym,
      university: s.university,
      joinedAt: s.createdAt,
      streak: s.streak?.currentStreak || 0,
      lastActivity: s.streak?.lastActivityDate,
      daysCompleted: s.audioProgress.length,
      quizzesTaken: s.quizAttempts.length,
      avgQuizScore: avgScore,
      photosUploaded: s.photoUploads.length,
    };
  });

  return NextResponse.json({ students: result });
}
