"use client";

import { useParams } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";

// ============================================================
// Ejercicios por día del módulo — basados en el cuadernillo 04
// ============================================================
interface Exercise {
  title: string;
  topic: string;
  intro: string;
  prompt: string;
  requirements: string[];
  minWords: number;
  maxWords: number;
  isSimulacro: boolean;
  timerMinutes?: number; // visible countdown for simulacros
}

const EXERCISES: Record<number, Exercise> = {
  1: {
    title: "Del 'creo que' al argumento",
    topic: "Diferencia entre opinar y argumentar",
    intro:
      "Hoy aprendiste que opinar es decir qué piensas, pero argumentar es explicar POR QUÉ lo piensas. Un argumento tiene premisas (razones) que justifican una conclusión (tu posición).",
    prompt:
      "¿Deberían los médicos recién graduados estar obligados a trabajar en zonas rurales antes de elegir su especialidad?",
    requirements: [
      "Fija una posición clara desde la primera oración (a favor o en contra).",
      "Incluye al menos DOS razones (premisas) que expliquen por qué tienes esa posición.",
      "Cierra con una oración conclusiva que retome tu posición.",
      "No uses solo frases como 'creo que sí' o 'pienso que no' sin explicar el porqué.",
    ],
    minWords: 60,
    maxWords: 160,
    isSimulacro: false,
  },
  2: {
    title: "Primer párrafo pertinente",
    topic: "La pertinencia — responder exactamente la pregunta",
    intro:
      "Hoy aprendiste que la impertinencia es el error más costoso. Tu texto debe responder exactamente la pregunta formulada, no el tema en general. Aplica la técnica del subrayado: las palabras clave de esta pregunta son tu brújula.",
    prompt:
      "¿Está usted de acuerdo con que los menores de 14 años puedan acceder a cirugías puramente estéticas?",
    requirements: [
      "Tu primera oración debe mencionar o implicar las palabras clave: 'menores de 14 años' y 'cirugías puramente estéticas'.",
      "Fija tu posición (a favor o en contra) de manera explícita.",
      "Anuncia brevemente los argumentos que desarrollarías.",
      "No hables de cirugías estéticas en general: sé específico respecto a la edad y al tipo de cirugía.",
    ],
    minWords: 60,
    maxWords: 130,
    isSimulacro: false,
  },
  3: {
    title: "El esqueleto del texto",
    topic: "Estructura: introducción, desarrollo y conclusión",
    intro:
      "Hoy aprendiste la estructura de tres partes. El ejercicio de hoy consiste en construir el ESQUELETO completo: cuatro oraciones que definen el mapa de tu ensayo antes de desarrollarlo. Es exactamente lo que harás en los 10 minutos de planificación del Saber Pro.",
    prompt:
      "¿Debería el Estado colombiano implementar la vacunación obligatoria para enfermedades prevenibles?",
    requirements: [
      "ORACIÓN 1 — Tesis: escribe una sola oración con tu posición clara (a favor o en contra).",
      "ORACIÓN 2 — Argumento 1: escribe en una oración el primer argumento con el que lo sustentarías.",
      "ORACIÓN 3 — Argumento 2: escribe en una oración el segundo argumento con el que lo sustentarías.",
      "ORACIÓN 4 — Conclusión: escribe en una oración cómo cerrarías el texto retomando tu posición.",
      "Estas cuatro oraciones son el mapa: claras, directas, sin relleno.",
    ],
    minWords: 40,
    maxWords: 120,
    isSimulacro: false,
  },
  4: {
    title: "Un argumento sólido",
    topic: "Tipos de argumentos: causal, ejemplo, autoridad, analógico",
    intro:
      "Hoy aprendiste cuatro tipos de argumentos. Escoge UNO de estos tipos e indica al inicio de tu respuesta cuál usas (ej: 'Argumento causal:'). Recuerda la fórmula: AFIRMACIÓN + RAZÓN + EJEMPLO.",
    prompt:
      "¿Debería limitarse el uso de redes sociales en personas menores de 16 años?",
    requirements: [
      "Indica en la primera línea el tipo de argumento que usas: causal, por ejemplo, de autoridad o analógico.",
      "AFIRMACIÓN: Escribe tu posición sobre el tema.",
      "RAZÓN: Explica por qué esa posición es válida (el mecanismo o la lógica que la sustenta).",
      "EJEMPLO: Da un caso concreto, un dato o una analogía que ilustre tu argumento.",
      "El párrafo debe ser un bloque coherente, no una lista.",
    ],
    minWords: 70,
    maxWords: 180,
    isSimulacro: false,
  },
  5: {
    title: "Forma de expresión impecable",
    topic: "Los 10 errores más frecuentes y cómo evitarlos",
    intro:
      "Hoy aprendiste los 10 errores más frecuentes: tildes en esdrújulas, el 'porque/por qué', mayúsculas innecesarias, punto y seguido vs. aparte, abuso de comas, concordancia, repetición, gerundios, dequeísmo y oraciones larguísimas. Ahora escribe con máximo cuidado.",
    prompt:
      "¿Considera que el sistema de salud colombiano garantiza el acceso equitativo a la atención médica para todos sus ciudadanos?",
    requirements: [
      "Escribe UN párrafo de introducción y UN párrafo de desarrollo (sin conclusión, solo dos párrafos).",
      "Presta especial atención a las tildes en palabras médicas y académicas: diagnóstico, clínico, público, académico, médico, específico, básico.",
      "Usa 'porque' (conjunción) correctamente al menos una vez.",
      "No uses mayúsculas en sustantivos comunes.",
      "Evita oraciones con más de tres comas seguidas: usa el punto.",
    ],
    minWords: 90,
    maxWords: 200,
    isSimulacro: false,
  },
  6: {
    title: "El cemento del argumento",
    topic: "Conectores argumentativos por función",
    intro:
      "Hoy aprendiste que los conectores son el cemento entre los ladrillos de tus argumentos. En este ejercicio debes usar conectores de AL MENOS TRES funciones distintas (introducir, agregar, justificar causa, consecuencia, contrastar, concluir). Anótalas entre paréntesis si quieres.",
    prompt:
      "¿Debería el gobierno colombiano prohibir la publicidad de comida chatarra dirigida a menores de 12 años?",
    requirements: [
      "Escribe un texto completo: introducción + dos párrafos de desarrollo + conclusión.",
      "Usa conectores de al menos TRES funciones distintas (ej: introducir + causa + contraste).",
      "No repitas el mismo conector más de dos veces.",
      "Cada párrafo de desarrollo debe empezar con un conector diferente.",
    ],
    minWords: 150,
    maxWords: 300,
    isSimulacro: false,
  },
  7: {
    title: "Tu formación médica como ventaja",
    topic: "Práctica cronometrada — argumentación desde la medicina",
    intro:
      "Hoy aprendiste que tu formación médica es una ventaja real en el Saber Pro. Tienes conocimiento clínico, epidemiológico y bioético que otros candidatos no tienen. Úsalo — pero tradúcelo a lenguaje accesible para el público general. Tienes 40 minutos (cronómetro visible, sin límite de entrega).",
    prompt:
      "¿Considera que el Estado colombiano debería invertir más recursos en salud mental que en infraestructura hospitalaria?",
    requirements: [
      "Escribe el texto completo: introducción con tesis, dos párrafos de desarrollo, conclusión.",
      "Usa tu conocimiento médico: carga de enfermedad, epidemiología, bioética, sistema de salud.",
      "Traduce los conceptos clínicos a lenguaje accesible (no escribas en jerga médica).",
      "Mantén tu posición consistente de principio a fin.",
      "Aplica la distribución de tiempo: 10 min planificación, 25 min escritura, 5 min revisión.",
    ],
    minWords: 220,
    maxWords: 400,
    isSimulacro: false,
    timerMinutes: 40,
  },
  8: {
    title: "Autoevaluación con rúbrica",
    topic: "Rúbrica ICFES y checklist pre-entrega",
    intro:
      "Hoy aprendiste la rúbrica de cuatro niveles (insuficiente → alto) y el checklist de cinco pasos pre-entrega. Escribe tu texto y luego, en los últimos 5 minutos, aplica el checklist mentalmente antes de enviarlo. El evaluador real leerá tu texto buscando exactamente esos cinco elementos.",
    prompt:
      "¿Considera que las escuelas de medicina colombianas deberían incorporar formación obligatoria en salud rural y medicina comunitaria como requisito de graduación?",
    requirements: [
      "Escribe el texto completo con la estructura aprendida.",
      "Al FINAL del texto, agrega una línea en blanco y escribe: '✓ CHECKLIST:' seguido de los cinco puntos que revisaste (pertinencia, tesis, argumentos completos, conclusión, ortografía).",
      "Para cada punto del checklist escribe: ✓ si está correcto, △ si hay algo que mejorar.",
      "Este checklist hace parte de la entrega.",
    ],
    minWords: 220,
    maxWords: 420,
    isSimulacro: false,
    timerMinutes: 40,
  },
  9: {
    title: "Simulacro 1",
    topic: "Examen bajo condiciones reales — 40 minutos",
    intro:
      "Este es tu primer simulacro completo. Condiciones reales: 40 minutos estrictos (el cronómetro es visible), 10 minutos de planificación, 25 de escritura continua, 5 de revisión con el checklist. NO releas mientras escribes. Completa el texto antes de revisar.",
    prompt:
      "¿Debería el Estado colombiano legislar para que las instituciones de educación superior implementen programas obligatorios de bienestar mental y apoyo psicológico para sus estudiantes?",
    requirements: [
      "Planifica los primeros 10 minutos: subraya palabras clave, define tesis, esboza argumentos.",
      "Escribe de corrido durante 25 minutos: introducción + dos párrafos de desarrollo + conclusión.",
      "Revisa en los últimos 5 minutos con el checklist: pertinencia, tesis, argumentos, conclusión, ortografía.",
      "No uses 'depende' ni des los dos lados: elige una posición y sostenla.",
    ],
    minWords: 250,
    maxWords: 450,
    isSimulacro: true,
    timerMinutes: 40,
  },
  10: {
    title: "Simulacro 2 — Cierre del módulo",
    topic: "Examen bajo condiciones reales — 40 minutos",
    intro:
      "Este es tu simulacro final. Ya tienes la experiencia del Simulacro 1. Ejecuta mejor: más especificidad en los ejemplos, concesión estratégica en un párrafo, conclusión que sintetice la implicación de los argumentos (no solo los repita). El cronómetro corre.",
    prompt:
      "¿Considera que los médicos que trabajan en el sistema de salud colombiano deberían estar legalmente obligados a atender pacientes en zonas rurales de difícil acceso durante al menos dos años después de graduarse?",
    requirements: [
      "Escribe el texto completo: introducción, dos o tres párrafos de desarrollo, conclusión.",
      "Incorpora una CONCESIÓN ESTRATÉGICA: reconoce brevemente el argumento contrario en un párrafo, luego refútalo.",
      "Sé específico en los ejemplos: evita 'muchos estudios demuestran' — cita realidades concretas del sistema de salud colombiano.",
      "La conclusión debe sintetizar la implicación de tus argumentos, no solo repetir la introducción.",
    ],
    minWords: 250,
    maxWords: 480,
    isSimulacro: true,
    timerMinutes: 40,
  },
};

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function WritePage() {
  const params = useParams();
  const dayId = params.dayId as string;

  const [dayInModule, setDayInModule] = useState<number | null>(null);
  const [dailyContentId, setDailyContentId] = useState<string | null>(null);
  const [previousSubmission, setPreviousSubmission] = useState<{
    content: string;
    wordCount: number;
    submittedAt: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const [content, setContent] = useState("");
  const [pasteBlocked, setPasteBlocked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Timer (for simulacros and cronometrado days)
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

  // Fetch exercise context
  useEffect(() => {
    fetch(`/api/writing/${dayId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.dayInModule) {
          setDayInModule(data.dayInModule);
          setDailyContentId(data.dailyContentId);
          if (data.submission) {
            setPreviousSubmission(data.submission);
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [dayId]);

  // Start timer when user begins typing
  const startTimer = useCallback(() => {
    if (!timerActive) {
      setTimerActive(true);
      timerRef.current = setInterval(() => {
        setElapsedSeconds((s) => s + 1);
      }, 1000);
    }
  }, [timerActive]);

  // Stop timer on submit
  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setTimerActive(false);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    startTimer();
  };

  // ============================
  // ANTI-PASTE ENFORCEMENT
  // ============================
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    setPasteBlocked(true);
    setTimeout(() => setPasteBlocked(false), 3000);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  const handleSubmit = async () => {
    if (!dailyContentId || wordCount < (exercise?.minWords ?? 30)) return;
    setSubmitting(true);
    stopTimer();

    try {
      const res = await fetch(`/api/writing/${dayId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, timeSpentSeconds: elapsedSeconds }),
      });
      if (res.ok) {
        setSubmitted(true);
      }
    } catch (error) {
      console.error(error);
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="px-4 py-6 flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-400 text-sm">Cargando ejercicio...</p>
      </div>
    );
  }

  if (!dayInModule || !EXERCISES[dayInModule]) {
    return (
      <div className="px-4 py-6 text-center space-y-4">
        <p className="text-gray-400">Ejercicio de escritura no disponible para este día.</p>
        <Link href={`/day/${dayId}`} className="text-orange-400 text-sm hover:underline">
          ← Volver al día
        </Link>
      </div>
    );
  }

  const exercise = EXERCISES[dayInModule];
  const isTimedDay = !!exercise.timerMinutes;
  const minReached = wordCount >= exercise.minWords;
  const maxReached = wordCount >= exercise.maxWords;

  // ============================
  // SUBMITTED STATE
  // ============================
  if (submitted) {
    return (
      <div className="px-4 py-6 space-y-6 text-center pb-32">
        <div className="pt-6">
          <div className="text-5xl mb-3">✍️</div>
          <h2 className="text-xl font-bold">¡Ejercicio enviado!</h2>
          <p className="text-gray-400 text-sm mt-2">
            {wordCount} palabras · {formatTime(elapsedSeconds)} de escritura
          </p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-left space-y-2">
          <p className="text-xs text-gray-500 uppercase font-semibold">Tu texto entregado</p>
          <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap line-clamp-6">
            {content}
          </p>
        </div>

        <div className="space-y-3">
          <Link
            href={`/day/${dayId}`}
            className="block w-full py-3 bg-gradient-to-r from-green-700 to-green-500 text-white font-semibold rounded-xl text-center"
          >
            Volver al día {dayId}
          </Link>
          <button
            onClick={() => { setSubmitted(false); setContent(""); setElapsedSeconds(0); }}
            className="w-full py-3 bg-white/5 border border-white/10 text-gray-300 rounded-xl text-sm"
          >
            Escribir de nuevo
          </button>
        </div>
      </div>
    );
  }

  // ============================
  // PREVIOUS SUBMISSION BANNER
  // ============================
  return (
    <div className="px-4 py-4 space-y-4 pb-40">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Link href={`/day/${dayId}`} className="text-gray-400 hover:text-white text-lg">←</Link>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider">
            ✍️ Comunicación Escrita · Día {dayInModule} de 10
          </p>
          <h2 className="font-bold text-base">{exercise.title}</h2>
        </div>
      </div>

      {/* Timer for timed days */}
      {isTimedDay && (
        <div className="flex items-center justify-between bg-orange-500/5 border border-orange-500/20 rounded-xl px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="text-orange-300 text-sm">⏱</span>
            <span className="text-orange-300 font-mono text-lg font-bold">
              {formatTime(elapsedSeconds)}
            </span>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Meta: {exercise.timerMinutes} min</p>
            <p className="text-xs text-orange-400">{timerActive ? "Escribiendo..." : "Empieza a escribir"}</p>
          </div>
        </div>
      )}

      {/* Previous submission notice */}
      {previousSubmission && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
          <p className="text-blue-300 text-xs font-semibold">
            Ya enviaste un ejercicio para este día ({previousSubmission.wordCount} palabras).
            Puedes enviar uno nuevo si quieres practicar más.
          </p>
        </div>
      )}

      {/* Paste blocked notice */}
      {pasteBlocked && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
          <p className="text-red-400 text-sm font-semibold">
            ⚠️ No se permite pegar texto
          </p>
          <p className="text-gray-400 text-xs mt-0.5">
            Debes escribir directamente para desarrollar la habilidad de redacción.
          </p>
        </div>
      )}

      {/* Intro del ejercicio */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
        <p className="text-xs text-gray-500 uppercase font-semibold">Tema del día</p>
        <p className="text-xs text-orange-300">{exercise.topic}</p>
        <p className="text-sm text-gray-300 leading-relaxed">{exercise.intro}</p>
      </div>

      {/* Prompt */}
      <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
        <p className="text-xs text-blue-400 font-semibold uppercase mb-2">Pregunta / Tema a redactar</p>
        <p className="text-white font-medium leading-relaxed">&ldquo;{exercise.prompt}&rdquo;</p>
      </div>

      {/* Requirements */}
      <div className="space-y-1.5">
        <p className="text-xs text-gray-500 uppercase font-semibold">Lo que se evalúa hoy</p>
        {exercise.requirements.map((req, i) => (
          <div key={i} className="flex gap-2 text-sm text-gray-300">
            <span className="text-orange-400 shrink-0 mt-0.5">•</span>
            <span className="leading-snug">{req}</span>
          </div>
        ))}
      </div>

      {/* Word count target */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>Extensión recomendada: {exercise.minWords}–{exercise.maxWords} palabras</span>
        <span className={`font-mono font-semibold ${
          maxReached ? "text-yellow-400" : minReached ? "text-green-400" : "text-gray-500"
        }`}>
          {wordCount} palabras
        </span>
      </div>

      {/* Textarea — anti-paste */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onPaste={handlePaste}
          onDrop={handleDrop}
          onContextMenu={handleContextMenu}
          rows={12}
          placeholder={`Escribe aquí tu respuesta para el día ${dayInModule}.\n\nRecuerda: no se puede pegar texto — debes escribir directamente para practicar la redacción.`}
          spellCheck
          className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-white text-sm leading-relaxed placeholder-gray-600 focus:outline-none focus:border-orange-500/40 resize-none transition-all"
          style={{ fontFamily: "inherit" }}
        />
        {/* Word count inline */}
        <div className="absolute bottom-3 right-4 text-xs text-gray-600">
          {wordCount}/{exercise.maxWords}
        </div>
      </div>

      {/* Progress bar toward min words */}
      <div>
        <div className="bg-white/10 rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              maxReached ? "bg-yellow-400" : minReached ? "bg-green-400" : "bg-orange-400"
            }`}
            style={{ width: `${Math.min((wordCount / exercise.minWords) * 100, 100)}%` }}
          />
        </div>
        <p className="text-xs text-gray-600 mt-1">
          {minReached
            ? maxReached
              ? "Extensión máxima alcanzada"
              : "Extensión mínima alcanzada ✓"
            : `${exercise.minWords - wordCount} palabras para la extensión mínima`}
        </p>
      </div>

      {/* Submit */}
      <div className="fixed bottom-20 left-4 right-4">
        <button
          onClick={handleSubmit}
          disabled={!minReached || submitting || !dailyContentId}
          className={`w-full py-3.5 font-semibold rounded-xl transition-all ${
            minReached && !submitting
              ? "bg-gradient-to-r from-orange-600 to-orange-400 text-white hover:shadow-lg"
              : "bg-white/5 border border-white/10 text-gray-500 cursor-not-allowed"
          }`}
        >
          {submitting
            ? "Enviando..."
            : !minReached
            ? `Faltan ${exercise.minWords - wordCount} palabras para enviar`
            : "Enviar ejercicio ✓"}
        </button>
      </div>
    </div>
  );
}
