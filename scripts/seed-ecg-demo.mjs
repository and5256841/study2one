// Seed demo data to test all 10 ECG rhythm levels
// Creates 10 students, each with different quiz scores and activity levels
// Usage: node scripts/seed-ecg-demo.mjs

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// 10 profiles — one per ECG rhythm level
const DEMO_PROFILES = [
  {
    email: "elite@demo.com",
    fullName: "Ana Élite",
    pseudonym: "DrÉlite",
    // Level 1: Bradicardia sinusal — quiz ≥95%, streak ≥5, active today
    avgScore: 0.97, // 97% avg
    streak: 12,
    daysInactive: 0,
  },
  {
    email: "normal@demo.com",
    fullName: "Carlos Normal",
    pseudonym: "DrNormal",
    // Level 2: Ritmo sinusal normal — quiz ≥85%, active
    avgScore: 0.88,
    streak: 3,
    daysInactive: 0,
  },
  {
    email: "taqui@demo.com",
    fullName: "Diana Taqui",
    pseudonym: "DrTaqui",
    // Level 3: Taquicardia sinusal — quiz 70-84%, active
    avgScore: 0.75,
    streak: 2,
    daysInactive: 0,
  },
  {
    email: "extra@demo.com",
    fullName: "Eduardo Extra",
    pseudonym: "DrExtra",
    // Level 4: Extrasístoles — 1 day inactive OR quiz 60-69%
    avgScore: 0.65,
    streak: 1,
    daysInactive: 1,
  },
  {
    email: "wenck@demo.com",
    fullName: "Fernanda Wenck",
    pseudonym: "DrWenck",
    // Level 5: Wenckebach — 2 days inactive OR quiz <60%
    avgScore: 0.55,
    streak: 0,
    daysInactive: 2,
  },
  {
    email: "mobitz@demo.com",
    fullName: "Gabriel Mobitz",
    pseudonym: "DrMobitz",
    // Level 6: Mobitz II — 3-4 days inactive OR quiz <45%
    avgScore: 0.40,
    streak: 0,
    daysInactive: 3,
  },
  {
    email: "afib@demo.com",
    fullName: "Helena AFib",
    pseudonym: "DrAFib",
    // Level 7: Fibrilación auricular — 5-6 days inactive OR quiz <30%
    avgScore: 0.25,
    streak: 0,
    daysInactive: 5,
  },
  {
    email: "flutter@demo.com",
    fullName: "Iván Flutter",
    pseudonym: "DrFlutter",
    // Level 8: Flutter auricular — 7-9 days inactive
    avgScore: 0.35,
    streak: 0,
    daysInactive: 8,
  },
  {
    email: "vtach@demo.com",
    fullName: "Julia VTach",
    pseudonym: "DrVTach",
    // Level 9: Taquicardia ventricular — 10+ days inactive
    avgScore: 0.20,
    streak: 0,
    daysInactive: 11,
  },
  {
    email: "asistolia@demo.com",
    fullName: "Kevin Asistolia",
    pseudonym: "DrAsistolia",
    // Level 10: Asistolia — 14+ days inactive or never
    avgScore: 0.0,
    streak: 0,
    daysInactive: 20,
  },
];

async function main() {
  const passwordHash = await bcrypt.hash("123456", 10);

  // Find or create the demo cohort
  let cohort = await prisma.cohort.findFirst({
    where: { name: "Demo - Acceso Completo" },
  });

  if (!cohort) {
    const coordinator = await prisma.user.findFirst({ where: { role: "COORDINATOR" } });
    if (!coordinator) {
      console.error("No hay coordinador. Ejecuta primero: node scripts/seed-demo-full-access.mjs");
      process.exit(1);
    }
    cohort = await prisma.cohort.create({
      data: {
        name: "Demo - Acceso Completo",
        startDate: new Date("2025-01-06T00:00:00.000Z"),
        coordinatorId: coordinator.id,
        isActive: true,
      },
    });
  }

  // Get a valid DailyContent to attach quiz attempts to
  const dailyContents = await prisma.dailyContent.findMany({
    take: 20,
    select: { id: true },
    orderBy: { dayNumber: "asc" },
  });

  if (dailyContents.length === 0) {
    console.error("No hay DailyContent en la BD. Sube audios primero.");
    process.exit(1);
  }

  console.log(`\nUsando cohorte: ${cohort.name}`);
  console.log(`DailyContent disponibles: ${dailyContents.length}\n`);

  for (const profile of DEMO_PROFILES) {
    // Upsert student
    let student = await prisma.user.findUnique({ where: { email: profile.email } });
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
    } else {
      await prisma.user.update({
        where: { id: student.id },
        data: { pseudonym: profile.pseudonym, fullName: profile.fullName },
      });
    }

    // Link to cohort
    await prisma.cohortStudent.upsert({
      where: { cohortId_studentId: { cohortId: cohort.id, studentId: student.id } },
      create: { cohortId: cohort.id, studentId: student.id },
      update: {},
    });

    // Delete existing quiz attempts for this student (clean slate)
    await prisma.quizAnswer.deleteMany({
      where: { attempt: { studentId: student.id } },
    });
    await prisma.quizAttempt.deleteMany({
      where: { studentId: student.id },
    });

    // Create quiz attempts with the target average score
    // Each quiz: 3 questions, score 0-3
    const numQuizzes = 10;
    const targetScore3 = Math.round(profile.avgScore * 3); // score out of 3

    for (let i = 0; i < numQuizzes; i++) {
      const dcId = dailyContents[i % dailyContents.length].id;
      await prisma.quizAttempt.create({
        data: {
          studentId: student.id,
          dailyContentId: dcId,
          score: targetScore3,
          totalQuestions: 3,
          completedAt: new Date(),
        },
      });
    }

    // Upsert streak with correct lastActivityDate
    const lastActivity = new Date();
    lastActivity.setDate(lastActivity.getDate() - profile.daysInactive);
    lastActivity.setHours(0, 0, 0, 0);

    await prisma.streak.upsert({
      where: { studentId: student.id },
      create: {
        studentId: student.id,
        currentStreak: profile.streak,
        longestStreak: Math.max(profile.streak, 5),
        lastActivityDate: profile.daysInactive >= 999 ? null : lastActivity,
      },
      update: {
        currentStreak: profile.streak,
        longestStreak: Math.max(profile.streak, 5),
        lastActivityDate: profile.daysInactive >= 999 ? null : lastActivity,
      },
    });

    const actualAvg = Math.round(profile.avgScore * 100);
    console.log(
      `✓ ${profile.pseudonym.padEnd(14)} | avg: ${String(actualAvg).padStart(3)}% | streak: ${String(profile.streak).padStart(2)} | inactive: ${String(profile.daysInactive).padStart(2)}d | ${profile.email}`
    );
  }

  console.log("\n========================================");
  console.log("  10 ESTUDIANTES DEMO CREADOS");
  console.log("  Password para todos: 123456");
  console.log("========================================");
  console.log("  Nivel 1  (Bradicardia):  elite@demo.com");
  console.log("  Nivel 2  (Normal):       normal@demo.com");
  console.log("  Nivel 3  (Taquicardia):  taqui@demo.com");
  console.log("  Nivel 4  (Extrasístoles):extra@demo.com");
  console.log("  Nivel 5  (Wenckebach):   wenck@demo.com");
  console.log("  Nivel 6  (Mobitz II):    mobitz@demo.com");
  console.log("  Nivel 7  (AFib):         afib@demo.com");
  console.log("  Nivel 8  (Flutter):      flutter@demo.com");
  console.log("  Nivel 9  (VTach):        vtach@demo.com");
  console.log("  Nivel 10 (Asistolia):    asistolia@demo.com");
  console.log("========================================\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
