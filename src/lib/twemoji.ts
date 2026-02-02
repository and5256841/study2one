/**
 * Twemoji Avatar System for Study2One
 * License: CC BY 4.0 (commercial use allowed with attribution)
 * CDN: jsDelivr (free, fast)
 */

// Emojis de caras y personas permitidos para avatares
export const TWEMOJI_AVATARS = [
  // Caras sonrientes
  { code: "1f600", label: "Sonrisa", category: "caras" },
  { code: "1f604", label: "Sonrisa grande", category: "caras" },
  { code: "1f60a", label: "Feliz", category: "caras" },
  { code: "1f60e", label: "Cool", category: "caras" },
  { code: "1f913", label: "Nerd", category: "caras" },
  { code: "1f917", label: "Abrazo", category: "caras" },
  { code: "1f929", label: "Estrellitas", category: "caras" },
  { code: "1f60d", label: "Enamorado", category: "caras" },
  { code: "1f642", label: "Leve sonrisa", category: "caras" },
  { code: "1f609", label: "Guino", category: "caras" },
  { code: "1f60b", label: "Delicioso", category: "caras" },
  { code: "1f61c", label: "Lengua afuera", category: "caras" },
  { code: "1f970", label: "Cariñoso", category: "caras" },
  { code: "1f973", label: "Fiesta", category: "caras" },
  { code: "1f60c", label: "Aliviado", category: "caras" },

  // Caras pensativas/estudiosas
  { code: "1f914", label: "Pensando", category: "estudio" },
  { code: "1f9d0", label: "Monoculo", category: "estudio" },
  { code: "1f4aa", label: "Fuerza", category: "estudio" },
  { code: "1f3af", label: "Diana", category: "estudio" },
  { code: "2728", label: "Brillos", category: "estudio" },
  { code: "1f4a1", label: "Idea", category: "estudio" },
  { code: "1f4da", label: "Libros", category: "estudio" },
  { code: "1f4dd", label: "Notas", category: "estudio" },
  { code: "1f9e0", label: "Cerebro", category: "estudio" },
  { code: "2615", label: "Cafe", category: "estudio" },

  // Profesionales de salud (usando códigos simples que funcionan en Twemoji)
  { code: "2695", label: "Medicina", category: "medico" },
  { code: "1fa7a", label: "Estetoscopio", category: "medico" },
  { code: "1f489", label: "Jeringa", category: "medico" },
  { code: "1f48a", label: "Pastilla", category: "medico" },
  { code: "1f3e5", label: "Hospital", category: "medico" },
  { code: "1f9ec", label: "ADN", category: "medico" },
  { code: "1f52c", label: "Microscopio", category: "medico" },
  { code: "1f9ea", label: "Tubo ensayo", category: "medico" },
  { code: "1f393", label: "Graduado", category: "medico" },
  { code: "1f9d1-200d-1f393", label: "Estudiante", category: "medico" },

  // Gestos positivos
  { code: "1f44d", label: "Pulgar arriba", category: "gestos" },
  { code: "270c", label: "Victoria", category: "gestos" },
  { code: "1f44b", label: "Hola", category: "gestos" },
  { code: "1f64c", label: "Celebracion", category: "gestos" },
  { code: "1f91d", label: "Apreton", category: "gestos" },
  { code: "1f44f", label: "Aplauso", category: "gestos" },
  { code: "1f91f", label: "Te quiero", category: "gestos" },
  { code: "1f4aa", label: "Musculo", category: "gestos" },
  { code: "1f91e", label: "Dedos cruzados", category: "gestos" },
  { code: "1f64f", label: "Oracion", category: "gestos" },
] as const;

export type TwemojiCode = typeof TWEMOJI_AVATARS[number]["code"];

/**
 * Genera la URL del SVG de Twemoji desde jsDelivr CDN
 */
export function getTwemojiUrl(code: string): string {
  // Normalizar código: convertir a minúsculas y limpiar variantes de presentación
  let normalizedCode = code.toLowerCase();

  // Para códigos simples (sin ZWJ), quitar -fe0f
  // Para códigos compuestos (con 200d), mantener estructura pero sin fe0f al final
  if (!normalizedCode.includes("200d")) {
    normalizedCode = normalizedCode.replace(/-fe0f/g, "");
  } else {
    // Quitar fe0f solo al final de códigos ZWJ
    normalizedCode = normalizedCode.replace(/-fe0f$/, "");
  }

  return `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${normalizedCode}.svg`;
}

/**
 * Valida si un código de emoji está en la lista permitida
 */
export function isValidTwemojiCode(code: string): boolean {
  return TWEMOJI_AVATARS.some(emoji => emoji.code === code);
}

/**
 * Obtiene el emoji por defecto
 */
export function getDefaultTwemoji() {
  return TWEMOJI_AVATARS[0]; // Sonrisa
}

/**
 * Obtiene un emoji por su código
 */
export function getTwemojiByCode(code: string) {
  return TWEMOJI_AVATARS.find(emoji => emoji.code === code) || getDefaultTwemoji();
}

/**
 * Agrupa emojis por categoría para mostrar en UI
 */
export function getTwemojisByCategory() {
  const categories = {
    caras: [] as typeof TWEMOJI_AVATARS[number][],
    estudio: [] as typeof TWEMOJI_AVATARS[number][],
    medico: [] as typeof TWEMOJI_AVATARS[number][],
    gestos: [] as typeof TWEMOJI_AVATARS[number][],
  };

  for (const emoji of TWEMOJI_AVATARS) {
    categories[emoji.category].push(emoji);
  }

  return categories;
}
