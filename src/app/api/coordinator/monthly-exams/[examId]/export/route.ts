import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** GET /api/coordinator/monthly-exams/[examId]/export — CSV export of answer events for research */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  const session = await auth();
  if (!session?.user?.role || session.user.role !== "COORDINATOR") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { examId } = await params;

  const exam = await prisma.monthlyExam.findUnique({
    where: { id: examId },
    select: { number: true, title: true },
  });

  if (!exam) {
    return NextResponse.json({ error: "Simulacro no encontrado" }, { status: 404 });
  }

  // Fetch all answer events with full context
  const events = await prisma.examAnswerEvent.findMany({
    where: {
      sectionAttempt: {
        examAttempt: { examId },
      },
    },
    include: {
      sectionAttempt: {
        select: {
          examAttempt: {
            select: {
              student: { select: { id: true, pseudonym: true, fullName: true } },
            },
          },
          section: { select: { sectionNumber: true, title: true } },
        },
      },
      question: { select: { questionOrder: true, questionText: true } },
      selectedOption: { select: { letter: true, isCorrect: true } },
      previousOption: { select: { letter: true, isCorrect: true } },
    },
    orderBy: { timestamp: "asc" },
  });

  // Fetch question views
  const views = await prisma.examQuestionView.findMany({
    where: {
      sectionAttempt: {
        examAttempt: { examId },
      },
    },
    include: {
      sectionAttempt: {
        select: {
          examAttempt: {
            select: {
              student: { select: { id: true, pseudonym: true } },
            },
          },
          section: { select: { sectionNumber: true } },
        },
      },
      question: { select: { questionOrder: true } },
    },
    orderBy: { viewedAt: "asc" },
  });

  // Build CSV for answer events
  const eventsHeader = "studentId,pseudonym,sectionNumber,sectionTitle,questionOrder,eventType,selectedOption,selectedIsCorrect,previousOption,previousIsCorrect,timestamp";
  const eventsRows = events.map((e) => {
    const student = e.sectionAttempt.examAttempt.student;
    const section = e.sectionAttempt.section;
    return [
      student.id,
      `"${(student.pseudonym || student.fullName || "").replace(/"/g, '""')}"`,
      section.sectionNumber,
      `"${section.title.replace(/"/g, '""')}"`,
      e.question.questionOrder,
      e.eventType,
      e.selectedOption?.letter || "",
      e.selectedOption?.isCorrect ?? "",
      e.previousOption?.letter || "",
      e.previousOption?.isCorrect ?? "",
      e.timestamp.toISOString(),
    ].join(",");
  });

  // Build CSV for question views
  const viewsHeader = "studentId,pseudonym,sectionNumber,questionOrder,viewedAt,leftAt,durationSeconds";
  const viewsRows = views.map((v) => {
    const student = v.sectionAttempt.examAttempt.student;
    const section = v.sectionAttempt.section;
    return [
      student.id,
      `"${(student.pseudonym || "").replace(/"/g, '""')}"`,
      section.sectionNumber,
      v.question.questionOrder,
      v.viewedAt.toISOString(),
      v.leftAt?.toISOString() || "",
      v.durationSeconds ?? "",
    ].join(",");
  });

  const csv = [
    `# Simulacro ${exam.number}: ${exam.title}`,
    `# Exportado: ${new Date().toISOString()}`,
    "",
    "## EVENTOS DE RESPUESTA",
    eventsHeader,
    ...eventsRows,
    "",
    "## VISTAS DE PREGUNTAS",
    viewsHeader,
    ...viewsRows,
  ].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="simulacro-${exam.number}-metricas.csv"`,
    },
  });
}
