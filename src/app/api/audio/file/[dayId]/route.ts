import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: { dayId: string } }
) {
  const { dayId } = params;
  const dayNumber = parseInt(dayId);

  if (isNaN(dayNumber) || dayNumber < 1 || dayNumber > 120) {
    return NextResponse.json({ error: "Invalid day" }, { status: 400 });
  }

  // Calcular módulo basado en el día global
  const moduleNumber = Math.ceil(dayNumber / 15);
  const dayInModule = ((dayNumber - 1) % 15) + 1;

  // Buscar el DailyContent en la BD
  const dailyContent = await prisma.dailyContent.findFirst({
    where: {
      dayNumber: dayInModule,
      module: {
        number: moduleNumber,
      },
    },
    select: {
      audioUrl: true,
    },
  });

  if (!dailyContent?.audioUrl) {
    return NextResponse.json(
      { error: "Audio not found for this day" },
      { status: 404 }
    );
  }

  // Redirect a Cloudinary (mejor para CDN caching y no consume memoria del servidor)
  return NextResponse.redirect(dailyContent.audioUrl, 302);
}
