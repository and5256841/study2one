import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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

  const dayNumber = parseInt(params.dayId);

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

    // Find daily content
    const dailyContent = await prisma.dailyContent.findFirst({
      where: { dayNumber },
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

  const dayNumber = parseInt(params.dayId);

  const dailyContent = await prisma.dailyContent.findFirst({
    where: { dayNumber },
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
