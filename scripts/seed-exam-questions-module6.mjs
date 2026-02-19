#!/usr/bin/env node
/**
 * STUDY2ONE — Seed preguntas exámenes diarios módulo 6 (días 26-30)
 * Lee scripts/data/exam-questions-module6.json y crea las preguntas en BD.
 * Es idempotente: usa upsert por [dailyContentId, questionOrder].
 *
 * Uso: node scripts/seed-exam-questions-module6.mjs
 */

import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const prisma = new PrismaClient();
const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_FILE = join(__dirname, "data", "exam-questions-module6.json");

async function main() {
  console.log("=".repeat(60));
  console.log("STUDY2ONE — Seed preguntas exámenes módulo 6");
  console.log("=".repeat(60));

  const allDays = JSON.parse(readFileSync(DATA_FILE, "utf-8"));

  let totalCreated = 0;
  let totalUpdated = 0;

  for (const dayData of allDays) {
    const { dayNumber, questions } = dayData;

    if (!questions || questions.length === 0) {
      console.log(`\nDía ${dayNumber}: sin preguntas en el JSON, omitiendo.`);
      continue;
    }

    const dailyContent = await prisma.dailyContent.findFirst({
      where: { dayNumber, isExamDay: true },
    });

    if (!dailyContent) {
      console.error(`\nERROR: DailyContent para día ${dayNumber} no encontrado. Ejecuta seed-exam-days-module6.mjs primero.`);
      continue;
    }

    console.log(`\nDía ${dayNumber} — ${questions.length} preguntas`);

    for (const q of questions) {
      const existing = await prisma.dailyQuestion.findUnique({
        where: {
          dailyContentId_questionOrder: {
            dailyContentId: dailyContent.id,
            questionOrder: q.questionOrder,
          },
        },
      });

      if (existing) {
        // Update: delete old options + answers first
        await prisma.quizAnswer.deleteMany({ where: { questionId: existing.id } });
        await prisma.questionOption.deleteMany({ where: { questionId: existing.id } });

        await prisma.dailyQuestion.update({
          where: { id: existing.id },
          data: {
            caseText: q.caseText || null,
            questionText: q.questionText,
            explanation: q.explanation,
            competency: q.competency || null,
            difficulty: q.difficulty || "MEDIUM",
            options: {
              create: q.options.map((o) => ({
                letter: o.letter,
                text: o.text,
                isCorrect: o.isCorrect,
              })),
            },
          },
        });
        console.log(`  ✓ Pregunta ${q.questionOrder} actualizada`);
        totalUpdated++;
      } else {
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
              create: q.options.map((o) => ({
                letter: o.letter,
                text: o.text,
                isCorrect: o.isCorrect,
              })),
            },
          },
        });
        console.log(`  ✓ Pregunta ${q.questionOrder} creada`);
        totalCreated++;
      }
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log(`Creadas: ${totalCreated} | Actualizadas: ${totalUpdated}`);
  console.log("=".repeat(60));
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
