/**
 * Seed script for Daily Quiz Questions (3 per day, 120 days)
 *
 * Reads JSON files from scripts/data/daily-questions/module-XX.json and seeds:
 * DailyQuestion → QuestionOption (via existing DailyContent records)
 *
 * Usage: node scripts/seed-daily-questions.mjs
 *
 * Idempotent: deletes existing questions before re-seeding.
 * Requires DailyContent records to already exist (created by upload-audios-cloudinary.mjs).
 */

import { PrismaClient } from "@prisma/client";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

const MODULE_FILES = [
  { moduleNumber: 1, fileName: "module-01-lectura-critica.json" },
  { moduleNumber: 2, fileName: "module-02-razonamiento-cuantitativo.json" },
  { moduleNumber: 3, fileName: "module-03-competencias-ciudadanas.json" },
  { moduleNumber: 4, fileName: "module-04-comunicacion-escrita.json" },
  { moduleNumber: 5, fileName: "module-05-ingles.json" },
  { moduleNumber: 6, fileName: "module-06-fundamentacion-dx-tx.json" },
  { moduleNumber: 7, fileName: "module-07-atencion-en-salud.json" },
  { moduleNumber: 8, fileName: "module-08-promocion-prevencion.json" },
];

async function seedModule(moduleDef) {
  const filePath = join(__dirname, "data", "daily-questions", moduleDef.fileName);

  if (!existsSync(filePath)) {
    console.log(`  ⏭️  No file ${moduleDef.fileName}, skipping.`);
    return 0;
  }

  const rawData = readFileSync(filePath, "utf-8");
  const daysData = JSON.parse(rawData);

  // Find the module
  const module = await prisma.module.findUnique({
    where: { number: moduleDef.moduleNumber },
  });

  if (!module) {
    console.log(`  ❌ Module ${moduleDef.moduleNumber} not found in DB. Run upload-audios-cloudinary.mjs first.`);
    return 0;
  }

  let totalQuestions = 0;

  for (const dayData of daysData) {
    // Find the DailyContent for this day
    const dailyContent = await prisma.dailyContent.findFirst({
      where: {
        moduleId: module.id,
        dayNumber: dayData.dayNumber,
      },
    });

    if (!dailyContent) {
      console.log(`    ⚠️  Day ${dayData.dayNumber} not found in DailyContent for module ${moduleDef.moduleNumber}`);
      continue;
    }

    // Skip exam days (Module 6 days 26-30 have their own 15-question format)
    if (dailyContent.isExamDay) {
      console.log(`    ⏭️  Day ${dayData.dayNumber} is an exam day, skipping.`);
      continue;
    }

    // Delete existing quiz answers that reference these questions
    const existingQuestions = await prisma.dailyQuestion.findMany({
      where: { dailyContentId: dailyContent.id },
      select: { id: true },
    });

    if (existingQuestions.length > 0) {
      const questionIds = existingQuestions.map((q) => q.id);

      // Delete quiz answers first
      await prisma.quizAnswer.deleteMany({
        where: { questionId: { in: questionIds } },
      });

      // Delete options
      await prisma.questionOption.deleteMany({
        where: { questionId: { in: questionIds } },
      });

      // Delete questions
      await prisma.dailyQuestion.deleteMany({
        where: { dailyContentId: dailyContent.id },
      });
    }

    // Create questions with nested options
    for (const q of dayData.questions) {
      await prisma.dailyQuestion.create({
        data: {
          dailyContentId: dailyContent.id,
          questionOrder: q.questionOrder,
          caseText: q.caseText || null,
          questionText: q.questionText,
          explanation: q.explanation,
          competency: q.competency || null,
          difficulty: q.difficulty || "MEDIUM",
          options: {
            create: q.options.map((opt) => ({
              letter: opt.letter,
              text: opt.text,
              isCorrect: opt.isCorrect,
            })),
          },
        },
      });
    }

    totalQuestions += dayData.questions.length;
  }

  return totalQuestions;
}

async function main() {
  console.log("🚀 Seeding Daily Quiz Questions...\n");

  let grandTotal = 0;

  for (const moduleDef of MODULE_FILES) {
    console.log(`\n📋 Module ${moduleDef.moduleNumber}: ${moduleDef.fileName}`);
    const count = await seedModule(moduleDef);
    console.log(`  📊 ${count} questions seeded`);
    grandTotal += count;
  }

  console.log(`\n${"=".repeat(50)}`);
  console.log(`✅ Total: ${grandTotal} daily quiz questions seeded`);
  console.log(`${"=".repeat(50)}`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
