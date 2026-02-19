/**
 * Student Day Calculator for Study2One
 * Calcula el día actual del estudiante basado en la fecha de inicio del cohort
 *
 * Estructura: 8 módulos, 25 semanas, 125 días hábiles (lunes a viernes)
 */

import { prisma } from "./prisma";

/**
 * Información de los 8 módulos del programa
 * El programa se cuenta en días hábiles (lunes a viernes), 5 días por semana
 */
export const MODULES_INFO = [
  {
    number: 1,
    name: "Lectura Crítica",
    icon: "📖",
    weeks: "Semana 1-3",
    description: "Comprensión, análisis, inferencias, argumentación",
    totalWeeks: 3,
    totalDays: 15,
    startDay: 1,
    endDay: 15,
  },
  {
    number: 2,
    name: "Razonamiento Cuantitativo",
    icon: "🔢",
    weeks: "Semana 4-6",
    description: "Estadística, álgebra, interpretación de datos",
    totalWeeks: 3,
    totalDays: 15,
    startDay: 16,
    endDay: 30,
  },
  {
    number: 3,
    name: "Competencias Ciudadanas",
    icon: "🏛️",
    weeks: "Semana 7-9",
    description: "Ética, constitución, pensamiento crítico social",
    totalWeeks: 3,
    totalDays: 15,
    startDay: 31,
    endDay: 45,
  },
  {
    number: 4,
    name: "Comunicación Escrita",
    icon: "✍️",
    weeks: "Semana 10-11",
    description: "Ensayo argumentativo, coherencia, gramática",
    totalWeeks: 2,
    totalDays: 10,
    startDay: 46,
    endDay: 55,
  },
  {
    number: 5,
    name: "Inglés",
    icon: "🌍",
    weeks: "Semana 12-13",
    description: "Comprensión lectora, vocabulario, gramática",
    totalWeeks: 2,
    totalDays: 10,
    startDay: 56,
    endDay: 65,
  },
  {
    number: 6,
    name: "Fundamentación Dx y Tx",
    icon: "🩺",
    weeks: "Semana 14-19",
    description: "Casos clínicos, razonamiento diagnóstico y terapéutico",
    totalWeeks: 6,
    totalDays: 30,
    startDay: 66,
    endDay: 95,
  },
  {
    number: 7,
    name: "Atención en Salud",
    icon: "🏥",
    weeks: "Semana 20-22",
    description: "Sistema de salud, APS, políticas, determinantes",
    totalWeeks: 3,
    totalDays: 15,
    startDay: 96,
    endDay: 110,
  },
  {
    number: 8,
    name: "Promoción y Prevención",
    icon: "🌱",
    weeks: "Semana 23-25",
    description: "Epidemiología, salud pública, niveles de prevención",
    totalWeeks: 3,
    totalDays: 15,
    startDay: 111,
    endDay: 125,
  },
] as const;

export const TOTAL_MODULES = 8;
export const TOTAL_WEEKS = 25;
export const TOTAL_DAYS = 125;

// Para compatibilidad con código existente (promedio)
export const DAYS_PER_MODULE = Math.ceil(TOTAL_DAYS / TOTAL_MODULES);

export interface StudentDayInfo {
  dayNumber: number;        // Día global (1-125, solo días hábiles)
  moduleNumber: number;     // Módulo actual (1-8)
  dayInModule: number;      // Día dentro del módulo
  cohortStartDate: Date;    // Fecha de inicio del cohort
  daysElapsed: number;      // Días hábiles transcurridos desde startDate
  cohortId: string;         // ID del cohort
  cohortName: string;       // Nombre del cohort
}

/**
 * Cuenta los días hábiles (lunes a viernes) entre dos fechas (ambas inclusivas)
 */
export function countWeekdays(start: Date, end: Date): number {
  const s = new Date(start);
  s.setHours(0, 0, 0, 0);
  const e = new Date(end);
  e.setHours(0, 0, 0, 0);

  if (e < s) return 0;

  let count = 0;
  const current = new Date(s);
  while (current <= e) {
    const dow = current.getDay();
    if (dow !== 0 && dow !== 6) count++;
    current.setDate(current.getDate() + 1);
  }
  return count;
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
 * El día 1 corresponde al primer día hábil desde startDate
 * Solo se cuentan días hábiles (lunes a viernes)
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

  // Contar días hábiles transcurridos (incluyendo hoy si es hábil)
  const weekdaysElapsed = countWeekdays(startDate, today);

  // El día 1 es el primer día hábil (weekdaysElapsed = 1)
  // Limitar entre 1 y TOTAL_DAYS (125)
  const dayNumber = Math.min(Math.max(weekdaysElapsed, 1), TOTAL_DAYS);

  // Calcular módulo y día dentro del módulo
  const currentMod = getModuleForDay(dayNumber);
  const dayInModule = getDayInModule(dayNumber);

  return {
    dayNumber,
    moduleNumber: currentMod.number,
    dayInModule,
    cohortStartDate: startDate,
    daysElapsed: Math.max(weekdaysElapsed, 0),
    cohortId: cohort.id,
    cohortName: cohort.name,
  };
}

/**
 * Calcula la fecha calendario de un día hábil específico dado el startDate del cohort
 * Salta fines de semana: día 1 = startDate (o sig. lunes si cae en fin de semana)
 */
export function getDayDate(startDate: Date, dayNumber: number): Date {
  const date = new Date(startDate);
  date.setHours(0, 0, 0, 0);

  let weekdaysCounted = 0;
  while (weekdaysCounted < dayNumber) {
    const dow = date.getDay();
    if (dow !== 0 && dow !== 6) {
      weekdaysCounted++;
    }
    if (weekdaysCounted < dayNumber) {
      date.setDate(date.getDate() + 1);
    }
  }
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

/**
 * Obtiene el número de semana (1-25) para un día global (1-125)
 */
export function getWeekNumber(globalDay: number): number {
  return Math.ceil(globalDay / 5);
}

/**
 * Obtiene el primer día global de una semana dada (semana 1 = día 1, semana 2 = día 6, etc.)
 */
export function getWeekStartDay(weekNumber: number): number {
  return (weekNumber - 1) * 5 + 1;
}
