import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** GET /api/monthly-exam/[examId]/results — Full results by section + competency */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { examId } = await params;

  const attempt = await prisma.monthlyExamAttempt.findUnique({
    where: { examId_studentId: { examId, studentId: session.user.id } },
    include: {
      exam: { select: { title: true, number: true } },
      sectionAttempts: {
        include: {
          section: {
            select: {
              id: true,
              sectionNumber: true,
              title: true,
              totalQuestions: true,
              isWriting: true,
              durationMinutes: true,
            },
          },
          answers: {
            include: {
              question: {
                select: {
                  id: true,
                  questionText: true,
                  explanation: true,
                  competency: true,
                  options: {
                    select: { id: true, letter: true, text: true, isCorrect: true },
                    orderBy: { letter: "asc" },
                  },
                },
              },
              selectedOption: {
                select: { id: true, letter: true, isCorrect: true },
              },
            },
          },
        },
        orderBy: { section: { orderIndex: "asc" } },
      },
    },
  });

  if (!attempt) {
    return NextResponse.json({ error: "No hay resultados" }, { status: 404 });
  }

  const sections = attempt.sectionAttempts.map((sa) => {
    // Competency breakdown
    const competencyMap: Record<string, { correct: number; total: number }> = {};

    for (const ans of sa.answers) {
      const comp = ans.question.competency || "general";
      if (!competencyMap[comp]) competencyMap[comp] = { correct: 0, total: 0 };
      competencyMap[comp].total++;
      if (ans.selectedOption?.isCorrect) competencyMap[comp].correct++;
    }

    const percentage =
      sa.section.totalQuestions > 0
        ? Math.round((sa.totalCorrect / sa.section.totalQuestions) * 100)
        : 0;

    return {
      sectionNumber: sa.section.sectionNumber,
      title: sa.section.title,
      isWriting: sa.section.isWriting,
      totalQuestions: sa.section.totalQuestions,
      totalCorrect: sa.totalCorrect,
      percentage,
      timeSpentSeconds: sa.timeSpentSeconds,
      durationMinutes: sa.section.durationMinutes,
      tabSwitches: sa.tabSwitches,
      writingContent: sa.writingContent,
      writingWordCount: sa.writingWordCount,
      status: sa.status,
      competencyBreakdown: competencyMap,
      answers: sa.answers.map((ans) => ({
        questionId: ans.question.id,
        questionText: ans.question.questionText,
        explanation: ans.question.explanation,
        competency: ans.question.competency,
        selectedOptionId: ans.selectedOption?.id ?? null,
        selectedLetter: ans.selectedOption?.letter ?? null,
        isCorrect: ans.selectedOption?.isCorrect ?? false,
        options: ans.question.options,
      })),
    };
  });

  return NextResponse.json({
    examTitle: attempt.exam.title,
    examNumber: attempt.exam.number,
    isCompleted: attempt.isCompleted,
    totalScore: attempt.totalScore,
    sections,
  });
}
