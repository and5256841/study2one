import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStudentRhythmFromActivity } from "@/lib/ecg-rhythms";

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
      university: true,
      enrollmentStatus: true,
      createdAt: true,
      streak: true,
      audioProgress: true, // Get all to calculate stats
      quizAttempts: true,
      photoUploads: true,
      simulacroAttempts: {
        include: {
          simulacro: {
            select: { title: true },
          },
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  // Audio stats
  const completedAudios = user.audioProgress.filter((a) => a.isCompleted);
  const totalAudioCompleted = completedAudios.length;
  const totalListenedSeconds = user.audioProgress.reduce(
    (sum, a) => sum + (a.totalListenedSeconds || 0),
    0
  );

  // Calculate average playback speed
  const speedCounts: Record<number, number> = {};
  user.audioProgress.forEach((a) => {
    const speed = a.playbackSpeed || 1.0;
    speedCounts[speed] = (speedCounts[speed] || 0) + 1;
  });
  const mostUsedSpeed =
    Object.entries(speedCounts).length > 0
      ? parseFloat(
          Object.entries(speedCounts).sort((a, b) => b[1] - a[1])[0][0]
        )
      : 1.0;

  // Quiz stats
  const totalQuizzes = user.quizAttempts.length;
  const passedQuizzes = user.quizAttempts.filter(
    (q) => q.score >= Math.ceil(q.totalQuestions * 0.67)
  ).length;
  const failedQuizzes = totalQuizzes - passedQuizzes;
  const avgScore =
    totalQuizzes > 0
      ? Math.round(
          (user.quizAttempts.reduce((sum, q) => sum + q.score, 0) /
            user.quizAttempts.reduce((sum, q) => sum + q.totalQuestions, 0)) *
            100
        )
      : 0;

  // Simulacro stats
  const totalSimulacros = user.simulacroAttempts.length;
  const completedSimulacros = user.simulacroAttempts.filter(
    (s) => s.isCompleted
  ).length;
  const avgSimulacroScore =
    totalSimulacros > 0
      ? Math.round(
          user.simulacroAttempts.reduce((sum, s) => sum + (s.scorePercentage || 0), 0) /
            totalSimulacros
        )
      : 0;

  // Calculate total platform time (audio + quiz estimate)
  const estimatedQuizTime = totalQuizzes * 60; // 1 min per quiz estimate
  const totalPlatformSeconds = totalListenedSeconds + estimatedQuizTime;

  // Format time
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  // ECG Rhythm based on student metrics
  const lastActivity = user.streak?.lastActivityDate?.toISOString() ?? null;
  const currentStreak = user.streak?.currentStreak ?? 0;
  const rhythm = getStudentRhythmFromActivity(lastActivity, currentStreak, avgScore);

  return NextResponse.json({
    name: user.fullName,
    email: user.email,
    pseudonym: user.pseudonym,
    rhythm: {
      type: rhythm.type,
      label: rhythm.label,
      color: rhythm.color,
      description: rhythm.description,
    },
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
      quizzesPassed: passedQuizzes,
      quizzesFailed: failedQuizzes,
      avgQuizScore: avgScore,
      photosUploaded: user.photoUploads.length,
    },
    audioStats: {
      totalListenedSeconds,
      totalListenedFormatted: formatTime(totalListenedSeconds),
      mostUsedSpeed,
    },
    simulacroStats: {
      total: totalSimulacros,
      completed: completedSimulacros,
      avgScore: avgSimulacroScore,
    },
    platformTime: {
      totalSeconds: totalPlatformSeconds,
      formatted: formatTime(totalPlatformSeconds),
    },
  });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { pseudonym } = await req.json();

  if (!pseudonym || pseudonym.length < 3 || pseudonym.length > 20) {
    return NextResponse.json(
      { error: "El seudónimo debe tener entre 3 y 20 caracteres" },
      { status: 400 }
    );
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { pseudonym },
  });

  return NextResponse.json({ success: true });
}
