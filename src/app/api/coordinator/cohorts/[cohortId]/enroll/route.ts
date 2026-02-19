import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";

// Characters excluding ambiguous: 0/O, l/1/I
const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

function generatePassword(length = 12): string {
  const bytes = crypto.randomBytes(length);
  return Array.from(bytes)
    .map((b) => CHARSET[b % CHARSET.length])
    .join("");
}

/** POST /api/coordinator/cohorts/[cohortId]/enroll — Enroll student directly */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ cohortId: string }> }
) {
  const session = await auth();
  if (!session?.user?.role || session.user.role !== "COORDINATOR") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { cohortId } = await params;
  const body = await req.json();
  const { email, fullName, pseudonym } = body;

  if (!email || !fullName) {
    return NextResponse.json(
      { error: "Email y nombre completo son requeridos" },
      { status: 400 }
    );
  }

  // Check cohort belongs to coordinator
  const cohort = await prisma.cohort.findUnique({ where: { id: cohortId } });
  if (!cohort || cohort.coordinatorId !== session.user.id) {
    return NextResponse.json({ error: "Cohorte no encontrada" }, { status: 404 });
  }

  // Check if email already exists
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "Ya existe un usuario con este correo" },
      { status: 409 }
    );
  }

  // Generate password and hash
  const password = generatePassword(12);
  const passwordHash = await bcrypt.hash(password, 10);

  // Create user + cohort student in transaction
  const user = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        email: email.toLowerCase().trim(),
        fullName: fullName.trim(),
        pseudonym: pseudonym?.trim() || null,
        passwordHash,
        role: "STUDENT",
        enrollmentStatus: "APPROVED",
        enrolledAt: new Date(),
        approvedAt: new Date(),
        approvedById: session.user.id,
        enrolledById: session.user.id,
      },
    });

    await tx.cohortStudent.create({
      data: {
        cohortId,
        studentId: newUser.id,
      },
    });

    return newUser;
  });

  return NextResponse.json({
    success: true,
    userId: user.id,
    fullName: user.fullName,
    email: user.email,
    password, // plaintext — only returned here, never stored
    cohortName: cohort.name,
  });
}
