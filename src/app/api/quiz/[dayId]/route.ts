import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getModuleForDay, getDayInModule, TOTAL_DAYS } from "@/lib/student-day";

export async function GET(
  req: NextRequest,
  { params }: { params: { dayId: string } }
) {
  const globalDay = parseInt(params.dayId);

  if (isNaN(globalDay) || globalDay < 1 || globalDay > TOTAL_DAYS) {
    return NextResponse.json({ error: "Invalid day" }, { status: 400 });
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
      explanation: q.explanation,
      options: q.options.map((o) => ({
        id: o.id,
        letter: o.letter,
        text: o.text,
        isCorrect: o.isCorrect,
      })),
    })),
  });
}
