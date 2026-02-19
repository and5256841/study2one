import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWeekStartDay } from "@/lib/student-day";
import { getSectionSchedule, isValidScheduleStart } from "@/lib/exam-schedule";

/** GET /api/coordinator/cohort-exam-schedule?cohortId=X — List schedules for a cohort */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.role || session.user.role !== "COORDINATOR") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const cohortId = req.nextUrl.searchParams.get("cohortId");
  const examId = req.nextUrl.searchParams.get("examId");

  const where: Record<string, string> = {};
  if (cohortId) where.cohortId = cohortId;
  if (examId) where.examId = examId;

  const schedules = await prisma.cohortExamSchedule.findMany({
    where,
    include: {
      cohort: { select: { id: true, name: true, startDate: true } },
      exam: { select: { id: true, number: true, title: true, mode: true } },
      scheduledBy: { select: { id: true, fullName: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const result = schedules.map((s) => ({
    id: s.id,
    cohortId: s.cohortId,
    cohortName: s.cohort.name,
    cohortStartDate: s.cohort.startDate,
    examId: s.examId,
    examNumber: s.exam.number,
    examTitle: s.exam.title,
    examMode: s.exam.mode,
    startDay: s.startDay,
    sectionSchedule: getSectionSchedule(s.startDay),
    scheduledBy: s.scheduledBy.fullName,
    createdAt: s.createdAt,
  }));

  return NextResponse.json({ schedules: result });
}

/** POST /api/coordinator/cohort-exam-schedule — Create/update a schedule */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.role || session.user.role !== "COORDINATOR") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const { cohortId, examId, startWeek } = body;

  if (!cohortId || !examId || !startWeek) {
    return NextResponse.json(
      { error: "Faltan campos: cohortId, examId, startWeek" },
      { status: 400 }
    );
  }

  if (typeof startWeek !== "number" || startWeek < 1 || startWeek > 25) {
    return NextResponse.json(
      { error: "startWeek debe ser un número entre 1 y 25" },
      { status: 400 }
    );
  }

  const startDay = getWeekStartDay(startWeek);

  if (!isValidScheduleStart(startDay)) {
    return NextResponse.json(
      { error: "El simulacro no cabe en el programa (necesita 8 días hábiles desde la semana indicada)" },
      { status: 400 }
    );
  }

  // Validate cohort belongs to coordinator
  const cohort = await prisma.cohort.findFirst({
    where: { id: cohortId, coordinatorId: session.user.id },
  });

  if (!cohort) {
    return NextResponse.json(
      { error: "Cohorte no encontrada o no tienes permiso" },
      { status: 404 }
    );
  }

  // Validate exam exists
  const exam = await prisma.monthlyExam.findUnique({
    where: { id: examId },
  });

  if (!exam) {
    return NextResponse.json({ error: "Simulacro no encontrado" }, { status: 404 });
  }

  // Upsert schedule
  const schedule = await prisma.cohortExamSchedule.upsert({
    where: { cohortId_examId: { cohortId, examId } },
    update: { startDay, scheduledById: session.user.id },
    create: {
      cohortId,
      examId,
      startDay,
      scheduledById: session.user.id,
    },
  });

  // Auto-activate exam if not active
  if (!exam.isActive) {
    await prisma.monthlyExam.update({
      where: { id: examId },
      data: { isActive: true },
    });
  }

  return NextResponse.json({
    schedule: {
      id: schedule.id,
      cohortId: schedule.cohortId,
      examId: schedule.examId,
      startDay: schedule.startDay,
      sectionSchedule: getSectionSchedule(schedule.startDay),
    },
  });
}
