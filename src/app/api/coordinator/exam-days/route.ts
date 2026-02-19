import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.role || session.user.role !== "COORDINATOR") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const examDays = await prisma.dailyContent.findMany({
    where: { isExamDay: true },
    include: {
      _count: { select: { questions: true } },
    },
    orderBy: { dayNumber: "asc" },
  });

  return NextResponse.json(
    examDays.map((d) => ({
      id: d.id,
      dayNumber: d.dayNumber,
      title: d.title,
      questionCount: d._count.questions,
    }))
  );
}
