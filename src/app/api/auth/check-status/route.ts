import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ status: "NOT_FOUND" });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { role: true, enrollmentStatus: true },
    });

    if (!user || user.role !== "STUDENT") {
      return NextResponse.json({ status: "NOT_FOUND" });
    }

    return NextResponse.json({ status: user.enrollmentStatus });
  } catch {
    return NextResponse.json({ status: "NOT_FOUND" });
  }
}
