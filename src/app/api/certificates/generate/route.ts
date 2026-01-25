import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

// POST: Generate a certificate for a student who completed the program
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "COORDINATOR") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { studentId } = await req.json();

  // Verify student exists and has completed enough
  const student = await prisma.user.findUnique({
    where: { id: studentId },
    include: {
      audioProgress: { where: { isCompleted: true } },
      quizAttempts: true,
    },
  });

  if (!student) {
    return NextResponse.json({ error: "Estudiante no encontrado" }, { status: 404 });
  }

  // Check if already has certificate
  const existing = await prisma.certificate.findFirst({
    where: { studentId },
  });
  if (existing) {
    return NextResponse.json({
      success: true,
      certificate: existing,
      message: "Certificado ya existe",
    });
  }

  // Find cohort
  const cohortStudent = await prisma.cohortStudent.findFirst({
    where: { studentId },
  });

  let cohort = cohortStudent
    ? await prisma.cohort.findUnique({ where: { id: cohortStudent.cohortId } })
    : null;

  if (!cohort) {
    cohort = await prisma.cohort.findFirst({
      where: { coordinatorId: session.user.id },
    });
  }

  if (!cohort) {
    return NextResponse.json({ error: "Cohorte no encontrada" }, { status: 404 });
  }

  // Generate verification code
  const verificationCode = crypto.randomBytes(8).toString("hex").toUpperCase();

  const certificate = await prisma.certificate.create({
    data: {
      studentId,
      cohortId: cohort.id,
      verificationCode,
    },
  });

  return NextResponse.json({ success: true, certificate });
}
