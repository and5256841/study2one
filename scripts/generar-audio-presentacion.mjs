#!/usr/bin/env node
/**
 * Script para generar audio de presentación con OpenAI TTS
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error("Error: OPENAI_API_KEY no está configurada");
  console.log("Uso: OPENAI_API_KEY=sk-xxx node scripts/generar-audio-presentacion.mjs");
  process.exit(1);
}

// Función para dividir texto en chunks de máximo 4000 caracteres
function dividirTexto(texto, maxChars = 4000) {
  const chunks = [];
  const parrafos = texto.split("\n").filter(p => p.trim());

  let chunkActual = "";

  for (const parrafo of parrafos) {
    if ((chunkActual + "\n" + parrafo).length > maxChars) {
      if (chunkActual) {
        chunks.push(chunkActual.trim());
      }

      // Si el párrafo solo es muy largo, dividirlo por oraciones
      if (parrafo.length > maxChars) {
        const oraciones = parrafo.match(/[^.!?]+[.!?]+/g) || [parrafo];
        let subChunk = "";

        for (const oracion of oraciones) {
          if ((subChunk + " " + oracion).length > maxChars) {
            if (subChunk) chunks.push(subChunk.trim());
            subChunk = oracion;
          } else {
            subChunk += " " + oracion;
          }
        }
        if (subChunk) chunkActual = subChunk;
      } else {
        chunkActual = parrafo;
      }
    } else {
      chunkActual += (chunkActual ? "\n" : "") + parrafo;
    }
  }

  if (chunkActual.trim()) {
    chunks.push(chunkActual.trim());
  }

  return chunks;
}

// Función para generar audio con OpenAI TTS
async function generarAudio(texto, voz = "nova") {
  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "tts-1-hd",
      input: texto,
      voice: voz,
      response_format: "mp3",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Error OpenAI TTS: ${response.status} - ${error}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

async function main() {
  console.log("=".repeat(60));
  console.log("Generando Audio de Presentación Study2One");
  console.log("=".repeat(60));

  // Leer el archivo de texto
  const textoPath = path.join(__dirname, "..", "TTS para presentacion.txt");
  const texto = fs.readFileSync(textoPath, "utf-8");

  console.log(`\nTexto leído: ${texto.length} caracteres`);

  // Dividir en chunks si es necesario
  const chunks = dividirTexto(texto);
  console.log(`Dividido en ${chunks.length} partes`);

  // Generar audio para cada chunk
  const audioBuffers = [];

  for (let i = 0; i < chunks.length; i++) {
    console.log(`\nGenerando parte ${i + 1}/${chunks.length} (${chunks[i].length} chars)...`);

    try {
      const audioBuffer = await generarAudio(chunks[i], "nova");
      audioBuffers.push(audioBuffer);
      console.log(`  ✓ Parte ${i + 1} generada (${audioBuffer.length} bytes)`);
    } catch (error) {
      console.error(`  ✗ Error en parte ${i + 1}: ${error.message}`);
      process.exit(1);
    }
  }

  // Combinar todos los buffers de audio
  console.log("\nCombinando partes...");
  const audioFinal = Buffer.concat(audioBuffers);

  // Guardar en la carpeta de cuadernillos
  const outputDir = path.join(__dirname, "..", "CUADERNILLOS 01 y 02 _V2");
  const outputPath = path.join(outputDir, "presentacion_study2one.mp3");

  fs.writeFileSync(outputPath, audioFinal);

  console.log("\n" + "=".repeat(60));
  console.log("AUDIO GENERADO EXITOSAMENTE");
  console.log("=".repeat(60));
  console.log(`\nArchivo: ${outputPath}`);
  console.log(`Tamaño: ${(audioFinal.length / 1024 / 1024).toFixed(2)} MB`);

  // Eliminar el archivo de texto de la raíz
  console.log("\nEliminando archivo TXT de la raíz...");
  fs.unlinkSync(textoPath);
  console.log("✓ Archivo TXT eliminado");
}

main().catch(console.error);
