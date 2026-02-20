import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "COORDINATOR") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // Find cohorts belonging to this coordinator
  const coordinatorCohorts = await prisma.cohort.findMany({
    where: { coordinatorId: session.user.id },
    select: { id: true },
  });
  const cohortIds = coordinatorCohorts.map((c) => c.id);

  // Show PENDING students who are either:
  // 1. Already linked to one of this coordinator's cohorts
  // 2. Not linked to any cohort yet (unassigned)
  const pending = await prisma.user.findMany({
    where: {
      role: "STUDENT",
      enrollmentStatus: "PENDING",
      OR: [
        {
          cohortStudents: {
            some: { cohortId: { in: cohortIds } },
          },
        },
        {
          cohortStudents: {
            none: {},
          },
        },
      ],
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      university: true,
      phone: true,
      createdAt: true,
      cohortStudents: {
        select: {
          cohortId: true,
          cohort: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ pending });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "COORDINATOR") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { studentId, action, cohortId } = await req.json();

  if (!studentId || !["APPROVED", "REJECTED"].includes(action)) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  // Verify the student exists, is a STUDENT, and is currently PENDING
  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: { id: true, role: true, enrollmentStatus: true, cohortStudents: true },
  });

  if (!student) {
    return NextResponse.json(
      { error: "Estudiante no encontrado" },
      { status: 404 }
    );
  }

  if (student.role !== "STUDENT") {
    return NextResponse.json(
      { error: "El usuario no es un estudiante" },
      { status: 400 }
    );
  }

  if (student.enrollmentStatus !== "PENDING") {
    return NextResponse.json(
      { error: "El estudiante no está en estado pendiente" },
      { status: 400 }
    );
  }

  // Update enrollment status
  await prisma.user.update({
    where: { id: studentId },
    data: {
      enrollmentStatus: action,
      approvedById: action === "APPROVED" ? session.user.id : undefined,
      approvedAt: action === "APPROVED" ? new Date() : undefined,
    },
  });

  // If approving, ensure the student is linked to a cohort
  if (action === "APPROVED") {
    const hasExistingCohort = student.cohortStudents.length > 0;

    if (!hasExistingCohort) {
      // Determine which cohort to assign the student to
      let targetCohortId = cohortId;

      if (!targetCohortId) {
        // Find the most recent active cohort belonging to this coordinator
        const defaultCohort = await prisma.cohort.findFirst({
          where: {
            coordinatorId: session.user.id,
            isActive: true,
          },
          orderBy: { createdAt: "desc" },
          select: { id: true },
        });

        if (defaultCohort) {
          targetCohortId = defaultCohort.id;
        }
      }

      if (targetCohortId) {
        await prisma.cohortStudent.create({
          data: {
            cohortId: targetCohortId,
            studentId: studentId,
          },
        });
      }
    }
  }

  return NextResponse.json({ success: true });
}
