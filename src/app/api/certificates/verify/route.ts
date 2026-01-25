import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "Codigo requerido" }, { status: 400 });
  }

  const certificate = await prisma.certificate.findUnique({
    where: { verificationCode: code },
    include: {
      student: { select: { fullName: true, documentId: true } },
      cohort: { select: { name: true } },
    },
  });

  if (!certificate) {
    return NextResponse.json({ valid: false, error: "Certificado no encontrado" });
  }

  return NextResponse.json({
    valid: true,
    certificate: {
      studentName: certificate.student.fullName,
      cohort: certificate.cohort.name,
      issuedAt: certificate.issuedAt,
      verificationCode: certificate.verificationCode,
    },
  });
}
