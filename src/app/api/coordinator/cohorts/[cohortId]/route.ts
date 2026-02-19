import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** PATCH /api/coordinator/cohorts/[cohortId] — Edit cohort */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ cohortId: string }> }
) {
  const session = await auth();
  if (!session?.user?.role || session.user.role !== "COORDINATOR") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { cohortId } = await params;
  const body = await req.json();

  const cohort = await prisma.cohort.findUnique({ where: { id: cohortId } });
  if (!cohort || cohort.coordinatorId !== session.user.id) {
    return NextResponse.json({ error: "Cohorte no encontrada" }, { status: 404 });
  }

  const updateData: Record<string, unknown> = {};
  if (body.name) updateData.name = body.name;
  if (body.startDate) updateData.startDate = new Date(body.startDate);
  if (typeof body.isActive === "boolean") updateData.isActive = body.isActive;

  const updated = await prisma.cohort.update({
    where: { id: cohortId },
    data: updateData,
  });

  return NextResponse.json({ success: true, cohort: updated });
}

/** GET /api/coordinator/cohorts/[cohortId] — Get cohort details with students */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ cohortId: string }> }
) {
  const session = await auth();
  if (!session?.user?.role || session.user.role !== "COORDINATOR") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { cohortId } = await params;

  const cohort = await prisma.cohort.findUnique({
    where: { id: cohortId },
    include: {
      students: {
        include: {
          student: {
            select: {
              id: true,
              fullName: true,
              email: true,
              pseudonym: true,
              createdAt: true,
              streak: {
                select: { currentStreak: true, lastActivityDate: true },
              },
              quizAttempts: {
                select: { score: true, totalQuestions: true },
              },
              _count: {
                select: {
                  audioProgress: { where: { isCompleted: true } },
                  quizAttempts: true,
                  photoUploads: true,
                },
              },
            },
          },
        },
        orderBy: { joinedAt: "desc" },
      },
    },
  });

  if (!cohort || cohort.coordinatorId !== session.user.id) {
    return NextResponse.json({ error: "Cohorte no encontrada" }, { status: 404 });
  }

  return NextResponse.json({
    cohort: {
      id: cohort.id,
      name: cohort.name,
      startDate: cohort.startDate,
      endDate: cohort.endDate,
      isActive: cohort.isActive,
    },
    students: cohort.students.map((cs) => {
      const attempts = cs.student.quizAttempts;
      let avgQuizScore = 0;
      if (attempts.length > 0) {
        const totalPct = attempts.reduce((sum, a) => {
          const pct = a.totalQuestions > 0 ? (a.score / a.totalQuestions) * 100 : 0;
          return sum + pct;
        }, 0);
        avgQuizScore = Math.round(totalPct / attempts.length);
      }

      return {
        id: cs.student.id,
        fullName: cs.student.fullName,
        email: cs.student.email,
        pseudonym: cs.student.pseudonym,
        joinedAt: cs.joinedAt,
        streak: cs.student.streak?.currentStreak ?? 0,
        lastActivity: cs.student.streak?.lastActivityDate ?? null,
        daysCompleted: cs.student._count.audioProgress,
        quizzesTaken: cs.student._count.quizAttempts,
        photosUploaded: cs.student._count.photoUploads,
        avgQuizScore,
      };
    }),
  });
}
