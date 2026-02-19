import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

/** PATCH /api/coordinator/students/[studentId]/photos/[photoId] — Approve photo */
export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ studentId: string; photoId: string }> }
) {
  const session = await auth();
  if (!session?.user?.role || session.user.role !== "COORDINATOR") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { studentId, photoId } = await params;

  const photo = await prisma.photoUpload.findUnique({
    where: { id: photoId },
  });

  if (!photo || photo.studentId !== studentId) {
    return NextResponse.json({ error: "Foto no encontrada" }, { status: 404 });
  }

  if (photo.isApproved) {
    return NextResponse.json({ error: "Ya fue aprobada" }, { status: 400 });
  }

  // Delete file from disk if it exists
  if (photo.photoUrl) {
    try {
      // photoUrl format: /api/photos/{dayNumber}/file/{fileName}
      const parts = photo.photoUrl.split("/");
      const fileName = parts[parts.length - 1];
      const filePath = path.join(process.cwd(), "uploads", studentId, fileName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      console.error("Error deleting photo file:", err);
      // Continue even if file deletion fails
    }
  }

  // Update record: mark approved, clear URLs
  const updated = await prisma.photoUpload.update({
    where: { id: photoId },
    data: {
      isApproved: true,
      approvedAt: new Date(),
      approvedById: session.user.id,
      photoUrl: null,
      thumbnailUrl: null,
    },
  });

  return NextResponse.json({
    success: true,
    photo: {
      id: updated.id,
      isApproved: true,
      approvedAt: updated.approvedAt,
    },
  });
}
