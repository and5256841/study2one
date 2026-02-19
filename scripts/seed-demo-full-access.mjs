// Seed a demo student with all 125 days unlocked + a coordinator
// Usage: node scripts/seed-demo-full-access.mjs

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("123456", 10);

  // 1. Upsert coordinator
  let coordinator = await prisma.user.findFirst({ where: { role: "COORDINATOR" } });
  if (!coordinator) {
    coordinator = await prisma.user.create({
      data: {
        email: "coordinador@study2one.com",
        passwordHash,
        role: "COORDINATOR",
        fullName: "Dr. Coordinador Demo",
        enrollmentStatus: "APPROVED",
      },
    });
    console.log("Coordinador creado:", coordinator.email);
  } else {
    console.log("Coordinador existente:", coordinator.email);
  }

  // 2. Create cohort with startDate far in the past (all 125 weekdays unlocked)
  // 125 weekdays = 25 weeks = ~175 calendar days. Using Jan 1 2025 to be safe.
  let cohort = await prisma.cohort.findFirst({
    where: { name: "Demo - Acceso Completo" },
  });
  if (!cohort) {
    cohort = await prisma.cohort.create({
      data: {
        name: "Demo - Acceso Completo",
        startDate: new Date("2025-01-06T00:00:00.000Z"), // Monday Jan 6, 2025
        coordinatorId: coordinator.id,
        isActive: true,
      },
    });
    console.log("Cohorte creada:", cohort.name, "| inicio:", cohort.startDate.toISOString().slice(0, 10));
  } else {
    console.log("Cohorte existente:", cohort.name);
  }

  // 3. Create demo student
  const studentEmail = "demo@study2one.com";
  let student = await prisma.user.findUnique({ where: { email: studentEmail } });
  if (!student) {
    student = await prisma.user.create({
      data: {
        email: studentEmail,
        passwordHash,
        role: "STUDENT",
        fullName: "Estudiante Demo",
        pseudonym: "DrDemo",
        avatarSeed: "1f9d1-200d-2695-fe0f",
        avatarStyle: "twemoji",
        enrollmentStatus: "APPROVED",
        approvedAt: new Date(),
      },
    });
    console.log("Estudiante creado:", student.email);
  } else {
    console.log("Estudiante existente:", student.email);
  }

  // 4. Link student to cohort
  const existing = await prisma.cohortStudent.findUnique({
    where: { cohortId_studentId: { cohortId: cohort.id, studentId: student.id } },
  });
  if (!existing) {
    await prisma.cohortStudent.create({
      data: { cohortId: cohort.id, studentId: student.id },
    });
    console.log("Estudiante vinculado a cohorte");
  } else {
    console.log("Ya vinculado a cohorte");
  }

  console.log("\n========================================");
  console.log("  CREDENCIALES DE ACCESO");
  console.log("========================================");
  console.log("  Estudiante:");
  console.log("    Email:    demo@study2one.com");
  console.log("    Password: 123456");
  console.log("");
  console.log("  Coordinador:");
  console.log(`    Email:    ${coordinator.email}`);
  console.log("    Password: 123456");
  console.log("========================================\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
