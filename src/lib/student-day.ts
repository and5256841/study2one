/**
 * Student Day Calculator for Study2One
 * Calcula el día actual del estudiante basado en la fecha de inicio del cohort
 *
 * Estructura: 9 módulos, 25 semanas, 175 días totales
 */

import { prisma } from "./prisma";

/**
 * Información de los 9 módulos del programa
 * Cada módulo tiene semanas variables (2-3 semanas = 14-21 días)
 */
export const MODULES_INFO = [
  {
    number: 1,
    name: "Lectura Crítica",
    icon: "📖",
    weeks: "Semana 1-3",
    description: "Comprensión, análisis, inferencias, argumentación",
    totalWeeks: 3,
    totalDays: 21,
    startDay: 1,
    endDay: 21,
  },
  {
    number: 2,
    name: "Razonamiento Cuantitativo",
    icon: "🔢",
    weeks: "Semana 4-6",
    description: "Estadística, álgebra, interpretación de datos",
    totalWeeks: 3,
    totalDays: 21,
    startDay: 22,
    endDay: 42,
  },
  {
    number: 3,
    name: "Competencias Ciudadanas",
    icon: "🏛️",
    weeks: "Semana 7-9",
    description: "Ética, constitución, pensamiento crítico social",
    totalWeeks: 3,
    totalDays: 21,
    startDay: 43,
    endDay: 63,
  },
  {
    number: 4,
    name: "Comunicación Escrita",
    icon: "✍️",
    weeks: "Semana 10-11",
    description: "Ensayo argumentativo, coherencia, gramática",
    totalWeeks: 2,
    totalDays: 14,
    startDay: 64,
    endDay: 77,
  },
  {
    number: 5,
    name: "Inglés",
    icon: "🌍",
    weeks: "Semana 12-14",
    description: "Comprensión lectora, vocabulario, gramática",
    totalWeeks: 3,
    totalDays: 21,
    startDay: 78,
    endDay: 98,
  },
  {
    number: 6,
    name: "Pensamiento Científico",
    icon: "🔬",
    weeks: "Semana 15-17",
    description: "Método científico, análisis de estudios",
    totalWeeks: 3,
    totalDays: 21,
    startDay: 99,
    endDay: 119,
  },
  {
    number: 7,
    name: "Fundamentación Dx y Tx",
    icon: "🩺",
    weeks: "Semana 18-20",
    description: "Casos clínicos, razonamiento diagnóstico",
    totalWeeks: 3,
    totalDays: 21,
    startDay: 120,
    endDay: 140,
  },
  {
    number: 8,
    name: "Atención en Salud",
    icon: "🏥",
    weeks: "Semana 21-23",
    description: "Sistema de salud, APS, políticas",
    totalWeeks: 3,
    totalDays: 21,
    startDay: 141,
    endDay: 161,
  },
  {
    number: 9,
    name: "Promoción y Prevención",
    icon: "🌱",
    weeks: "Semana 24-25",
    description: "Epidemiología, salud pública",
    totalWeeks: 2,
    totalDays: 14,
    startDay: 162,
    endDay: 175,
  },
] as const;

export const TOTAL_MODULES = 9;
export const TOTAL_WEEKS = 25;
export const TOTAL_DAYS = 175;

// Para compatibilidad con código existente (promedio)
export const DAYS_PER_MODULE = Math.ceil(TOTAL_DAYS / TOTAL_MODULES);

export interface StudentDayInfo {
  dayNumber: number;        // Día global (1-175)
  moduleNumber: number;     // Módulo actual (1-9)
  dayInModule: number;      // Día dentro del módulo
  cohortStartDate: Date;    // Fecha de inicio del cohort
  daysElapsed: number;      // Días transcurridos desde startDate
  cohortId: string;         // ID del cohort
  cohortName: string;       // Nombre del cohort
}

/**
 * Obtiene el módulo para un día global específico
 */
export function getModuleForDay(globalDay: number): typeof MODULES_INFO[number] {
  for (const mod of MODULES_INFO) {
    if (globalDay >= mod.startDay && globalDay <= mod.endDay) {
      return mod;
    }
  }
  // Si está fuera de rango, devolver el último módulo
  return MODULES_INFO[MODULES_INFO.length - 1];
}

/**
 * Calcula el día dentro del módulo para un día global
 */
export function getDayInModule(globalDay: number): number {
  const modInfo = getModuleForDay(globalDay);
  return globalDay - modInfo.startDay + 1;
}

/**
 * Obtiene información del día actual del estudiante basado en su cohort
 * El día 1 corresponde al startDate del cohort
 */
export async function getStudentCurrentDay(studentId: string): Promise<StudentDayInfo | null> {
  // Obtener el cohort más reciente del estudiante
  const cohortStudent = await prisma.cohortStudent.findFirst({
    where: { studentId },
    include: {
      cohort: {
        select: {
          id: true,
          name: true,
          startDate: true,
          isActive: true,
        }
      }
    },
    orderBy: { joinedAt: "desc" }
  });

  if (!cohortStudent?.cohort) {
    return null;
  }

  const { cohort } = cohortStudent;
  const startDate = new Date(cohort.startDate);
  const now = new Date();

  // Normalizar a inicio del día para cálculo consistente
  startDate.setHours(0, 0, 0, 0);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  // Calcular días transcurridos
  const diffTime = today.getTime() - startDate.getTime();
  const daysElapsed = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  // El día 1 es cuando daysElapsed = 0 (el startDate)
  // Limitar entre 1 y TOTAL_DAYS (175)
  const dayNumber = Math.min(Math.max(daysElapsed + 1, 1), TOTAL_DAYS);

  // Calcular módulo y día dentro del módulo
  const currentMod = getModuleForDay(dayNumber);
  const dayInModule = getDayInModule(dayNumber);

  return {
    dayNumber,
    moduleNumber: currentMod.number,
    dayInModule,
    cohortStartDate: startDate,
    daysElapsed: Math.max(daysElapsed, 0),
    cohortId: cohort.id,
    cohortName: cohort.name,
  };
}

/**
 * Calcula la fecha de un día específico dado el startDate del cohort
 */
export function getDayDate(startDate: Date, dayNumber: number): Date {
  const date = new Date(startDate);
  date.setDate(date.getDate() + dayNumber - 1);
  return date;
}

/**
 * Calcula el rango de fechas para un módulo
 */
export function getModuleDateRange(startDate: Date, moduleNumber: number): { start: Date; end: Date } {
  const moduleInfo = MODULES_INFO[moduleNumber - 1];
  if (!moduleInfo) {
    // Fallback para módulo inválido
    return {
      start: startDate,
      end: startDate,
    };
  }

  return {
    start: getDayDate(startDate, moduleInfo.startDay),
    end: getDayDate(startDate, moduleInfo.endDay),
  };
}

/**
 * Formatea una fecha en español
 */
export function formatDateSpanish(date: Date): string {
  return date.toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
  });
}

/**
 * Formatea un rango de fechas para mostrar en UI
 * Ej: "3 - 17 Feb"
 */
export function formatDateRange(start: Date, end: Date): string {
  const startStr = start.toLocaleDateString("es-CO", { day: "numeric" });
  const endStr = end.toLocaleDateString("es-CO", { day: "numeric", month: "short" });

  // Si son del mismo mes, solo mostrar mes al final
  if (start.getMonth() === end.getMonth()) {
    return `${startStr} - ${endStr}`;
  }

  // Si son de meses diferentes
  const startMonth = start.toLocaleDateString("es-CO", { month: "short" });
  return `${startStr} ${startMonth} - ${endStr}`;
}
