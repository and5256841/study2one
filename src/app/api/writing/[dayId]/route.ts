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

  // Only Module 4 has writing exercises
  if (moduleInfo.number !== 4) {
    return NextResponse.json({ error: "Este módulo no tiene ejercicios de escritura" }, { status: 404 });
  }

  const dailyContent = await prisma.dailyContent.findFirst({
    where: { dayNumber: dayInModule, module: { number: moduleInfo.number } },
    select: { id: true },
  });

  if (!dailyContent) {
    return NextResponse.json({ error: "Contenido no encontrado" }, { status: 404 });
  }

  const existing = await prisma.writingSubmission.findFirst({
    where: { studentId: session.user.id, dailyContentId: dailyContent.id },
    orderBy: { submittedAt: "desc" },
    select: { content: true, wordCount: true, timeSpentSeconds: true, submittedAt: true },
  });

  return NextResponse.json({
    dailyContentId: dailyContent.id,
    dayInModule,
    moduleName: moduleInfo.name,
    submission: existing,
  });
}
