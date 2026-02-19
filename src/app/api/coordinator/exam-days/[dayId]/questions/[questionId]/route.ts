import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(
  req: NextRequest,
  { params }: { params: { dayId: string; questionId: string } }
) {
  const session = await auth();
  if (!session?.user?.role || session.user.role !== "COORDINATOR") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const { caseText, questionText, explanation, competency, difficulty, options } = body;

  // Delete old options and recreate
  await prisma.quizAnswer.deleteMany({ where: { questionId: params.questionId } });
  await prisma.questionOption.deleteMany({ where: { questionId: params.questionId } });

  const question = await prisma.dailyQuestion.update({
    where: { id: params.questionId },
    data: {
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

  return NextResponse.json(question);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { dayId: string; questionId: string } }
) {
  const session = await auth();
  if (!session?.user?.role || session.user.role !== "COORDINATOR") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  await prisma.quizAnswer.deleteMany({ where: { questionId: params.questionId } });
  await prisma.questionOption.deleteMany({ where: { questionId: params.questionId } });
  await prisma.dailyQuestion.delete({ where: { id: params.questionId } });

  return NextResponse.json({ success: true });
}
