import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: { dayId: string } }
) {
  const dayNumber = parseInt(params.dayId);

  if (isNaN(dayNumber)) {
    return NextResponse.json({ error: "Invalid day" }, { status: 400 });
  }

  // Find the daily content for this day (Module 1 for now)
  const dailyContent = await prisma.dailyContent.findFirst({
    where: { dayNumber },
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
    return NextResponse.json({ questions: [] });
  }

  return NextResponse.json({
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
