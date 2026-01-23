/**
 * Script de generación de audio para Study2One
 *
 * Lee archivos TTS .txt → Genera MP3 con msedge-tts (voz colombiana)
 * → Sube a Cloudinary → Actualiza la base de datos
 *
 * Uso: node scripts/generate-audio.mjs [--module 1] [--block 1] [--day 1]
 *      node scripts/generate-audio.mjs --upload-only (sube archivos existentes)
 *      node scripts/generate-audio.mjs --list-voices (lista voces disponibles)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Importar msedge-tts
const { MsEdgeTTS, OUTPUT_FORMAT } = await import("msedge-tts");

// Configuración
const CONFIG = {
  voice: "es-CO-GonzaloNeural", // Voz colombiana masculina
  outputFormat: OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3,
  outputDir: path.join(__dirname, "..", "audio-output"),
  ttsSourceDir: "C:\\Users\\progr\\Documents\\STUDY2ONE\\Cuadernillos",
  modules: [
    { number: 1, slug: "lectura-critica", folder: "Cuadernillo 01 Lectura Critica", filePrefix: "TTS_Lectura_Critica" },
  ],
  maxCharsPerChunk: 4000,
};

// Parse argumentos
const args = process.argv.slice(2);
const getArg = (name) => {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 ? args[idx + 1] : null;
};
const uploadOnly = args.includes("--upload-only");
const listVoices = args.includes("--list-voices");
const targetModule = getArg("module");
const targetBlock = getArg("block");
const targetDay = getArg("day");

/**
 * Lista voces colombianas disponibles
 */
async function listAvailableVoices() {
  const tts = new MsEdgeTTS();
  const voices = await tts.getVoices();
  const colombian = voices.filter(v => v.Locale.startsWith("es-CO"));
  console.log("Voces colombianas disponibles:");
  colombian.forEach(v => {
    console.log(`  ${v.ShortName} (${v.Gender}) - ${v.FriendlyName}`);
  });
  console.log(`\nTotal voces en español: ${voices.filter(v => v.Locale.startsWith("es")).length}`);
  tts.close();
}

/**
 * Parsea un archivo TTS y extrae el contenido por día
 */
function parseTTSFile(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  const days = [];

  const dayRegex = /={5}\s*DÍA\s+(\d+):\s*(.+?)\s*={5}/g;
  let match;
  const markers = [];

  while ((match = dayRegex.exec(content)) !== null) {
    markers.push({
      dayNumber: parseInt(match[1]),
      title: match[2].trim(),
      startIndex: match.index + match[0].length,
    });
  }

  for (let i = 0; i < markers.length; i++) {
    const endIndex = i < markers.length - 1
      ? content.lastIndexOf("=====", markers[i + 1].startIndex - 1)
      : content.length;

    const text = content
      .substring(markers[i].startIndex, endIndex)
      .replace(/={5}.*?={5}/g, "")
      .replace(/\r\n/g, "\n")
      .trim();

    days.push({
      dayNumber: markers[i].dayNumber,
      title: markers[i].title,
      text,
    });
  }

  return days;
}

/**
 * Divide texto largo en chunks por párrafos
 */
function splitTextIntoChunks(text, maxChars) {
  if (text.length <= maxChars) return [text];

  const chunks = [];
  const paragraphs = text.split("\n\n");
  let currentChunk = "";

  for (const para of paragraphs) {
    if ((currentChunk + "\n\n" + para).length > maxChars && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = para;
    } else {
      currentChunk = currentChunk ? currentChunk + "\n\n" + para : para;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Genera audio de un chunk de texto y retorna un Buffer
 */
async function generateChunkBuffer(text) {
  return new Promise(async (resolve, reject) => {
    const tts = new MsEdgeTTS();
    await tts.setMetadata(CONFIG.voice, CONFIG.outputFormat);

    const { audioStream } = tts.toStream(text, { rate: "medium" });
    const buffers = [];

    audioStream.on("data", (chunk) => buffers.push(chunk));
    audioStream.on("end", () => {
      tts.close();
      resolve(Buffer.concat(buffers));
    });
    audioStream.on("error", (err) => {
      tts.close();
      reject(err);
    });
  });
}

/**
 * Genera un archivo MP3 usando msedge-tts
 */
async function generateAudio(text, outputPath) {
  try {
    const chunks = splitTextIntoChunks(text, CONFIG.maxCharsPerChunk);
    const allBuffers = [];

    for (let i = 0; i < chunks.length; i++) {
      if (chunks.length > 1) {
        console.log(`    Chunk ${i + 1}/${chunks.length} (${chunks[i].length} chars)...`);
      }

      const buffer = await generateChunkBuffer(chunks[i]);
      allBuffers.push(buffer);

      // Pausa entre chunks
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Escribir todos los buffers al archivo
    const finalBuffer = Buffer.concat(allBuffers);
    fs.writeFileSync(outputPath, finalBuffer);

    const sizeMB = (finalBuffer.length / (1024 * 1024)).toFixed(2);
    console.log(`  Audio generado: ${sizeMB} MB`);
    return true;
  } catch (error) {
    console.error(`  Error generando audio: ${error.message}`);
    return false;
  }
}

/**
 * Sube un archivo a Cloudinary
 */
async function uploadToCloudinary(filePath, publicId) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    console.log("  Cloudinary no configurado, saltando subida");
    return null;
  }

  try {
    const { v2: cloudinary } = await import("cloudinary");
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });

    const result = await cloudinary.uploader.upload(filePath, {
      resource_type: "video",
      public_id: publicId,
      folder: "study2one/audio",
      overwrite: true,
    });

    console.log(`  Subido a Cloudinary: ${result.secure_url}`);
    return result.secure_url;
  } catch (error) {
    console.error(`  Error subiendo a Cloudinary: ${error.message}`);
    return null;
  }
}

/**
 * Actualiza la base de datos con la URL del audio
 */
async function updateDatabase(moduleNumber, dayNumber, title, audioUrl, durationSeconds) {
  if (!process.env.DATABASE_URL) {
    console.log("  DATABASE_URL no configurado, saltando actualización de BD");
    return;
  }

  try {
    const { PrismaClient } = await import("@prisma/client");
    const prisma = new PrismaClient();

    let mod = await prisma.module.findFirst({
      where: { number: moduleNumber },
    });

    if (!mod) {
      const moduleInfo = CONFIG.modules.find(m => m.number === moduleNumber);
      mod = await prisma.module.create({
        data: {
          number: moduleNumber,
          name: moduleInfo?.folder?.replace(/Cuadernillo \d+ /, "") || `Módulo ${moduleNumber}`,
          slug: moduleInfo?.slug || `modulo-${moduleNumber}`,
          totalDays: 15,
        },
      });
    }

    const blockNumber = Math.ceil(dayNumber / 5);
    let block = await prisma.block.findFirst({
      where: { moduleId: mod.id, number: blockNumber },
    });

    if (!block) {
      block = await prisma.block.create({
        data: {
          moduleId: mod.id,
          number: blockNumber,
          daysStart: (blockNumber - 1) * 5 + 1,
          daysEnd: blockNumber * 5,
        },
      });
    }

    await prisma.dailyContent.upsert({
      where: {
        moduleId_dayNumber: {
          moduleId: mod.id,
          dayNumber,
        },
      },
      update: {
        audioUrl,
        audioDurationSeconds: durationSeconds,
        title,
      },
      create: {
        moduleId: mod.id,
        blockId: block.id,
        dayNumber,
        title,
        audioUrl,
        audioDurationSeconds: durationSeconds,
        summary: `Contenido del día ${dayNumber}: ${title}`,
      },
    });

    await prisma.$disconnect();
    console.log(`  Base de datos actualizada`);
  } catch (error) {
    console.error(`  Error actualizando BD: ${error.message}`);
  }
}

/**
 * Estima duración de un MP3 a 96kbps
 */
function estimateDuration(filePath) {
  const stats = fs.statSync(filePath);
  // 96kbps = 12000 bytes por segundo
  return Math.round(stats.size / 12000);
}

/**
 * Proceso principal
 */
async function main() {
  if (listVoices) {
    await listAvailableVoices();
    return;
  }

  console.log("=== Study2One - Generador de Audio ===\n");
  console.log(`Voz: ${CONFIG.voice}`);
  console.log(`Formato: 24kHz 96kbps MP3`);
  console.log(`Output: ${CONFIG.outputDir}\n`);

  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }

  const modulesToProcess = targetModule
    ? CONFIG.modules.filter(m => m.number === parseInt(targetModule))
    : CONFIG.modules;

  let totalGenerated = 0;
  let totalFailed = 0;

  for (const mod of modulesToProcess) {
    console.log(`\n--- Módulo ${mod.number}: ${mod.folder} ---\n`);

    const moduleOutputDir = path.join(CONFIG.outputDir, `module-${String(mod.number).padStart(2, "0")}`);
    if (!fs.existsSync(moduleOutputDir)) {
      fs.mkdirSync(moduleOutputDir, { recursive: true });
    }

    for (let blockNum = 1; blockNum <= 3; blockNum++) {
      if (targetBlock && parseInt(targetBlock) !== blockNum) continue;

      const ttsFile = path.join(CONFIG.ttsSourceDir, mod.folder, `${mod.filePrefix}_Bloque${blockNum}.txt`);

      if (!fs.existsSync(ttsFile)) {
        console.log(`  Archivo no encontrado: ${ttsFile}`);
        continue;
      }

      console.log(`Bloque ${blockNum}: ${path.basename(ttsFile)}`);
      const days = parseTTSFile(ttsFile);
      console.log(`  ${days.length} días encontrados\n`);

      for (const day of days) {
        if (targetDay && parseInt(targetDay) !== day.dayNumber) continue;

        const outputFile = path.join(moduleOutputDir, `day-${String(day.dayNumber).padStart(2, "0")}.mp3`);
        console.log(`Día ${day.dayNumber}: ${day.title}`);
        console.log(`  Texto: ${day.text.length} caracteres`);

        if (!uploadOnly) {
          if (fs.existsSync(outputFile)) {
            console.log(`  Ya existe, saltando (usa --force para regenerar)`);
            continue;
          }

          const success = await generateAudio(day.text, outputFile);
          if (!success) {
            console.log(`  FALLO\n`);
            totalFailed++;
            continue;
          }
          totalGenerated++;
        } else if (!fs.existsSync(outputFile)) {
          console.log(`  Archivo no existe, saltando\n`);
          continue;
        }

        const durationSeconds = estimateDuration(outputFile);
        const mins = Math.floor(durationSeconds / 60);
        const secs = String(durationSeconds % 60).padStart(2, "0");
        console.log(`  Duración estimada: ${mins}:${secs}`);

        const publicId = `module-${String(mod.number).padStart(2, "0")}/day-${String(day.dayNumber).padStart(2, "0")}`;
        const audioUrl = await uploadToCloudinary(outputFile, publicId);

        if (audioUrl) {
          await updateDatabase(mod.number, day.dayNumber, day.title, audioUrl, durationSeconds);
        }

        console.log("");

        // Pausa entre días para no saturar el servicio
        if (!uploadOnly) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
  }

  console.log(`\n=== Resumen ===`);
  console.log(`Generados: ${totalGenerated}`);
  console.log(`Fallidos: ${totalFailed}`);
}

main().catch(console.error);
