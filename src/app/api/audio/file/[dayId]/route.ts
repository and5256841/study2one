import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(
  req: NextRequest,
  { params }: { params: { dayId: string } }
) {
  const { dayId } = params;
  const dayNumber = parseInt(dayId);

  if (isNaN(dayNumber) || dayNumber < 1 || dayNumber > 120) {
    return NextResponse.json({ error: "Invalid day" }, { status: 400 });
  }

  // For now, all days are in module-01. Later this will use the database.
  const moduleNumber = dayNumber <= 15 ? 1 : Math.ceil(dayNumber / 15);
  const fileName = `day-${String(dayNumber).padStart(2, "0")}.mp3`;
  const audioPath = path.join(
    process.cwd(),
    "audio-output",
    `module-${String(moduleNumber).padStart(2, "0")}`,
    fileName
  );

  if (!fs.existsSync(audioPath)) {
    return NextResponse.json({ error: "Audio not found" }, { status: 404 });
  }

  const stat = fs.statSync(audioPath);
  const fileBuffer = fs.readFileSync(audioPath);

  return new NextResponse(fileBuffer, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Length": stat.size.toString(),
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
