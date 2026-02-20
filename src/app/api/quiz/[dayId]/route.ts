import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getModuleForDay, getDayInModule, getStudentCurrentDay, TOTAL_DAYS } from "@/lib/student-day";

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

  // Future day access control (skip for coordinators/clients)
  if (session.user.role === "STUDENT") {
    const studentDayInfo = await getStudentCurrentDay(session.user.id);
    if (studentDayInfo && globalDay > studentDayInfo.dayNumber) {
      return NextResponse.json(
        { error: "No tienes acceso a este día aún" },
        { status: 403 }
      );
    }
  }

  const moduleInfo = getModuleForDay(globalDay);
  const dayNumber = getDayInModule(globalDay);

  // Find the daily content for this day using correct module mapping
  const dailyContent = await prisma.dailyContent.findFirst({
    where: { dayNumber, module: { number: moduleInfo.number } },
    include: {
      questions: {
        orderBy: { questionOrder: "asc" },
        include: {
          options: {
            orderBy: { letter: "asc" },
          },
        },
      },
    },
  });

  if (!dailyContent || dailyContent.questions.length === 0) {
    return NextResponse.json({ questions: [], isExamDay: dailyContent?.isExamDay ?? false });
  }

  return NextResponse.json({
    isExamDay: dailyContent.isExamDay,
    questions: dailyContent.questions.map((q) => ({
      id: q.id,
      questionOrder: q.questionOrder,
      caseText: q.caseText,
      questionText: q.questionText,
      options: q.options.map((o) => ({
        id: o.id,
        letter: o.letter,
        text: o.text,
      })),
    })),
  });
}
