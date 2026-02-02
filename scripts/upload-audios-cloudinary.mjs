#!/usr/bin/env node
/**
 * STUDY2ONE - Upload Audios to Cloudinary & Seed Database
 *
 * Este script:
 * 1. Sube los 30 MP3 generados a Cloudinary
 * 2. Crea los módulos 1 y 2 en la BD si no existen
 * 3. Crea los bloques (3 por módulo)
 * 4. Crea/actualiza los registros DailyContent con audioUrl
 *
 * Uso: node scripts/upload-audios-cloudinary.mjs
 */

import { v2 as cloudinary } from "cloudinary";
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurar Cloudinary
cloudinary.config({
  cloud_name: "dfxky1so5",
  api_key: "951217762252941",
  api_secret: "8k0kuyUt51arXVErI_Xrw0GvUNQ",
});

const prisma = new PrismaClient();

// Configuración de los cuadernillos
const CUADERNILLOS = [
  {
    moduleNumber: 1,
    moduleName: "Lectura Crítica",
    moduleSlug: "lectura-critica",
    moduleIcon: "📖",
    audioPath: path.join(__dirname, "..", "CUADERNILLOS 01 y 02 _V2", "tts_scripts", "cuadernillo_01_lectura_critica", "audios"),
    blocks: [
      { number: 1, name: "Comprensión Literal", daysStart: 1, daysEnd: 5 },
      { number: 2, name: "Comprensión Inferencial", daysStart: 6, daysEnd: 10 },
      { number: 3, name: "Comprensión Crítica", daysStart: 11, daysEnd: 15 },
    ],
    days: [
      { day: 1, title: "Fundamentos de la lectura crítica" },
      { day: 2, title: "Identificación de ideas principales" },
      { day: 3, title: "Vocabulario en contexto" },
      { day: 4, title: "Estructura de textos" },
      { day: 5, title: "Práctica de comprensión literal" },
      { day: 6, title: "Inferencias y deducciones" },
      { day: 7, title: "Relaciones causa-efecto" },
      { day: 8, title: "Comparación y contraste" },
      { day: 9, title: "Propósito del autor" },
      { day: 10, title: "Práctica de comprensión inferencial" },
      { day: 11, title: "Evaluación de argumentos" },
      { day: 12, title: "Identificación de sesgos" },
      { day: 13, title: "Análisis de fuentes" },
      { day: 14, title: "Síntesis de múltiples textos" },
      { day: 15, title: "Simulacro de Lectura Crítica" },
    ],
  },
  {
    moduleNumber: 2,
    moduleName: "Razonamiento Cuantitativo",
    moduleSlug: "razonamiento-cuantitativo",
    moduleIcon: "🔢",
    audioPath: path.join(__dirname, "..", "CUADERNILLOS 01 y 02 _V2", "tts_scripts", "cuadernillo_02_razonamiento", "audios"),
    blocks: [
      { number: 1, name: "Interpretación de Datos", daysStart: 1, daysEnd: 5 },
      { number: 2, name: "Operaciones Matemáticas", daysStart: 6, daysEnd: 10 },
      { number: 3, name: "Argumentación Cuantitativa", daysStart: 11, daysEnd: 15 },
    ],
    days: [
      { day: 1, title: "¿Qué es una tabla de datos?" },
      { day: 2, title: "Lectura de tablas - Encontrar y comparar" },
      { day: 3, title: "Gráficas de barras y de líneas" },
      { day: 4, title: "Gráficas circulares y de dispersión" },
      { day: 5, title: "De los datos a las decisiones" },
      { day: 6, title: "Porcentajes - El lenguaje de las partes" },
      { day: 7, title: "Proporciones y regla de tres" },
      { day: 8, title: "Media, mediana y moda" },
      { day: 9, title: "Conversiones y notación científica" },
      { day: 10, title: "Resolver problemas paso a paso" },
      { day: 11, title: "Validación de procedimientos" },
      { day: 12, title: "Correlación NO es causalidad" },
      { day: 13, title: "Eventos independientes y probabilidad" },
      { day: 14, title: "Geometría aplicada" },
      { day: 15, title: "Simulacro de Razonamiento Cuantitativo" },
    ],
  },
];

/**
 * Sube un archivo a Cloudinary
 */
async function uploadToCloudinary(filePath, publicId) {
  console.log(`   Subiendo a Cloudinary: ${publicId}...`);

  const result = await cloudinary.uploader.upload(filePath, {
    public_id: publicId,
    resource_type: "video", // Cloudinary usa "video" para audio
    overwrite: true,
  });

  return result.secure_url;
}

/**
 * Estima la duración del audio basándose en el tamaño del archivo
 * Aproximación: ~1 MB = ~1 minuto para MP3 a 128kbps
 */
function estimateDuration(filePath) {
  const stats = fs.statSync(filePath);
  const sizeInMB = stats.size / (1024 * 1024);
  // Los audios TTS suelen ser ~100kbps, así que ~0.75 MB/min
  const minutes = sizeInMB / 0.75;
  return Math.round(minutes * 60); // Retorna segundos
}

/**
 * Procesa un cuadernillo completo
 */
async function processCuadernillo(cuadernillo) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Procesando: ${cuadernillo.moduleName}`);
  console.log(`${"=".repeat(60)}`);

  // 1. Crear o obtener el módulo
  let module = await prisma.module.findUnique({
    where: { number: cuadernillo.moduleNumber },
  });

  if (!module) {
    console.log(`\nCreando módulo ${cuadernillo.moduleNumber}...`);
    module = await prisma.module.create({
      data: {
        number: cuadernillo.moduleNumber,
        name: cuadernillo.moduleName,
        slug: cuadernillo.moduleSlug,
        icon: cuadernillo.moduleIcon,
        totalDays: 15,
        orderIndex: cuadernillo.moduleNumber,
      },
    });
    console.log(`   Módulo creado: ${module.id}`);
  } else {
    console.log(`\nMódulo ${cuadernillo.moduleNumber} ya existe: ${module.id}`);
  }

  // 2. Crear los bloques
  const blocksMap = {};
  for (const blockData of cuadernillo.blocks) {
    let block = await prisma.block.findFirst({
      where: {
        moduleId: module.id,
        number: blockData.number,
      },
    });

    if (!block) {
      console.log(`   Creando bloque ${blockData.number}: ${blockData.name}...`);
      block = await prisma.block.create({
        data: {
          moduleId: module.id,
          number: blockData.number,
          name: blockData.name,
          daysStart: blockData.daysStart,
          daysEnd: blockData.daysEnd,
        },
      });
    }
    blocksMap[blockData.number] = block;
  }

  // 3. Procesar cada día
  let successCount = 0;
  let errorCount = 0;

  for (const dayData of cuadernillo.days) {
    const dayNumber = dayData.day;
    const blockNumber = Math.ceil(dayNumber / 5);
    const block = blocksMap[blockNumber];

    // Construir ruta del archivo de audio
    const audioFileName = `dia_${String(dayNumber).padStart(2, "0")}.mp3`;
    const audioFilePath = path.join(cuadernillo.audioPath, audioFileName);

    console.log(`\nDía ${dayNumber}: ${dayData.title}`);

    // Verificar que el archivo existe
    if (!fs.existsSync(audioFilePath)) {
      console.log(`   ERROR: Archivo no encontrado: ${audioFilePath}`);
      errorCount++;
      continue;
    }

    try {
      // Subir a Cloudinary
      const publicId = `study2one/audio/module-${String(cuadernillo.moduleNumber).padStart(2, "0")}/dia-${String(dayNumber).padStart(2, "0")}`;
      const audioUrl = await uploadToCloudinary(audioFilePath, publicId);

      // Estimar duración
      const duration = estimateDuration(audioFilePath);

      console.log(`   URL: ${audioUrl}`);
      console.log(`   Duración estimada: ${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, "0")}`);

      // Crear o actualizar DailyContent
      const existingContent = await prisma.dailyContent.findFirst({
        where: {
          moduleId: module.id,
          dayNumber: dayNumber,
        },
      });

      if (existingContent) {
        await prisma.dailyContent.update({
          where: { id: existingContent.id },
          data: {
            title: dayData.title,
            audioUrl: audioUrl,
            audioDurationSeconds: duration,
          },
        });
        console.log(`   DailyContent actualizado`);
      } else {
        await prisma.dailyContent.create({
          data: {
            moduleId: module.id,
            blockId: block.id,
            dayNumber: dayNumber,
            title: dayData.title,
            audioUrl: audioUrl,
            audioDurationSeconds: duration,
          },
        });
        console.log(`   DailyContent creado`);
      }

      successCount++;
    } catch (error) {
      console.log(`   ERROR: ${error.message}`);
      errorCount++;
    }
  }

  return { success: successCount, errors: errorCount };
}

/**
 * Función principal
 */
async function main() {
  console.log("=".repeat(60));
  console.log("STUDY2ONE - Upload Audios to Cloudinary");
  console.log("=".repeat(60));

  let totalSuccess = 0;
  let totalErrors = 0;

  try {
    for (const cuadernillo of CUADERNILLOS) {
      const result = await processCuadernillo(cuadernillo);
      totalSuccess += result.success;
      totalErrors += result.errors;
    }

    console.log("\n" + "=".repeat(60));
    console.log("RESUMEN FINAL");
    console.log("=".repeat(60));
    console.log(`Audios subidos exitosamente: ${totalSuccess}`);
    console.log(`Errores: ${totalErrors}`);
    console.log("=".repeat(60));

  } catch (error) {
    console.error("Error fatal:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
