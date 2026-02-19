import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getModuleForDay, getDayInModule, TOTAL_DAYS } from "@/lib/student-day";

export async function GET(
  req: NextRequest,
  { params }: { params: { dayId: string } }
) {
  const { dayId } = params;
  const dayNumber = parseInt(dayId);

  if (isNaN(dayNumber) || dayNumber < 1 || dayNumber > TOTAL_DAYS) {
    return NextResponse.json({ error: "Invalid day" }, { status: 400 });
  }

  // Calcular módulo y día dentro del módulo usando MODULES_INFO correcto
  const moduleInfo = getModuleForDay(dayNumber);
  const dayInModule = getDayInModule(dayNumber);

  const dailyContent = await prisma.dailyContent.findFirst({
    where: {
      dayNumber: dayInModule,
      module: { number: moduleInfo.number },
    },
    select: { audioUrl: true },
  });

  if (!dailyContent?.audioUrl) {
    return NextResponse.json(
      { error: "Audio not found for this day" },
      { status: 404 }
    );
  }

  // Redirect a Cloudinary (CDN caching, no consume memoria del servidor)
  return NextResponse.redirect(dailyContent.audioUrl, 302);
}
