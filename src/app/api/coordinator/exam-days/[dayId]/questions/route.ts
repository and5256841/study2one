import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: { dayId: string } }
) {
  const session = await auth();
  if (!session?.user?.role || session.user.role !== "COORDINATOR") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const dayNumber = parseInt(params.dayId);
  const dailyContent = await prisma.dailyContent.findFirst({
    where: { dayNumber, isExamDay: true },
    include: {
      questions: {
        orderBy: { questionOrder: "asc" },
        include: { options: { orderBy: { letter: "asc" } } },
      },
    },
  });

  if (!dailyContent) {
    return NextResponse.json({ error: "Día de examen no encontrado" }, { status: 404 });
  }

  return NextResponse.json({
    dailyContentId: dailyContent.id,
    dayNumber: dailyContent.dayNumber,
    title: dailyContent.title,
    questions: dailyContent.questions,
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { dayId: string } }
) {
  const session = await auth();
  if (!session?.user?.role || session.user.role !== "COORDINATOR") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const dayNumber = parseInt(params.dayId);
  const dailyContent = await prisma.dailyContent.findFirst({
    where: { dayNumber, isExamDay: true },
  });

  if (!dailyContent) {
    return NextResponse.json({ error: "Día de examen no encontrado" }, { status: 404 });
  }

  const body = await req.json();
  const { caseText, questionText, explanation, competency, difficulty, options } = body;

  if (!questionText || !explanation || !Array.isArray(options) || options.length < 2) {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  }

  const count = await prisma.dailyQuestion.count({
    where: { dailyContentId: dailyContent.id },
  });

  const question = await prisma.dailyQuestion.create({
    data: {
      dailyContentId: dailyContent.id,
      questionOrder: count + 1,
      caseText: caseText || null,
      questionText,
      explanation,
      competency: competency || null,
      difficulty: difficulty || "MEDIUM",
      options: {
        create: options.map((o: { letter: string; text: string; isCorrect: boolean }) => ({
          letter: o.letter,
          text: o.text,
          isCorrect: o.isCorrect,
        })),
      },
    },
    include: { options: true },
  });

  return NextResponse.json(question, { status: 201 });
}
