import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MESSAGE_TEMPLATES, fillTemplate } from "@/lib/message-templates";

/** POST /api/coordinator/students/[studentId]/message — Send message */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  const session = await auth();
  if (!session?.user?.role || session.user.role !== "COORDINATOR") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { studentId } = await params;
  const body = await req.json();
  const { templateKey, customTitle, customBody, variables } = body;

  if (!templateKey) {
    return NextResponse.json(
      { error: "templateKey es requerido" },
      { status: 400 }
    );
  }

  // Verify student exists
  const student = await prisma.user.findUnique({
    where: { id: studentId, role: "STUDENT" },
    select: { id: true, fullName: true },
  });
  if (!student) {
    return NextResponse.json(
      { error: "Estudiante no encontrado" },
      { status: 404 }
    );
  }

  let title: string;
  let notifBody: string;

  if (templateKey === "custom") {
    if (!customTitle || !customBody) {
      return NextResponse.json(
        { error: "Título y cuerpo son requeridos para mensaje libre" },
        { status: 400 }
      );
    }
    title = customTitle;
    notifBody = customBody;
  } else {
    const template = MESSAGE_TEMPLATES.find((t) => t.key === templateKey);
    if (!template) {
      return NextResponse.json(
        { error: "Plantilla no encontrada" },
        { status: 400 }
      );
    }

    const vars = {
      name: student.fullName.split(" ")[0],
      ...variables,
    };

    title = fillTemplate(template.title, vars);
    notifBody = fillTemplate(template.body, vars);
  }

  const notification = await prisma.notification.create({
    data: {
      userId: studentId,
      senderId: session.user.id,
      title,
      body: notifBody,
      type: "COORDINATOR_MESSAGE",
      templateKey,
    },
  });

  return NextResponse.json({ success: true, notificationId: notification.id });
}
