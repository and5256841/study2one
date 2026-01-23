import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "COORDINATOR") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const simulacros = await prisma.simulacro.findMany({
    where: { createdById: session.user.id },
    include: {
      _count: { select: { questions: true, attempts: true } },
    },
    orderBy: { scheduledDate: "desc" },
  });

  return NextResponse.json({ simulacros });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "COORDINATOR") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { title, scheduledDate, durationMinutes, questions } = await req.json();

  if (!title || !scheduledDate || !questions || questions.length === 0) {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  }

  // Find or create cohort
  let cohort = await prisma.cohort.findFirst({
    where: { coordinatorId: session.user.id },
  });
  if (!cohort) {
    cohort = await prisma.cohort.create({
      data: {
        name: "Cohorte Principal",
        startDate: new Date(),
        coordinatorId: session.user.id,
      },
    });
  }

  const simulacro = await prisma.simulacro.create({
    data: {
      cohortId: cohort.id,
      title,
      scheduledDate: new Date(scheduledDate),
      durationMinutes: durationMinutes || 75,
      totalQuestions: questions.length,
      isActive: true,
      createdById: session.user.id,
      questions: {
        create: questions.map((q: { questionText: string; caseText?: string; competency?: string; options: { letter: string; text: string; isCorrect: boolean }[] }, i: number) => ({
          questionOrder: i + 1,
          questionText: q.questionText,
          caseText: q.caseText || null,
          competency: q.competency || null,
          options: {
            create: q.options.map((o: { letter: string; text: string; isCorrect: boolean }) => ({
              letter: o.letter,
              text: o.text,
              isCorrect: o.isCorrect,
            })),
          },
        })),
      },
    },
  });

  return NextResponse.json({ success: true, simulacroId: simulacro.id });
}
