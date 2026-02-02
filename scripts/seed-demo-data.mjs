#!/usr/bin/env node
/**
 * STUDY2ONE - Seed Demo Data
 * Crea una cohorte con 10 estudiantes y datos de progreso simulados
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Nombres colombianos para los estudiantes
const ESTUDIANTES = [
  { nombre: "Carlos Andrés Pérez", email: "carlos.perez@demo.com", pseudonym: "DrCarlos" },
  { nombre: "María José Rodríguez", email: "maria.rodriguez@demo.com", pseudonym: "MajoMed" },
  { nombre: "Juan David López", email: "juan.lopez@demo.com", pseudonym: "JuanDDoc" },
  { nombre: "Laura Valentina García", email: "laura.garcia@demo.com", pseudonym: "LauraDoc" },
  { nombre: "Sebastián Camilo Martínez", email: "sebastian.martinez@demo.com", pseudonym: "SebasMD" },
  { nombre: "Daniela Fernanda Torres", email: "daniela.torres@demo.com", pseudonym: "DaniMed" },
  { nombre: "Andrés Felipe Ramírez", email: "andres.ramirez@demo.com", pseudonym: "PipeMD" },
  { nombre: "Valentina Sofía Hernández", email: "valentina.hernandez@demo.com", pseudonym: "ValeMed" },
  { nombre: "Santiago José Gómez", email: "santiago.gomez@demo.com", pseudonym: "SantiDoc" },
  { nombre: "Isabella María Díaz", email: "isabella.diaz@demo.com", pseudonym: "IsaMD" },
];

// Emojis para asignar aleatoriamente
const EMOJIS = [
  "1f600", "1f604", "1f60a", "1f60e", "1f913",
  "1f917", "1f929", "1f914", "1f4aa", "1f468-200d-2695-fe0f"
];

async function main() {
  console.log("=".repeat(60));
  console.log("STUDY2ONE - Seed Demo Data");
  console.log("=".repeat(60));

  const passwordHash = await bcrypt.hash("123456", 10);

  // 1. Obtener el coordinador existente
  let coordinator = await prisma.user.findFirst({
    where: { role: "COORDINATOR" }
  });

  if (!coordinator) {
    console.log("Creando coordinador...");
    coordinator = await prisma.user.create({
      data: {
        email: "coordinador@demo.com",
        passwordHash,
        role: "COORDINATOR",
        fullName: "Dr. Coordinador Demo",
        enrollmentStatus: "APPROVED",
      }
    });
  }
  console.log(`Coordinador: ${coordinator.email}`);

  // 2. Crear cohorte con fecha de inicio 15 de marzo 2026
  const startDate = new Date("2026-03-15T00:00:00.000Z");

  let cohort = await prisma.cohort.findFirst({
    where: { name: "Cohorte Demo Marzo 2026" }
  });

  if (!cohort) {
    console.log("\nCreando cohorte...");
    cohort = await prisma.cohort.create({
      data: {
        name: "Cohorte Demo Marzo 2026",
        startDate,
        coordinatorId: coordinator.id,
        isActive: true,
      }
    });
  }
  console.log(`Cohorte: ${cohort.name} (inicio: ${startDate.toLocaleDateString()})`);

  // 3. Obtener módulos y contenido diario
  const modules = await prisma.module.findMany({
    include: {
      dailyContent: {
        orderBy: { dayNumber: "asc" }
      }
    },
    orderBy: { number: "asc" }
  });

  if (modules.length === 0) {
    console.log("ERROR: No hay módulos en la BD. Ejecuta primero upload-audios-cloudinary.mjs");
    process.exit(1);
  }

  console.log(`\nMódulos disponibles: ${modules.length}`);

  // Flatten all daily content
  const allDailyContent = modules.flatMap(m =>
    m.dailyContent.map(dc => ({ ...dc, moduleNumber: m.number }))
  );
  console.log(`Contenido diario disponible: ${allDailyContent.length} días`);

  // 4. Crear estudiantes con progreso variado
  console.log("\nCreando estudiantes...");

  for (let i = 0; i < ESTUDIANTES.length; i++) {
    const est = ESTUDIANTES[i];
    const emoji = EMOJIS[i % EMOJIS.length];

    // Verificar si ya existe
    let student = await prisma.user.findUnique({
      where: { email: est.email }
    });

    if (!student) {
      student = await prisma.user.create({
        data: {
          email: est.email,
          passwordHash,
          role: "STUDENT",
          fullName: est.nombre,
          pseudonym: est.pseudonym,
          avatarSeed: emoji,
          avatarStyle: "twemoji",
          enrollmentStatus: "APPROVED",
          approvedAt: new Date(),
        }
      });
      console.log(`  Creado: ${est.nombre} (@${est.pseudonym})`);
    } else {
      // Actualizar avatar si existe
      await prisma.user.update({
        where: { id: student.id },
        data: {
          pseudonym: est.pseudonym,
          avatarSeed: emoji,
          avatarStyle: "twemoji",
        }
      });
      console.log(`  Existe: ${est.nombre} (@${est.pseudonym})`);
    }

    // Agregar a la cohorte si no está
    const inCohort = await prisma.cohortStudent.findUnique({
      where: {
        cohortId_studentId: {
          cohortId: cohort.id,
          studentId: student.id
        }
      }
    });

    if (!inCohort) {
      await prisma.cohortStudent.create({
        data: {
          cohortId: cohort.id,
          studentId: student.id,
        }
      });
    }

    // 5. Crear progreso variado (más días completados para los primeros estudiantes)
    const daysToComplete = Math.max(1, Math.floor((ESTUDIANTES.length - i) * 2.5));
    const daysWithContent = allDailyContent.slice(0, Math.min(daysToComplete, allDailyContent.length));

    for (const dc of daysWithContent) {
      // Audio progress
      const existingProgress = await prisma.audioProgress.findUnique({
        where: {
          studentId_dailyContentId: {
            studentId: student.id,
            dailyContentId: dc.id
          }
        }
      });

      if (!existingProgress) {
        const completed = Math.random() > 0.1; // 90% probabilidad de completar
        await prisma.audioProgress.create({
          data: {
            studentId: student.id,
            dailyContentId: dc.id,
            isCompleted: completed,
            completionPercentage: completed ? 100 : Math.floor(Math.random() * 80),
            totalListenedSeconds: Math.floor(Math.random() * 600) + 300,
            playbackSpeed: [1.0, 1.25, 1.5, 1.75][Math.floor(Math.random() * 4)],
            startedAt: new Date(),
            completedAt: completed ? new Date() : null,
          }
        });
      }

      // Quiz attempt (solo si hay preguntas)
      const hasQuestions = await prisma.dailyQuestion.count({
        where: { dailyContentId: dc.id }
      });

      if (hasQuestions > 0) {
        const existingQuiz = await prisma.quizAttempt.findFirst({
          where: {
            studentId: student.id,
            dailyContentId: dc.id
          }
        });

        if (!existingQuiz) {
          const score = Math.floor(Math.random() * 2) + 1; // 1-3
          await prisma.quizAttempt.create({
            data: {
              studentId: student.id,
              dailyContentId: dc.id,
              score,
              totalQuestions: 3,
              completedAt: new Date(),
            }
          });
        }
      }
    }

    // 6. Crear/actualizar streak
    const streakDays = Math.floor(Math.random() * 15) + 1;
    await prisma.streak.upsert({
      where: { studentId: student.id },
      update: {
        currentStreak: streakDays,
        longestStreak: Math.max(streakDays, Math.floor(Math.random() * 20) + streakDays),
        lastActivityDate: new Date(),
      },
      create: {
        studentId: student.id,
        currentStreak: streakDays,
        longestStreak: streakDays,
        lastActivityDate: new Date(),
      }
    });
  }

  // 7. Asignar el estudiante de prueba existente a la cohorte también
  const testStudent = await prisma.user.findUnique({
    where: { email: "estudiante@test.com" }
  });

  if (testStudent) {
    const inCohort = await prisma.cohortStudent.findUnique({
      where: {
        cohortId_studentId: {
          cohortId: cohort.id,
          studentId: testStudent.id
        }
      }
    });

    if (!inCohort) {
      await prisma.cohortStudent.create({
        data: {
          cohortId: cohort.id,
          studentId: testStudent.id,
        }
      });
      console.log(`\nEstudiante de prueba agregado a la cohorte`);
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("DATOS DEMO CREADOS EXITOSAMENTE");
  console.log("=".repeat(60));
  console.log(`
Cohorte: ${cohort.name}
Inicio: 15 de marzo de 2026
Estudiantes: ${ESTUDIANTES.length + 1}

Credenciales (todos tienen contraseña: 123456):
- estudiante@test.com
- carlos.perez@demo.com
- maria.rodriguez@demo.com
- juan.lopez@demo.com
... y 7 más
`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
