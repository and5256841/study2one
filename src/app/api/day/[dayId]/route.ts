import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getModuleForDay, getDayInModule, TOTAL_DAYS } from "@/lib/student-day";

export async function GET(
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

  const moduleInfo = getModuleForDay(globalDay);
  const dayInModule = getDayInModule(globalDay);

  const dailyContent = await prisma.dailyContent.findFirst({
    where: {
      dayNumber: dayInModule,
      module: { number: moduleInfo.number },
    },
    include: {
      module: { select: { name: true, number: true, icon: true } },
    },
  });

  if (!dailyContent) {
    return NextResponse.json({ error: "Contenido no encontrado" }, { status: 404 });
  }

  // Fetch student progress in parallel
  const [audioProgress, quizAttempt, photoUpload] = await Promise.all([
    prisma.audioProgress.findUnique({
      where: {
        studentId_dailyContentId: {
          studentId: session.user.id,
          dailyContentId: dailyContent.id,
        },
      },
      select: {
        isCompleted: true,
        completionPercentage: true,
        lastPositionSeconds: true,
      },
    }),
    prisma.quizAttempt.findFirst({
      where: {
        studentId: session.user.id,
        dailyContentId: dailyContent.id,
      },
      orderBy: { completedAt: "desc" },
      select: { id: true, score: true, totalQuestions: true },
    }),
    prisma.photoUpload.findFirst({
      where: {
        studentId: session.user.id,
        dailyContentId: dailyContent.id,
      },
      select: { id: true, isApproved: true },
    }),
  ]);

  return NextResponse.json({
    id: dailyContent.id,
    globalDay,
    dayNumber: dailyContent.dayNumber,
    title: dailyContent.title,
    audioUrl: dailyContent.audioUrl
      ? `/api/audio/file/${globalDay}`
      : null,
    summary: dailyContent.summary,
    keyConcepts: dailyContent.keyConcepts,
    isExamDay: dailyContent.isExamDay,
    moduleName: dailyContent.module.name,
    moduleNumber: dailyContent.module.number,
    moduleIcon: dailyContent.module.icon,
    audioProgress: audioProgress
      ? {
          isCompleted: audioProgress.isCompleted,
          completionPercentage: audioProgress.completionPercentage,
          lastPositionSeconds: audioProgress.lastPositionSeconds,
        }
      : null,
    quizCompleted: !!quizAttempt,
    quizScore: quizAttempt ? { score: quizAttempt.score, total: quizAttempt.totalQuestions } : null,
    photoUploaded: !!photoUpload,
    photoApproved: photoUpload?.isApproved ?? false,
  });
}
