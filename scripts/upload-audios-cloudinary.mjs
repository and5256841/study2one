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
    totalDays: 15,
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
    totalDays: 15,
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
  {
    moduleNumber: 3,
    moduleName: "Competencias Ciudadanas",
    moduleSlug: "competencias-ciudadanas",
    moduleIcon: "🏛️",
    totalDays: 15,
    audioPath: path.join(__dirname, "..", "CUADERNILLOS 01 y 02 _V2", "tts_scripts", "cuadernillo_03_ciudadanas", "audios"),
    blocks: [
      { number: 1, name: "Conocimiento Constitucional", daysStart: 1, daysEnd: 5 },
      { number: 2, name: "Multiperspectivismo y Pensamiento Sistémico", daysStart: 6, daysEnd: 10 },
      { number: 3, name: "Argumentación", daysStart: 11, daysEnd: 15 },
    ],
    days: [
      { day: 1, title: "Introducción al módulo y estructura del examen" },
      { day: 2, title: "Constitución Política de Colombia de 1991" },
      { day: 3, title: "Derechos, deberes y mecanismos de protección" },
      { day: 4, title: "Organización del Estado colombiano" },
      { day: 5, title: "Mecanismos de participación ciudadana" },
      { day: 6, title: "Multiperspectivismo — Actores e intereses" },
      { day: 7, title: "Conflictos entre perspectivas" },
      { day: 8, title: "Pensamiento sistémico" },
      { day: 9, title: "Relaciones entre dimensiones del problema" },
      { day: 10, title: "Banco de preguntas — Multiperspectivismo y Pensamiento Sistémico" },
      { day: 11, title: "Argumentación — Fundamentos" },
      { day: 12, title: "Falacias argumentativas" },
      { day: 13, title: "Solidez y evaluación de argumentos" },
      { day: 14, title: "Argumentos sobre políticas públicas" },
      { day: 15, title: "Simulacro final integrado" },
    ],
  },
  {
    moduleNumber: 4,
    moduleName: "Comunicación Escrita",
    moduleSlug: "comunicacion-escrita",
    moduleIcon: "✍️",
    totalDays: 10,
    audioPath: path.join(__dirname, "..", "CUADERNILLOS 01 y 02 _V2", "tts_scripts", "cuadernillo_04_comunicacion", "audios"),
    blocks: [
      { number: 1, name: "Fundamentos de la Escritura Argumentativa", daysStart: 1, daysEnd: 5 },
      { number: 2, name: "Práctica y Simulacros", daysStart: 6, daysEnd: 10 },
    ],
    days: [
      { day: 1, title: "Introducción — Escritura argumentativa en el Saber Pro" },
      { day: 2, title: "Pertinencia como criterio central" },
      { day: 3, title: "Estructura del texto argumentativo" },
      { day: 4, title: "Construcción de argumentos sólidos" },
      { day: 5, title: "Forma de expresión y ortografía" },
      { day: 6, title: "Conectores argumentativos" },
      { day: 7, title: "Ventaja del médico — Aplicación al contexto clínico" },
      { day: 8, title: "Autoevaluación y rúbrica simplificada" },
      { day: 9, title: "Simulacro 1" },
      { day: 10, title: "Simulacro 2 y consolidación final" },
    ],
  },
  {
    moduleNumber: 5,
    moduleName: "Inglés",
    moduleSlug: "ingles",
    moduleIcon: "🇺🇸",
    totalDays: 10,
    audioPath: path.join(__dirname, "..", "CUADERNILLOS 01 y 02 _V2", "tts_scripts", "cuadernillo_05_EN", "audios"),
    blocks: [
      { number: 1, name: "Partes 1 al 5 del examen", daysStart: 1, daysEnd: 5 },
      { number: 2, name: "Partes 6-7 y Simulacros", daysStart: 6, daysEnd: 10 },
    ],
    days: [
      { day: 1, title: "Introducción — Estrategia general y Partes 1-5" },
      { day: 2, title: "Parte 2 — Signs and Notices" },
      { day: 3, title: "Parte 3 — Conversations" },
      { day: 4, title: "Parte 4 — Read and Complete (Gramática)" },
      { day: 5, title: "Parte 5 — Reading Comprehension 1" },
      { day: 6, title: "Partes 6 y 7 — Reading Comprehension avanzado" },
      { day: 7, title: "Parte 7 — Reading Comprehension 3" },
      { day: 8, title: "Vocabulario académico de alta frecuencia" },
      { day: 9, title: "Simulacro 1 completo" },
      { day: 10, title: "Simulacro 2 y estrategia para el día del examen" },
    ],
  },
  {
    moduleNumber: 6,
    moduleName: "Fundamentación en Diagnóstico y Tratamiento",
    moduleSlug: "fundamentacion-dx-tx",
    moduleIcon: "🩺",
    totalDays: 30, // 25 días con cuadernillo+audio + 5 días de simulacro (desarrollo en plataforma)
    audioPath: path.join(__dirname, "..", "CUADERNILLOS 01 y 02 _V2", "tts_scripts", "cuadernillo_06_DxTx", "audios"),
    blocks: [
      { number: 1, name: "Metodología diagnóstica", daysStart: 1, daysEnd: 5 },
      { number: 2, name: "Enfermedades crónicas no transmisibles", daysStart: 6, daysEnd: 10 },
      { number: 3, name: "Urgencias y patologías agudas", daysStart: 11, daysEnd: 15 },
      { number: 4, name: "Materno infantil", daysStart: 16, daysEnd: 20 },
      { number: 5, name: "Exámenes diarios — Repaso por sistemas", daysStart: 21, daysEnd: 25 },
    ],
    days: [
      { day: 1, title: "Introducción — Anatomía del caso ICFES" },
      { day: 2, title: "Técnica de subrayado clínico" },
      { day: 3, title: "Valores normales de laboratorio" },
      { day: 4, title: "Patrón de las cuatro opciones de respuesta" },
      { day: 5, title: "Preguntas de tratamiento" },
      { day: 6, title: "Hipertensión arterial" },
      { day: 7, title: "Diabetes mellitus tipo 2" },
      { day: 8, title: "Tiroides, dislipidemia y síndrome metabólico" },
      { day: 9, title: "Falla cardíaca y fibrilación auricular" },
      { day: 10, title: "EPOC y asma" },
      { day: 11, title: "Toxicología — Escopolamina y organofosforados" },
      { day: 12, title: "Enfermedades infecciosas — Dengue, malaria, VIH, tuberculosis" },
      { day: 13, title: "Urgencias abdominales" },
      { day: 14, title: "Urgencias neurológicas — ACV, cefaleas, meningitis" },
      { day: 15, title: "Trauma, shock y quemaduras" },
      { day: 16, title: "Control prenatal — Materno infantil" },
      { day: 17, title: "Trastornos hipertensivos del embarazo y diabetes gestacional" },
      { day: 18, title: "Ginecología — Flujo vaginal, anticoncepción y tamizaje de cérvix" },
      { day: 19, title: "Neonatología — APGAR, reanimación, ictericia y sepsis" },
      { day: 20, title: "Pediatría — EDA, IRA y enfermedades exantemáticas" },
      { day: 21, title: "Examen diario — Nefrología y urología" },
      { day: 22, title: "Examen diario — Gastroenterología" },
      { day: 23, title: "Examen diario — Hematología, reumatología y dermatología" },
      { day: 24, title: "Examen diario — Salud mental" },
      { day: 25, title: "Examen diario — Temas ambulatorios y cierre del módulo" },
    ],
  },
  {
    moduleNumber: 7,
    moduleName: "Atención en Salud",
    moduleSlug: "atencion-en-salud",
    moduleIcon: "🏥",
    totalDays: 15,
    audioPath: path.join(__dirname, "..", "CUADERNILLOS 01 y 02 _V2", "tts_scripts", "cuadernillo_07_atencion_salud", "audios"),
    blocks: [
      { number: 1, name: "Epidemiología y Determinantes", daysStart: 1, daysEnd: 5 },
      { number: 2, name: "Normatividad y Evaluación de Programas", daysStart: 6, daysEnd: 10 },
      { number: 3, name: "Banco de preguntas y Simulacros", daysStart: 11, daysEnd: 15 },
    ],
    days: [
      { day: 1, title: "Introducción al módulo — Diferencia con módulos anteriores" },
      { day: 2, title: "Determinantes sociales de la salud" },
      { day: 3, title: "Epidemiología — Prevalencia e incidencia" },
      { day: 4, title: "Riesgo relativo, IC 95% y lectura de tablas" },
      { day: 5, title: "Sistematización de información en salud" },
      { day: 6, title: "Atención Primaria en Salud — APS" },
      { day: 7, title: "Sistema de salud colombiano y marco normativo" },
      { day: 8, title: "Normatividad internacional y PDSP" },
      { day: 9, title: "Evaluación de programas y ciclo PHVA" },
      { day: 10, title: "Banco de preguntas — Afirmaciones 1 y 4" },
      { day: 11, title: "Banco de preguntas adicional — Afirmaciones 1 y 4" },
      { day: 12, title: "Banco de preguntas — Afirmaciones 2 y 3" },
      { day: 13, title: "Simulacro 1 — Parte 1" },
      { day: 14, title: "Simulacro 2 — Parte 2" },
      { day: 15, title: "Consolidación final" },
    ],
  },
  {
    moduleNumber: 8,
    moduleName: "Promoción y Prevención",
    moduleSlug: "promocion-y-prevencion",
    moduleIcon: "💊",
    totalDays: 15,
    audioPath: path.join(__dirname, "..", "CUADERNILLOS 01 y 02 _V2", "tts_scripts", "cuadernillo_08_PyP", "audios"),
    blocks: [
      { number: 1, name: "Prevención de la Enfermedad", daysStart: 1, daysEnd: 5 },
      { number: 2, name: "Promoción de la Salud y Normatividad", daysStart: 6, daysEnd: 10 },
      { number: 3, name: "Banco de preguntas y Simulacros", daysStart: 11, daysEnd: 15 },
    ],
    days: [
      { day: 1, title: "Introducción — Promoción vs Prevención" },
      { day: 2, title: "Historia natural de la enfermedad y niveles de prevención" },
      { day: 3, title: "Factores de riesgo, protectores y ciclo vital" },
      { day: 4, title: "Cadena epidemiológica y enfermedades transmisibles" },
      { day: 5, title: "Tamizaje — Criterios, sensibilidad y especificidad" },
      { day: 6, title: "Promoción de la salud — Carta de Ottawa" },
      { day: 7, title: "Técnicas educativas e IEC" },
      { day: 8, title: "Salud ocupacional — Riesgos laborales" },
      { day: 9, title: "Bioseguridad — Precauciones estándar y residuos hospitalarios" },
      { day: 10, title: "Normatividad colombiana — Resoluciones 412, 3280 y 518" },
      { day: 11, title: "Banco de preguntas — Afirmación 2 (prevención)" },
      { day: 12, title: "Banco de preguntas — Afirmación 1 (promoción)" },
      { day: 13, title: "Simulacro 1" },
      { day: 14, title: "Simulacro 2" },
      { day: 15, title: "Consolidación final del módulo y del programa" },
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
        totalDays: cuadernillo.totalDays,
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
