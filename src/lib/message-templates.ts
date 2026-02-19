/**
 * Coordinator message templates for Study2One
 * Used by the coordinator to send pre-formed messages to students
 */

export interface MessageTemplate {
  key: string;
  title: string;
  body: string;
  category: "alert" | "congrats" | "custom";
  icon: string;
}

export const MESSAGE_TEMPLATES: MessageTemplate[] = [
  // ── Alerts ──
  {
    key: "at_risk",
    title: "Alerta: Estás en riesgo",
    body: "{name}, llevas {days} días sin conectarte. Tu racha se perdió. Retoma hoy.",
    category: "alert",
    icon: "⚠️",
  },
  {
    key: "missed_day",
    title: "No te conectaste ayer",
    body: "{name}, ayer no completaste tu día. Recuerda que la constancia es clave.",
    category: "alert",
    icon: "📅",
  },
  {
    key: "quiz_failing",
    title: "Revisa tus respuestas",
    body: "{name}, has fallado {count} de las últimas {total} preguntas. Te recomendamos repasar el audio del día antes de responder.",
    category: "alert",
    icon: "📉",
  },
  {
    key: "no_photo",
    title: "Falta tu evidencia",
    body: "{name}, no has subido la evidencia fotográfica del día {day}. Recuerda tomar foto de tu mapa mental o cuadernillo.",
    category: "alert",
    icon: "📷",
  },

  // ── Congratulations ──
  {
    key: "great_streak",
    title: "¡Excelente racha!",
    body: "{name}, llevas {streak} días consecutivos. ¡Sigue así, vas muy bien!",
    category: "congrats",
    icon: "🔥",
  },
  {
    key: "perfect_quiz",
    title: "¡Respuestas perfectas!",
    body: "{name}, obtuviste puntuación perfecta en el quiz del día {day}. ¡Excelente trabajo!",
    category: "congrats",
    icon: "🌟",
  },
  {
    key: "module_complete",
    title: "¡Módulo completado!",
    body: "{name}, has completado el módulo {module}. Ya puedes acceder al simulacro correspondiente. ¡Felicitaciones!",
    category: "congrats",
    icon: "🎉",
  },
  {
    key: "great_progress",
    title: "¡Vas muy bien!",
    body: "{name}, tu progreso es destacado. Llevas {days} días completados y un promedio de {score}% en quizzes. ¡Sigue así!",
    category: "congrats",
    icon: "💪",
  },
  {
    key: "simulacro_unlocked",
    title: "Simulacro desbloqueado",
    body: "{name}, el coordinador te ha desbloqueado el {simulacro}. ¡Ya puedes acceder!",
    category: "congrats",
    icon: "🔓",
  },

  // ── Custom ──
  {
    key: "custom",
    title: "",
    body: "",
    category: "custom",
    icon: "✉️",
  },
];

/**
 * Replaces {variable} placeholders in a template string
 */
export function fillTemplate(
  text: string,
  variables: Record<string, string | number>
): string {
  let result = text;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, "g"), String(value));
  }
  return result;
}
