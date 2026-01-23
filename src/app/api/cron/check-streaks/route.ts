import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Called daily at 11:59 PM COT to reset broken streaks
// Trigger with: GET /api/cron/check-streaks?key=CRON_SECRET
export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  if (key !== process.env.CRON_SECRET && key !== "dev-cron-key") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  // Find streaks where last activity was before yesterday (broken streak)
  const brokenStreaks = await prisma.streak.findMany({
    where: {
      currentStreak: { gt: 0 },
      lastActivityDate: { lt: yesterday },
    },
  });

  let resetCount = 0;
  for (const streak of brokenStreaks) {
    await prisma.streak.update({
      where: { id: streak.id },
      data: {
        longestStreak: Math.max(streak.longestStreak, streak.currentStreak),
        currentStreak: 0,
      },
    });
    resetCount++;
  }

  return NextResponse.json({
    success: true,
    checked: brokenStreaks.length,
    reset: resetCount,
    timestamp: new Date().toISOString(),
  });
}
