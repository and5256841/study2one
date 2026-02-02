import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getStudentCurrentDay,
  getModuleDateRange,
  formatDateRange,
  getModuleForDay,
  MODULES_INFO,
  TOTAL_DAYS,
} from "@/lib/student-day";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const studentId = session.user.id;

  // Obtener información del día actual del estudiante
  const studentDayInfo = await getStudentCurrentDay(studentId);

  if (!studentDayInfo) {
    return NextResponse.json(
      { error: "No tienes un cohort asignado. Contacta a tu coordinador." },
      { status: 400 }
    );
  }

  const { cohortStartDate, dayNumber: maxUnlockedDay } = studentDayInfo;

  // Obtener progreso del estudiante (días completados)
  const completedAudioProgress = await prisma.audioProgress.findMany({
    where: {
      studentId,
      isCompleted: true,
    },
    include: {
      dailyContent: {
        include: {
          module: true,
        },
      },
    },
  });

  const passedQuizzes = await prisma.quizAttempt.findMany({
    where: {
      studentId,
      score: { gte: 2 }, // Mínimo 2 de 3 correctas
    },
    include: {
      dailyContent: {
        include: {
          module: true,
        },
      },
    },
  });

  // Calcular días completamente terminados (audio + quiz)
  // Usamos el día global basado en el módulo y su startDay
  const completedDaysSet = new Set<string>();
  for (const progress of completedAudioProgress) {
    const moduleNum = progress.dailyContent.module.number;
    const dayNum = progress.dailyContent.dayNumber;
    completedDaysSet.add(`${moduleNum}-${dayNum}`);
  }

  const passedQuizDaysSet = new Set<string>();
  for (const quiz of passedQuizzes) {
    const moduleNum = quiz.dailyContent.module.number;
    const dayNum = quiz.dailyContent.dayNumber;
    passedQuizDaysSet.add(`${moduleNum}-${dayNum}`);
  }

  // Un día está completo solo si tiene audio Y quiz pasado
  const fullyCompletedDays: number[] = [];
  Array.from(completedDaysSet).forEach((key) => {
    if (passedQuizDaysSet.has(key)) {
      const [moduleNum, dayNum] = key.split("-").map(Number);
      const moduleInfo = MODULES_INFO[moduleNum - 1];
      if (moduleInfo) {
        const globalDay = moduleInfo.startDay + dayNum - 1;
        fullyCompletedDays.push(globalDay);
      }
    }
  });

  // Construir información de cada módulo
  const modules = MODULES_INFO.map((moduleInfo) => {
    const { startDay, endDay, totalDays } = moduleInfo;

    // Contar días completados en este módulo
    const completedInModule = fullyCompletedDays.filter(
      (d) => d >= startDay && d <= endDay
    ).length;

    // Determinar estado del módulo
    let status: "completed" | "in_progress" | "locked";
    if (completedInModule === totalDays) {
      status = "completed";
    } else if (startDay <= maxUnlockedDay) {
      status = "in_progress";
    } else {
      status = "locked";
    }

    // Calcular rango de fechas
    const dateRange = getModuleDateRange(cohortStartDate, moduleInfo.number);

    return {
      number: moduleInfo.number,
      name: moduleInfo.name,
      icon: moduleInfo.icon,
      weeks: moduleInfo.weeks,
      description: moduleInfo.description,
      totalWeeks: moduleInfo.totalWeeks,
      totalDays,
      startDay,
      endDay,
      status,
      completedDays: completedInModule,
      dateRange: {
        start: dateRange.start.toISOString(),
        end: dateRange.end.toISOString(),
        formatted: formatDateRange(dateRange.start, dateRange.end),
      },
    };
  });

  // Calcular progreso general
  const totalCompletedDays = fullyCompletedDays.length;
  const progressPercentage = Math.round((totalCompletedDays / TOTAL_DAYS) * 100);

  // Encontrar el día actual (próximo sin completar)
  let currentDay = 1;
  for (let i = 1; i <= maxUnlockedDay; i++) {
    if (!fullyCompletedDays.includes(i)) {
      currentDay = i;
      break;
    }
    currentDay = i + 1;
  }
  currentDay = Math.min(currentDay, maxUnlockedDay);

  // Info del módulo actual
  const currentModule = getModuleForDay(currentDay);

  return NextResponse.json({
    cohort: {
      id: studentDayInfo.cohortId,
      name: studentDayInfo.cohortName,
      startDate: cohortStartDate.toISOString(),
    },
    currentDay,
    maxUnlockedDay,
    currentModule: {
      number: currentModule.number,
      name: currentModule.name,
      icon: currentModule.icon,
    },
    modules,
    progress: {
      completedDays: totalCompletedDays,
      totalDays: TOTAL_DAYS,
      percentage: progressPercentage,
    },
  });
}
