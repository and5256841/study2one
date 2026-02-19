// Seed demo cohorts with students for testing the cohort management module
// Usage: node scripts/seed-cohort-demo.mjs

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_STUDENTS = [
  { email: "maria.garcia@demo.com", fullName: "Maria Garcia Lopez", pseudonym: "Mariposa" },
  { email: "juan.perez@demo.com", fullName: "Juan Perez Ramirez", pseudonym: "Halcon" },
  { email: "laura.martinez@demo.com", fullName: "Laura Martinez Silva", pseudonym: "Estrella" },
  { email: "carlos.rodriguez@demo.com", fullName: "Carlos Rodriguez Diaz", pseudonym: "Aguila" },
  { email: "ana.lopez@demo.com", fullName: "Ana Lopez Torres", pseudonym: "Luna" },
];

async function main() {
  const passwordHash = await bcrypt.hash("123456", 10);

  // Find or create coordinator
  let coordinator = await prisma.user.findUnique({
    where: { email: "coordinador@test.com" },
  });

  if (!coordinator) {
    coordinator = await prisma.user.create({
      data: {
        email: "coordinador@test.com",
        passwordHash,
        role: "COORDINATOR",
        fullName: "Coordinador Demo",
        enrollmentStatus: "APPROVED",
        approvedAt: new Date(),
      },
    });
    console.log("Coordinador creado: coordinador@test.com");
  } else {
    console.log("Coordinador existente: coordinador@test.com");
  }

  // Create active cohort
  let activeCohort = await prisma.cohort.findFirst({
    where: { name: "Cohorte Febrero 2026", coordinatorId: coordinator.id },
  });

  if (!activeCohort) {
    activeCohort = await prisma.cohort.create({
      data: {
        name: "Cohorte Febrero 2026",
        startDate: new Date("2026-01-06T00:00:00.000Z"),
        coordinatorId: coordinator.id,
        isActive: true,
      },
    });
    console.log("Cohorte activa creada: Cohorte Febrero 2026");
  } else {
    console.log("Cohorte activa existente: Cohorte Febrero 2026");
  }

  // Create inactive cohort
  let inactiveCohort = await prisma.cohort.findFirst({
    where: { name: "Cohorte Piloto 2025", coordinatorId: coordinator.id },
  });

  if (!inactiveCohort) {
    inactiveCohort = await prisma.cohort.create({
      data: {
        name: "Cohorte Piloto 2025",
        startDate: new Date("2025-03-01T00:00:00.000Z"),
        coordinatorId: coordinator.id,
        isActive: false,
      },
    });
    console.log("Cohorte inactiva creada: Cohorte Piloto 2025");
  } else {
    console.log("Cohorte inactiva existente: Cohorte Piloto 2025");
  }

  // Try to link existing ECG demo students to the active cohort
  const ecgEmails = [
    "elite@demo.com", "normal@demo.com", "taqui@demo.com",
    "extra@demo.com", "wenck@demo.com", "mobitz@demo.com",
    "afib@demo.com", "flutter@demo.com", "vtach@demo.com",
    "asistolia@demo.com",
  ];

  const existingEcgStudents = await prisma.user.findMany({
    where: { email: { in: ecgEmails }, role: "STUDENT" },
  });

  let linkedCount = 0;

  if (existingEcgStudents.length > 0) {
    console.log(`\nEncontramos ${existingEcgStudents.length} estudiantes ECG demo`);
    for (const student of existingEcgStudents) {
      await prisma.cohortStudent.upsert({
        where: {
          cohortId_studentId: {
            cohortId: activeCohort.id,
            studentId: student.id,
          },
        },
        create: { cohortId: activeCohort.id, studentId: student.id },
        update: {},
      });
      linkedCount++;
    }
    console.log(`Vinculados ${linkedCount} estudiantes ECG a cohorte activa`);
  }

  // Create additional demo students if we don't have enough
  const dailyContents = await prisma.dailyContent.findMany({
    take: 10,
    select: { id: true },
    orderBy: { dayNumber: "asc" },
  });

  console.log(`\nCreando/vinculando ${DEMO_STUDENTS.length} estudiantes adicionales...`);

  for (const profile of DEMO_STUDENTS) {
    let student = await prisma.user.findUnique({
      where: { email: profile.email },
    });

    if (!student) {
      student = await prisma.user.create({
        data: {
          email: profile.email,
          passwordHash,
          role: "STUDENT",
          fullName: profile.fullName,
          pseudonym: profile.pseudonym,
          enrollmentStatus: "APPROVED",
          approvedAt: new Date(),
        },
      });
    }

    // Link to active cohort
    await prisma.cohortStudent.upsert({
      where: {
        cohortId_studentId: {
          cohortId: activeCohort.id,
          studentId: student.id,
        },
      },
      create: { cohortId: activeCohort.id, studentId: student.id },
      update: {},
    });

    // Create some quiz data if DailyContent exists
    if (dailyContents.length > 0) {
      const existingAttempts = await prisma.quizAttempt.count({
        where: { studentId: student.id },
      });

      if (existingAttempts === 0) {
        const numQuizzes = Math.floor(Math.random() * 5) + 3;
        const baseScore = Math.floor(Math.random() * 2) + 1; // 1-2 out of 3
        for (let i = 0; i < numQuizzes; i++) {
          const dcId = dailyContents[i % dailyContents.length].id;
          await prisma.quizAttempt.create({
            data: {
              studentId: student.id,
              dailyContentId: dcId,
              score: baseScore + (Math.random() > 0.5 ? 1 : 0),
              totalQuestions: 3,
              completedAt: new Date(),
            },
          });
        }
      }

      // Create streak data
      const daysInactive = Math.floor(Math.random() * 5);
      const lastActivity = new Date();
      lastActivity.setDate(lastActivity.getDate() - daysInactive);
      lastActivity.setHours(0, 0, 0, 0);

      await prisma.streak.upsert({
        where: { studentId: student.id },
        create: {
          studentId: student.id,
          currentStreak: Math.max(0, 5 - daysInactive),
          longestStreak: 5,
          lastActivityDate: lastActivity,
        },
        update: {},
      });
    }

    console.log(`  + ${profile.fullName} (${profile.email})`);
  }

  // Link 2 demo students to inactive cohort too
  for (const profile of DEMO_STUDENTS.slice(0, 2)) {
    const student = await prisma.user.findUnique({
      where: { email: profile.email },
    });
    if (student) {
      await prisma.cohortStudent.upsert({
        where: {
          cohortId_studentId: {
            cohortId: inactiveCohort.id,
            studentId: student.id,
          },
        },
        create: { cohortId: inactiveCohort.id, studentId: student.id },
        update: {},
      });
    }
  }

  console.log("\n========================================");
  console.log("  DEMO DE COHORTES CREADO");
  console.log("========================================");
  console.log(`  Coordinador: coordinador@test.com (pass: 123456)`);
  console.log(`  Cohorte activa: ${activeCohort.name} (${linkedCount + DEMO_STUDENTS.length} estudiantes)`);
  console.log(`  Cohorte inactiva: ${inactiveCohort.name} (2 estudiantes)`);
  console.log("========================================\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
