#!/usr/bin/env node
/**
 * STUDY2ONE — Seed exámenes diarios módulo 6 (días 26-30)
 * Crea los 5 DailyContent de examen sin audio en la BD.
 * Es idempotente: usa upsert por [moduleId, dayNumber].
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const EXAM_DAYS = [
  { dayNumber: 26, title: "Examen diario — Nefrología y urología" },
  { dayNumber: 27, title: "Examen diario — Gastroenterología" },
  { dayNumber: 28, title: "Examen diario — Hematología, reumatología y dermatología" },
  { dayNumber: 29, title: "Examen diario — Salud mental" },
  { dayNumber: 30, title: "Examen diario — Temas ambulatorios" },
];

async function main() {
  console.log("=".repeat(60));
  console.log("STUDY2ONE — Seed exámenes diarios módulo 6");
  console.log("=".repeat(60));

  // Buscar módulo 6
  const module6 = await prisma.module.findUnique({ where: { number: 6 } });
  if (!module6) {
    console.error("ERROR: Módulo 6 no encontrado en BD. Ejecuta el upload script primero.");
    process.exit(1);
  }
  console.log(`\nMódulo 6 encontrado: ${module6.name} (id: ${module6.id})`);

  // Actualizar totalDays a 30 si aún es 25
  if (module6.totalDays < 30) {
    await prisma.module.update({
      where: { id: module6.id },
      data: { totalDays: 30 },
    });
    console.log("  totalDays actualizado a 30");
  }

  // Buscar bloque 5 (días 21-25) y extenderlo a 30
  const block5 = await prisma.block.findFirst({
    where: { moduleId: module6.id, number: 5 },
  });
  if (block5) {
    await prisma.block.update({
      where: { id: block5.id },
      data: { daysEnd: 30 },
    });
    console.log(`  Bloque 5 actualizado: daysEnd → 30`);
  } else {
    console.error("  WARN: Bloque 5 no encontrado.");
  }

  // Crear los 5 DailyContent de examen
  console.log("\nCreando DailyContent para días de examen...\n");
  let created = 0;
  let updated = 0;

  for (const examDay of EXAM_DAYS) {
    const existing = await prisma.dailyContent.findFirst({
      where: { moduleId: module6.id, dayNumber: examDay.dayNumber },
    });

    if (existing) {
      await prisma.dailyContent.update({
        where: { id: existing.id },
        data: { title: examDay.title, isExamDay: true },
      });
      console.log(`  ✓ Día ${examDay.dayNumber} actualizado: ${examDay.title}`);
      updated++;
    } else {
      // Necesitamos un blockId válido (bloque 5)
      if (!block5) {
        console.error(`  ERROR: Sin bloque para día ${examDay.dayNumber}`);
        continue;
      }
      await prisma.dailyContent.create({
        data: {
          moduleId: module6.id,
          blockId: block5.id,
          dayNumber: examDay.dayNumber,
          title: examDay.title,
          isExamDay: true,
        },
      });
      console.log(`  ✓ Día ${examDay.dayNumber} creado: ${examDay.title}`);
      created++;
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log(`Creados: ${created} | Actualizados: ${updated}`);
  console.log("=".repeat(60));
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
