import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getModuleForDay, getDayInModule, TOTAL_DAYS } from "@/lib/student-day";

export async function POST(
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

  if (moduleInfo.number !== 4) {
    return NextResponse.json({ error: "Módulo sin ejercicios de escritura" }, { status: 400 });
  }

  const { content, timeSpentSeconds } = await req.json();

  if (!content || typeof content !== "string" || content.trim().length < 10) {
    return NextResponse.json({ error: "El texto es demasiado corto" }, { status: 400 });
  }

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

  const dailyContent = await prisma.dailyContent.findFirst({
    where: { dayNumber: dayInModule, module: { number: moduleInfo.number } },
    select: { id: true },
  });

  if (!dailyContent) {
    return NextResponse.json({ error: "Contenido no encontrado" }, { status: 404 });
  }

  const submission = await prisma.writingSubmission.create({
    data: {
      studentId: session.user.id,
      dailyContentId: dailyContent.id,
      content: content.trim(),
      wordCount,
      timeSpentSeconds: timeSpentSeconds ?? null,
    },
  });

  return NextResponse.json({ success: true, id: submission.id, wordCount });
}
