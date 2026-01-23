import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: { dailyContentId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { currentTime, percentage, playbackSpeed } = await req.json();
  const { dailyContentId } = params;

  const progress = await prisma.audioProgress.upsert({
    where: {
      studentId_dailyContentId: {
        studentId: session.user.id,
        dailyContentId,
      },
    },
    update: {
      lastPositionSeconds: Math.floor(currentTime),
      totalListenedSeconds: { increment: 10 },
      completionPercentage: percentage,
      playbackSpeed: playbackSpeed || 1.0,
    },
    create: {
      studentId: session.user.id,
      dailyContentId,
      startedAt: new Date(),
      lastPositionSeconds: Math.floor(currentTime),
      totalListenedSeconds: 10,
      completionPercentage: percentage,
      playbackSpeed: playbackSpeed || 1.0,
    },
  });

  // Check if completed (90%+)
  if (percentage >= 90 && !progress.isCompleted) {
    await prisma.audioProgress.update({
      where: { id: progress.id },
      data: {
        isCompleted: true,
        completedAt: new Date(),
      },
    });

    // Update streak
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await prisma.streak.upsert({
      where: { studentId: session.user.id },
      update: {
        currentStreak: { increment: 1 },
        lastActivityDate: today,
        longestStreak: {
          // Will be handled in application logic
          increment: 0,
        },
      },
      create: {
        studentId: session.user.id,
        currentStreak: 1,
        longestStreak: 1,
        lastActivityDate: today,
      },
    });
  }

  return NextResponse.json({ success: true });
}
