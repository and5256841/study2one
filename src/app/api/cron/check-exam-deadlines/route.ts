import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStudentCurrentDay } from "@/lib/student-day";
import { getMissedSections } from "@/lib/exam-schedule";
import type { ExamMode } from "@/lib/exam-schedule";

/**
 * Cron: Check exam deadlines and auto-zero missed sections.
 * Called daily. For each CohortExamSchedule, checks sections whose
 * scheduled day has passed. Students without a SUBMITTED attempt
 * for those sections get a zero. IN_PROGRESS sections whose time
 * has expired are auto-submitted with their saved answers.
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
          mode: true,
          sections: {
            select: { id: true, sectionNumber: true, totalQuestions: true, durationMinutes: true, isWriting: true },
            orderBy: { orderIndex: "asc" },
          },
        },
      },
    },
  });

  let zeroedCount = 0;
  let autoSubmittedCount = 0;
  let examsCompleted = 0;

  for (const schedule of schedules) {
    if (!schedule.exam.isActive) continue;

    const examMode = schedule.exam.mode as ExamMode;

    // Filter to approved students only
    const approvedStudentIds = schedule.cohort.students
      .filter((s) => s.student.enrollmentStatus === "APPROVED")
      .map((s) => s.studentId);

    if (approvedStudentIds.length === 0) continue;

    for (const studentId of approvedStudentIds) {
      const dayInfo = await getStudentCurrentDay(studentId);
      if (!dayInfo) continue;

      const missedSections = getMissedSections(schedule.startDay, dayInfo.dayNumber, examMode);
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

      // For each missed section, create zero attempt or auto-submit expired IN_PROGRESS
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

        // No attempt exists — create zero
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
          // NOT_STARTED — auto-zero
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
        } else if (existing.status === "IN_PROGRESS") {
          // IN_PROGRESS and scheduled day has passed — auto-submit with saved answers
          const now = new Date();
          const timeLimitSeconds = section.durationMinutes * 60;
          const timeExpired = existing.startedAt
            ? (now.getTime() - new Date(existing.startedAt).getTime()) / 1000 >= timeLimitSeconds
            : true; // No startedAt somehow — treat as expired

          if (timeExpired) {
            // Calculate score from saved answers
            let totalCorrect = 0;
            if (!section.isWriting) {
              const savedAnswers = await prisma.examSectionAnswer.findMany({
                where: { sectionAttemptId: existing.id },
                include: {
                  selectedOption: { select: { isCorrect: true } },
                },
              });
              totalCorrect = savedAnswers.filter((a) => a.selectedOption?.isCorrect).length;
            }

            const timeSpent = existing.startedAt
              ? Math.min(
                  Math.floor((now.getTime() - new Date(existing.startedAt).getTime()) / 1000),
                  timeLimitSeconds
                )
              : 0;

            await prisma.examSectionAttempt.update({
              where: { id: existing.id },
              data: {
                status: "SUBMITTED",
                submittedAt: now,
                totalCorrect,
                timeSpentSeconds: timeSpent,
              },
            });
            autoSubmittedCount++;
          }
          // If time hasn't expired yet (shouldn't happen since day passed), leave it
        }
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
    autoSubmittedSections: autoSubmittedCount,
    examsCompleted,
  });
}
