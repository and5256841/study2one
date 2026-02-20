import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getModuleForDay, getDayInModule, getStudentCurrentDay, TOTAL_DAYS } from "@/lib/student-day";
import fs from "fs";
import path from "path";

export async function POST(
  req: NextRequest,
  { params }: { params: { dayId: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const globalDay = parseInt(params.dayId);
  if (isNaN(globalDay) || globalDay < 1 || globalDay > TOTAL_DAYS) {
    return NextResponse.json({ error: "Día inválido" }, { status: 400 });
  }

  // Future day access control (skip for coordinators/clients)
  if (session.user.role === "STUDENT") {
    const studentDayInfo = await getStudentCurrentDay(session.user.id);
    if (studentDayInfo && globalDay > studentDayInfo.dayNumber) {
      return NextResponse.json(
        { error: "No tienes acceso a este día aún" },
        { status: 403 }
      );
    }
  }

  const moduleInfo = getModuleForDay(globalDay);
  const dayNumber = getDayInModule(globalDay);

  try {
    const formData = await req.formData();
    const file = formData.get("photo") as File | null;
    const photoType = (formData.get("photoType") as string) || "STUDY_EVIDENCE";

    if (!file) {
      return NextResponse.json({ error: "No se recibió archivo" }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Solo se permiten imágenes" }, { status: 400 });
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "La imagen no debe superar 5MB" }, { status: 400 });
    }

    // Find daily content using correct module mapping
    const dailyContent = await prisma.dailyContent.findFirst({
      where: { dayNumber, module: { number: moduleInfo.number } },
    });

    if (!dailyContent) {
      return NextResponse.json({ error: "Contenido no encontrado" }, { status: 404 });
    }

    // Save locally (in production, upload to Cloudinary)
    const uploadsDir = path.join(process.cwd(), "uploads", session.user.id);
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const ext = file.name.split(".").pop() || "jpg";
    const fileName = `day-${dayNumber}-${Date.now()}.${ext}`;
    const filePath = path.join(uploadsDir, fileName);

    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    // Save to database
    const photoUrl = `/api/photos/${dayNumber}/file/${fileName}`;

    const validTypes = ["CUADERNILLO", "MIND_MAP", "NOTES", "OTHER"] as const;
    const resolvedType = validTypes.includes(photoType as typeof validTypes[number])
      ? (photoType as typeof validTypes[number])
      : "OTHER";

    await prisma.photoUpload.create({
      data: {
        studentId: session.user.id,
        dailyContentId: dailyContent.id,
        photoUrl,
        photoType: resolvedType,
      },
    });

    return NextResponse.json({
      success: true,
      photoUrl,
      message: "Foto subida exitosamente",
    });
  } catch (error) {
    console.error("Photo upload error:", error);
    return NextResponse.json({ error: "Error al subir la foto" }, { status: 500 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { dayId: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const globalDay = parseInt(params.dayId);
  if (isNaN(globalDay) || globalDay < 1 || globalDay > TOTAL_DAYS) {
    return NextResponse.json({ photos: [] });
  }

  // Future day access control (skip for coordinators/clients)
  if (session.user.role === "STUDENT") {
    const studentDayInfo = await getStudentCurrentDay(session.user.id);
    if (studentDayInfo && globalDay > studentDayInfo.dayNumber) {
      return NextResponse.json(
        { error: "No tienes acceso a este día aún" },
        { status: 403 }
      );
    }
  }

  const moduleInfo = getModuleForDay(globalDay);
  const dayInModule = getDayInModule(globalDay);

  const dailyContent = await prisma.dailyContent.findFirst({
    where: { dayNumber: dayInModule, module: { number: moduleInfo.number } },
  });

  if (!dailyContent) {
    return NextResponse.json({ photos: [] });
  }

  const photos = await prisma.photoUpload.findMany({
    where: {
      studentId: session.user.id,
      dailyContentId: dailyContent.id,
    },
    orderBy: { uploadedAt: "desc" },
  });

  return NextResponse.json({ photos });
}
