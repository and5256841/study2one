import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { fullName, email, documentId, password, phone, university, cohortId } =
      await req.json();

    if (!fullName || !email || !documentId || !password) {
      return NextResponse.json(
        { error: "Campos obligatorios: nombre, email, documento, contraseña" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 6 caracteres" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "Ya existe una cuenta con este correo" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        fullName,
        email,
        documentId,
        passwordHash,
        phone: phone || null,
        university: university || null,
        role: "STUDENT",
        enrollmentStatus: "PENDING",
        enrolledAt: new Date(),
      },
    });

    // If cohortId provided (from QR), link student to cohort
    if (cohortId) {
      const cohort = await prisma.cohort.findUnique({
        where: { id: cohortId },
      });
      if (cohort && cohort.isActive) {
        await prisma.cohortStudent.create({
          data: {
            cohortId: cohort.id,
            studentId: user.id,
          },
        });
      }
    }

    return NextResponse.json(
      { message: "Registro exitoso. Pendiente de aprobación.", userId: user.id },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
