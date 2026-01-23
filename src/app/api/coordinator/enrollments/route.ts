import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "COORDINATOR") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const pending = await prisma.user.findMany({
    where: { role: "STUDENT", enrollmentStatus: "PENDING" },
    select: {
      id: true,
      fullName: true,
      email: true,
      university: true,
      phone: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ pending });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "COORDINATOR") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { studentId, action } = await req.json();

  if (!studentId || !["APPROVED", "REJECTED"].includes(action)) {
    return NextResponse.json({ error: "Datos invalidos" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: studentId },
    data: {
      enrollmentStatus: action,
      approvedById: action === "APPROVED" ? session.user.id : undefined,
      approvedAt: action === "APPROVED" ? new Date() : undefined,
    },
  });

  return NextResponse.json({ success: true });
}
