import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "COORDINATOR") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // Get announcements from all cohorts this coordinator manages
  const announcements = await prisma.announcement.findMany({
    where: { authorId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json({ announcements });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "COORDINATOR") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { title, body } = await req.json();

  if (!title || !body) {
    return NextResponse.json({ error: "Titulo y cuerpo son requeridos" }, { status: 400 });
  }

  // Find coordinator's cohort
  let cohort = await prisma.cohort.findFirst({
    where: { coordinatorId: session.user.id },
  });

  // Create a default cohort if none exists
  if (!cohort) {
    cohort = await prisma.cohort.create({
      data: {
        name: "Cohorte Principal",
        startDate: new Date(),
        coordinatorId: session.user.id,
      },
    });
  }

  const announcement = await prisma.announcement.create({
    data: {
      cohortId: cohort.id,
      authorId: session.user.id,
      title,
      body,
    },
  });

  return NextResponse.json({ success: true, announcement });
}
