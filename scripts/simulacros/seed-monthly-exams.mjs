/**
 * Seed script for Monthly Exams (Simulacros Mensuales)
 *
 * Reads JSON files from scripts/simulacros/data/simulacro-XX/ and seeds:
 * MonthlyExam → ExamSection → ExamSectionQuestion → ExamSectionOption
 *
 * Usage: node scripts/simulacros/seed-monthly-exams.mjs
 *
 * Idempotent: uses upsert by exam number, deletes existing questions before re-seeding.
 */

import { PrismaClient } from "@prisma/client";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

// Section definitions matching Saber Pro structure
const SECTION_DEFS = [
  {
    sectionNumber: 1,
    moduleNumber: 1,
    title: "Lectura Crítica",
    fileName: "lectura-critica.json",
    durationMinutes: 45,
    isWriting: false,
  },
  {
    sectionNumber: 2,
    moduleNumber: 2,
    title: "Razonamiento Cuantitativo",
    fileName: "razonamiento-cuantitativo.json",
    durationMinutes: 50,
    isWriting: false,
  },
  {
    sectionNumber: 3,
    moduleNumber: 3,
    title: "Competencias Ciudadanas",
    fileName: "competencias-ciudadanas.json",
    durationMinutes: 40,
    isWriting: false,
  },
  {
    sectionNumber: 4,
    moduleNumber: 4,
    title: "Comunicación Escrita",
    fileName: "comunicacion-escrita.json",
    durationMinutes: 40,
    isWriting: true,
  },
  {
    sectionNumber: 5,
    moduleNumber: 5,
    title: "Inglés",
    fileName: "ingles.json",
    durationMinutes: 60,
    isWriting: false,
  },
  {
    sectionNumber: 6,
    moduleNumber: 6,
    title: "Fundamentación Dx y Tx",
    fileName: "fundamentacion-dx-tx.json",
    durationMinutes: 60,
    isWriting: false,
  },
  {
    sectionNumber: 7,
    moduleNumber: 7,
    title: "Atención en Salud",
    fileName: "atencion-en-salud.json",
    durationMinutes: 55,
    isWriting: false,
  },
  {
    sectionNumber: 8,
    moduleNumber: 8,
    title: "Promoción y Prevención",
    fileName: "promocion-prevencion.json",
    durationMinutes: 55,
    isWriting: false,
  },
];

// Exam definitions
const EXAM_DEFS = [
  { number: 1, title: "Simulacro Mensual 1", mode: "WEEKLY" },
  { number: 2, title: "Simulacro Mensual 2", mode: "WEEKLY" },
  { number: 3, title: "Simulacro Mensual 3", mode: "WEEKLY" },
  { number: 4, title: "Simulacro Mensual 4", mode: "WEEKLY" },
  { number: 5, title: "Simulacro Mensual 5 — Simulacro Real", mode: "CONTINUOUS" },
  { number: 6, title: "Simulacro Mensual 6", mode: "WEEKLY" },
];

async function seedExam(examDef) {
  const dataDir = join(__dirname, "data", `simulacro-0${examDef.number}`);

  if (!existsSync(dataDir)) {
    console.log(`  ⏭️  No data directory for simulacro ${examDef.number}, skipping.`);
    return;
  }

  console.log(`\n📋 Seeding ${examDef.title} (mode: ${examDef.mode})...`);

  // Upsert the exam
  const exam = await prisma.monthlyExam.upsert({
    where: { number: examDef.number },
    update: { title: examDef.title, mode: examDef.mode },
    create: {
      number: examDef.number,
      title: examDef.title,
      mode: examDef.mode,
      isActive: false,
    },
  });

  console.log(`  ✅ Exam: ${exam.title} (id: ${exam.id})`);

  let totalQuestions = 0;

  for (const secDef of SECTION_DEFS) {
    const filePath = join(dataDir, secDef.fileName);

    if (!existsSync(filePath)) {
      console.log(`  ⏭️  No file ${secDef.fileName}, skipping section.`);
      continue;
    }

    const rawData = readFileSync(filePath, "utf-8");
    const questions = JSON.parse(rawData);

    // Upsert section
    const section = await prisma.examSection.upsert({
      where: {
        examId_sectionNumber: {
          examId: exam.id,
          sectionNumber: secDef.sectionNumber,
        },
      },
      update: {
        title: secDef.title,
        moduleNumber: secDef.moduleNumber,
        durationMinutes: secDef.durationMinutes,
        totalQuestions: questions.length,
        isWriting: secDef.isWriting,
        orderIndex: secDef.sectionNumber,
      },
      create: {
        examId: exam.id,
        sectionNumber: secDef.sectionNumber,
        moduleNumber: secDef.moduleNumber,
        title: secDef.title,
        durationMinutes: secDef.durationMinutes,
        totalQuestions: questions.length,
        isWriting: secDef.isWriting,
        orderIndex: secDef.sectionNumber,
      },
    });

    // Delete existing questions for this section (clean re-seed)
    // First delete options, then questions
    const existingQuestions = await prisma.examSectionQuestion.findMany({
      where: { sectionId: section.id },
      select: { id: true },
    });

    if (existingQuestions.length > 0) {
      const questionIds = existingQuestions.map((q) => q.id);

      // Delete answers that reference these questions
      await prisma.examSectionAnswer.deleteMany({
        where: { questionId: { in: questionIds } },
      });

      // Delete options
      await prisma.examSectionOption.deleteMany({
        where: { questionId: { in: questionIds } },
      });

      // Delete questions
      await prisma.examSectionQuestion.deleteMany({
        where: { sectionId: section.id },
      });
    }

    // Seed questions and options
    for (const q of questions) {
      const question = await prisma.examSectionQuestion.create({
        data: {
          sectionId: section.id,
          questionOrder: q.questionOrder,
          caseText: q.caseText || null,
          questionText: q.questionText,
          explanation: q.explanation || null,
          competency: q.competency || null,
        },
      });

      // Seed options (if any — writing prompts have no options)
      if (q.options && q.options.length > 0) {
        await prisma.examSectionOption.createMany({
          data: q.options.map((opt) => ({
            questionId: question.id,
            letter: opt.letter,
            text: opt.text,
            isCorrect: opt.isCorrect,
          })),
        });
      }
    }

    totalQuestions += questions.length;
    console.log(`  📝 Section ${secDef.sectionNumber} (${secDef.title}): ${questions.length} questions`);
  }

  console.log(`  📊 Total: ${totalQuestions} questions seeded for ${examDef.title}`);
}

async function main() {
  console.log("🚀 Starting Monthly Exams seed...\n");

  for (const examDef of EXAM_DEFS) {
    await seedExam(examDef);
  }

  console.log("\n✅ Monthly Exams seed complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
