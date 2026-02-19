import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** GET /api/coordinator/cohorts — List coordinator's cohorts */
export async function GET() {
  const session = await auth();
  if (!session?.user?.role || session.user.role !== "COORDINATOR") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const cohorts = await prisma.cohort.findMany({
    where: { coordinatorId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { students: true } },
    },
  });

  return NextResponse.json({
    cohorts: cohorts.map((c) => ({
      id: c.id,
      name: c.name,
      startDate: c.startDate,
      endDate: c.endDate,
      isActive: c.isActive,
      studentCount: c._count.students,
      createdAt: c.createdAt,
    })),
  });
}

/** POST /api/coordinator/cohorts — Create new cohort */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.role || session.user.role !== "COORDINATOR") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const { name, startDate } = body;

  if (!name || !startDate) {
    return NextResponse.json(
      { error: "Nombre y fecha de inicio son requeridos" },
      { status: 400 }
    );
  }

  const cohort = await prisma.cohort.create({
    data: {
      name,
      startDate: new Date(startDate),
      coordinatorId: session.user.id,
    },
  });

  return NextResponse.json({ success: true, cohort });
}
