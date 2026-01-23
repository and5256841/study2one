/**
 * Seed de preguntas para el Módulo 1: Lectura Crítica
 * Ejecutar: node scripts/seed-questions.mjs
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const questionsData = [
  {
    dayNumber: 1,
    questions: [
      {
        order: 1,
        caseText: "Un artículo científico afirma: 'El medicamento X redujo la mortalidad en un 50%'. El estudio se realizó en 200 pacientes jóvenes sin comorbilidades durante 6 meses.",
        question: "Según el audio de hoy, ¿qué haría un lector crítico al leer esta afirmación?",
        explanation: "Un lector crítico no se queda con la superficie de las palabras. Cuestiona la cifra relativa vs. absoluta, la población del estudio, la duración del seguimiento y posibles conflictos de interés.",
        options: [
          { letter: "A", text: "Aceptar la conclusión porque el 50% es un porcentaje alto", correct: false },
          { letter: "B", text: "Cuestionar qué significa ese 50% en términos absolutos y si aplica a todos los pacientes", correct: true },
          { letter: "C", text: "Rechazar el artículo porque fue financiado por una farmacéutica", correct: false },
          { letter: "D", text: "Buscar otros artículos que digan lo mismo para confirmarlo", correct: false },
        ],
      },
      {
        order: 2,
        caseText: null,
        question: "Según el modelo de Kintsch (1998), ¿cuáles son los tres niveles de representación mental que construimos al leer?",
        explanation: "Kintsch propone: 1) Estructura de superficie (palabras individuales), 2) Base proposicional (significado de oraciones conectadas), 3) Modelo de situación (integración con conocimiento previo, evaluación crítica).",
        options: [
          { letter: "A", text: "Literal, inferencial y argumentativo", correct: false },
          { letter: "B", text: "Estructura de superficie, base proposicional y modelo de situación", correct: true },
          { letter: "C", text: "Comprensión, análisis y síntesis", correct: false },
          { letter: "D", text: "Decodificación, interpretación y memorización", correct: false },
        ],
      },
      {
        order: 3,
        caseText: null,
        question: "¿Cuál es el error más común que cometen los estudiantes de medicina en el Saber Pro de Lectura Crítica?",
        explanation: "El examen evalúa tu capacidad de comprender lo que el autor escribió, no tu conocimiento externo. Responder basándose en lo que aprendiste en clases, en lugar de lo que dice el texto, es el error más frecuente.",
        options: [
          { letter: "A", text: "No leer el texto completo antes de responder", correct: false },
          { letter: "B", text: "Responder basándose en su conocimiento médico externo en lugar de lo que dice el texto", correct: true },
          { letter: "C", text: "Dedicar demasiado tiempo a una sola pregunta", correct: false },
          { letter: "D", text: "No entender el vocabulario técnico del texto", correct: false },
        ],
      },
    ],
  },
  {
    dayNumber: 2,
    questions: [
      {
        order: 1,
        caseText: null,
        question: "¿Cómo se distribuyen las 35 preguntas del examen entre las tres afirmaciones?",
        explanation: "Afirmación 1 (literal): 26% (~9 preguntas). Afirmación 2 (inferencial): 40% (~14 preguntas). Afirmación 3 (crítica): 34% (~12 preguntas). El 74% requiere ir más allá del texto explícito.",
        options: [
          { letter: "A", text: "33% cada una, distribuidas equitativamente", correct: false },
          { letter: "B", text: "50% literal, 30% inferencial, 20% crítico", correct: false },
          { letter: "C", text: "26% literal, 40% inferencial, 34% crítico", correct: true },
          { letter: "D", text: "20% literal, 40% inferencial, 40% crítico", correct: false },
        ],
      },
      {
        order: 2,
        caseText: null,
        question: "¿Qué tipo de texto representa el 70% de las preguntas del examen?",
        explanation: "Los textos continuos informativos (ensayos, artículos de opinión, textos expositivos y argumentativos) dominan con el 70%. Los literarios son ~15% y los discontinuos ~15%.",
        options: [
          { letter: "A", text: "Textos discontinuos como tablas y gráficas", correct: false },
          { letter: "B", text: "Textos continuos literarios como cuentos y novelas", correct: false },
          { letter: "C", text: "Textos continuos informativos como ensayos y artículos", correct: true },
          { letter: "D", text: "Textos mixtos que combinan gráficas con narrativa", correct: false },
        ],
      },
      {
        order: 3,
        caseText: "Tienes 35 preguntas de Lectura Crítica y dispones de aproximadamente 100 minutos para completarlas. Llevas 8 minutos en una pregunta particularmente difícil.",
        question: "¿Cuál es la estrategia recomendada según el audio de hoy?",
        explanation: "Nunca quedarse atascado más de 2-3 minutos. Una pregunta difícil vale igual que una fácil. Es mejor marcar tu mejor opción educada y seguir adelante para no perder tiempo que necesitas para preguntas más directas.",
        options: [
          { letter: "A", text: "Seguir intentando hasta encontrar la respuesta correcta", correct: false },
          { letter: "B", text: "Dejar la pregunta en blanco y pasar a la siguiente", correct: false },
          { letter: "C", text: "Marcar tu mejor opción educada y seguir adelante", correct: true },
          { letter: "D", text: "Releer el texto desde el principio con más calma", correct: false },
        ],
      },
    ],
  },
  {
    dayNumber: 3,
    questions: [
      {
        order: 1,
        caseText: "Un texto dice: 'La tasa de mortalidad infantil en la región disminuyó significativamente tras la implementación del programa de vacunación universal.'",
        question: "Si la pregunta del examen dice '¿Qué afirma el texto sobre la mortalidad infantil?', ¿a qué afirmación del ICFES corresponde?",
        explanation: "Es una pregunta de Afirmación 1 (nivel literal) porque pide identificar información explícita del texto. No requiere inferir ni evaluar, solo localizar lo que el texto dice directamente.",
        options: [
          { letter: "A", text: "Afirmación 1: identificar contenidos locales explícitos", correct: true },
          { letter: "B", text: "Afirmación 2: comprender la articulación global", correct: false },
          { letter: "C", text: "Afirmación 3: reflexionar y evaluar el contenido", correct: false },
          { letter: "D", text: "No corresponde a ninguna afirmación específica", correct: false },
        ],
      },
      {
        order: 2,
        caseText: null,
        question: "¿Qué evalúa la segunda afirmación del ICFES ('Comprende cómo se articulan las partes de un texto')?",
        explanation: "La Afirmación 2 evalúa comprensión inferencial: estructura general del texto, función de cada párrafo, relaciones lógicas entre ideas, y distinción de voces (autor vs. citados).",
        options: [
          { letter: "A", text: "El significado de palabras individuales en contexto", correct: false },
          { letter: "B", text: "La estructura del texto, función de párrafos y relaciones lógicas entre ideas", correct: true },
          { letter: "C", text: "Los sesgos y supuestos implícitos del autor", correct: false },
          { letter: "D", text: "La validez de los argumentos presentados", correct: false },
        ],
      },
      {
        order: 3,
        caseText: "Un autor argumenta: 'Debemos prohibir el uso de celulares en las aulas porque los países con mejores resultados educativos ya lo han hecho.'",
        question: "Identificar el supuesto implícito de este argumento corresponde a la evaluación de:",
        explanation: "Identificar supuestos implícitos (en este caso, que copiar políticas de otros países garantiza los mismos resultados) es una habilidad de la Afirmación 3: reflexión y evaluación crítica.",
        options: [
          { letter: "A", text: "Afirmación 1: comprensión literal", correct: false },
          { letter: "B", text: "Afirmación 2: comprensión inferencial", correct: false },
          { letter: "C", text: "Afirmación 3: reflexión y evaluación crítica", correct: true },
          { letter: "D", text: "Ninguna afirmación, es conocimiento externo", correct: false },
        ],
      },
    ],
  },
];

async function seed() {
  console.log("=== Seeding preguntas del Módulo 1 ===\n");

  // Find or create module
  let module = await prisma.module.findFirst({ where: { number: 1 } });
  if (!module) {
    module = await prisma.module.create({
      data: { number: 1, name: "Lectura Crítica", slug: "lectura-critica", totalDays: 15, orderIndex: 1 },
    });
    console.log("Módulo 1 creado");
  }

  for (const dayData of questionsData) {
    // Find or create daily content
    let dailyContent = await prisma.dailyContent.findFirst({
      where: { moduleId: module.id, dayNumber: dayData.dayNumber },
    });

    if (!dailyContent) {
      // Need a block
      const blockNumber = Math.ceil(dayData.dayNumber / 5);
      let block = await prisma.block.findFirst({
        where: { moduleId: module.id, number: blockNumber },
      });
      if (!block) {
        block = await prisma.block.create({
          data: {
            moduleId: module.id,
            number: blockNumber,
            daysStart: (blockNumber - 1) * 5 + 1,
            daysEnd: blockNumber * 5,
          },
        });
      }

      dailyContent = await prisma.dailyContent.create({
        data: {
          moduleId: module.id,
          blockId: block.id,
          dayNumber: dayData.dayNumber,
          title: `Día ${dayData.dayNumber}`,
          summary: `Contenido del día ${dayData.dayNumber}`,
        },
      });
    }

    console.log(`Día ${dayData.dayNumber}: ${dailyContent.id}`);

    // Delete existing questions for this day (for re-seeding)
    await prisma.questionOption.deleteMany({
      where: { question: { dailyContentId: dailyContent.id } },
    });
    await prisma.dailyQuestion.deleteMany({
      where: { dailyContentId: dailyContent.id },
    });

    // Create questions
    for (const q of dayData.questions) {
      const question = await prisma.dailyQuestion.create({
        data: {
          dailyContentId: dailyContent.id,
          questionOrder: q.order,
          caseText: q.caseText,
          questionText: q.question,
          explanation: q.explanation,
          difficulty: "MEDIUM",
        },
      });

      // Create options
      for (const opt of q.options) {
        await prisma.questionOption.create({
          data: {
            questionId: question.id,
            letter: opt.letter,
            text: opt.text,
            isCorrect: opt.correct,
          },
        });
      }

      console.log(`  Pregunta ${q.order}: ${q.question.substring(0, 50)}...`);
    }
  }

  await prisma.$disconnect();
  console.log("\n=== Seed completado ===");
}

seed().catch(console.error);
