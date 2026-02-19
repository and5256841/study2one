import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStudentCurrentDay } from "@/lib/student-day";
import { getMissedSections } from "@/lib/exam-schedule";

/**
 * Cron: Check exam deadlines and auto-zero missed sections.
 * Called daily. For each CohortExamSchedule, checks sections whose
 * scheduled day has passed. Students without a SUBMITTED attempt
 * for those sections get a zero.
 *
 * Trigger with: GET /api/cron/check-exam-deadlines?key=CRON_SECRET
 */
export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  if (key !== process.env.CRON_SECRET && key !== "dev-cron-key") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schedules = await prisma.cohortExamSchedule.findMany({
    include: {
      cohort: {
        select: {
          id: true,
          students: {
            select: {
              studentId: true,
              student: { select: { enrollmentStatus: true } },
            },
          },
        },
      },
      exam: {
        select: {
          id: true,
          isActive: true,
          sections: {
            select: { id: true, sectionNumber: true, totalQuestions: true },
            orderBy: { orderIndex: "asc" },
          },
        },
      },
    },
  });

  let zeroedCount = 0;
  let examsCompleted = 0;

  for (const schedule of schedules) {
    if (!schedule.exam.isActive) continue;

    // Filter to approved students only
    const approvedStudentIds = schedule.cohort.students
      .filter((s) => s.student.enrollmentStatus === "APPROVED")
      .map((s) => s.studentId);

    if (approvedStudentIds.length === 0) continue;

    for (const studentId of approvedStudentIds) {
      const dayInfo = await getStudentCurrentDay(studentId);
      if (!dayInfo) continue;

      const missedSections = getMissedSections(schedule.startDay, dayInfo.dayNumber);
      if (missedSections.length === 0) continue;

      // Get or create exam attempt
      const attempt = await prisma.monthlyExamAttempt.upsert({
        where: {
          examId_studentId: {
            examId: schedule.exam.id,
            studentId,
          },
        },
        update: {},
        create: {
          examId: schedule.exam.id,
          studentId,
        },
      });

      // For each missed section, create zero attempt if not already submitted
      for (const missed of missedSections) {
        const section = schedule.exam.sections.find(
          (s) => s.sectionNumber === missed.sectionNumber
        );
        if (!section) continue;

        const existing = await prisma.examSectionAttempt.findUnique({
          where: {
            examAttemptId_sectionId: {
              examAttemptId: attempt.id,
              sectionId: section.id,
            },
          },
        });

        // Only create zero if no attempt exists or if it's NOT_STARTED
        if (!existing) {
          await prisma.examSectionAttempt.create({
            data: {
              examAttemptId: attempt.id,
              sectionId: section.id,
              status: "SUBMITTED",
              startedAt: new Date(),
              submittedAt: new Date(),
              totalCorrect: 0,
              timeSpentSeconds: 0,
              tabSwitches: 0,
            },
          });
          zeroedCount++;
        } else if (existing.status === "NOT_STARTED") {
          await prisma.examSectionAttempt.update({
            where: { id: existing.id },
            data: {
              status: "SUBMITTED",
              submittedAt: new Date(),
              totalCorrect: 0,
              timeSpentSeconds: 0,
            },
          });
          zeroedCount++;
        }
        // If IN_PROGRESS, leave it — student may still be working
        // If SUBMITTED, already done
      }

      // Check if all 8 sections are now SUBMITTED → mark exam complete
      const allAttempts = await prisma.examSectionAttempt.findMany({
        where: { examAttemptId: attempt.id },
        include: { section: { select: { totalQuestions: true, isWriting: true } } },
      });

      const totalSections = schedule.exam.sections.length;
      const submittedCount = allAttempts.filter(
        (sa) => sa.status === "SUBMITTED"
      ).length;

      if (submittedCount === totalSections && !attempt.isCompleted) {
        const mcAttempts = allAttempts.filter(
          (sa) => !sa.section.isWriting && sa.status === "SUBMITTED"
        );
        const totalMcCorrect = mcAttempts.reduce(
          (sum, sa) => sum + sa.totalCorrect,
          0
        );
        const totalMcQuestions = mcAttempts.reduce(
          (sum, sa) => sum + sa.section.totalQuestions,
          0
        );
        const totalScore =
          totalMcQuestions > 0
            ? Math.round((totalMcCorrect / totalMcQuestions) * 10000) / 100
            : 0;

        await prisma.monthlyExamAttempt.update({
          where: { id: attempt.id },
          data: { isCompleted: true, totalScore },
        });
        examsCompleted++;
      }
    }
  }

  return NextResponse.json({
    success: true,
    zeroedSections: zeroedCount,
    examsCompleted,
  });
}
