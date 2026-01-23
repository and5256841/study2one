import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      fullName: true,
      email: true,
      pseudonym: true,
      avatarSeed: true,
      avatarStyle: true,
      university: true,
      enrollmentStatus: true,
      createdAt: true,
      streak: true,
      audioProgress: {
        where: { isCompleted: true },
      },
      quizAttempts: true,
      photoUploads: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  // Calculate stats
  const totalAudioCompleted = user.audioProgress.length;
  const totalQuizzes = user.quizAttempts.length;
  const avgScore = totalQuizzes > 0
    ? Math.round(user.quizAttempts.reduce((sum, q) => sum + q.score, 0) / totalQuizzes * 100 / 3)
    : 0;
  const totalPhotos = user.photoUploads.length;

  return NextResponse.json({
    name: user.fullName,
    email: user.email,
    pseudonym: user.pseudonym,
    university: user.university,
    enrollmentStatus: user.enrollmentStatus,
    memberSince: user.createdAt,
    streak: {
      current: user.streak?.currentStreak || 0,
      longest: user.streak?.longestStreak || 0,
    },
    stats: {
      audioCompleted: totalAudioCompleted,
      quizzesTaken: totalQuizzes,
      avgQuizScore: avgScore,
      photosUploaded: totalPhotos,
    },
  });
}
