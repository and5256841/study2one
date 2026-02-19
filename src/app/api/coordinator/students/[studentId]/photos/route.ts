import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** GET /api/coordinator/students/[studentId]/photos — List student photos */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  const session = await auth();
  if (!session?.user?.role || session.user.role !== "COORDINATOR") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { studentId } = await params;

  const photos = await prisma.photoUpload.findMany({
    where: { studentId },
    include: {
      dailyContent: {
        select: { dayNumber: true, title: true },
      },
    },
    orderBy: { uploadedAt: "desc" },
  });

  return NextResponse.json({
    photos: photos.map((p) => ({
      id: p.id,
      dayNumber: p.dailyContent.dayNumber,
      title: p.dailyContent.title,
      photoUrl: p.photoUrl,
      thumbnailUrl: p.thumbnailUrl,
      photoType: p.photoType,
      uploadedAt: p.uploadedAt,
      isApproved: p.isApproved,
      approvedAt: p.approvedAt,
    })),
  });
}
