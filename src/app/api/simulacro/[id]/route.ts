import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET simulacro questions for a student taking the exam
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const simulacro = await prisma.simulacro.findUnique({
    where: { id: params.id },
    include: {
      questions: {
        orderBy: { questionOrder: "asc" },
        include: {
          options: {
            select: { id: true, letter: true, text: true },
          },
        },
      },
    },
  });

  if (!simulacro) {
    return NextResponse.json({ error: "Simulacro no encontrado" }, { status: 404 });
  }

  if (!simulacro.isActive) {
    return NextResponse.json({ error: "Simulacro no disponible" }, { status: 403 });
  }

  return NextResponse.json({
    id: simulacro.id,
    title: simulacro.title,
    durationMinutes: simulacro.durationMinutes,
    totalQuestions: simulacro.totalQuestions,
    questions: simulacro.questions.map((q) => ({
      id: q.id,
      order: q.questionOrder,
      caseText: q.caseText,
      questionText: q.questionText,
      competency: q.competency,
      options: q.options,
    })),
  });
}
