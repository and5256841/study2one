import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendInactivityAlert } from "@/lib/email";
import { sendPushToUser } from "@/lib/push";

// Called daily at 9 AM COT to alert inactive students
export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  if (key !== process.env.CRON_SECRET && key !== "dev-cron-key") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  // Find students inactive for 3+ days
  const inactiveStudents = await prisma.user.findMany({
    where: {
      role: "STUDENT",
      enrollmentStatus: "APPROVED",
      isActive: true,
      streak: {
        OR: [
          { lastActivityDate: { lt: threeDaysAgo } },
          { lastActivityDate: null },
        ],
      },
    },
    include: { streak: true },
  });

  let emailsSent = 0;
  let pushSent = 0;

  for (const student of inactiveStudents) {
    const daysMissed = student.streak?.lastActivityDate
      ? Math.floor((Date.now() - student.streak.lastActivityDate.getTime()) / (1000 * 60 * 60 * 24))
      : 7;

    // Send email
    try {
      await sendInactivityAlert(student.email, {
        name: student.fullName.split(" ")[0],
        daysMissed,
        streak: student.streak?.currentStreak || 0,
      });
      emailsSent++;
    } catch (e) {
      console.error(`Email failed for ${student.email}:`, e);
    }

    // Send push
    try {
      await sendPushToUser(
        student.id,
        "Te extrañamos! 📚",
        `Llevas ${daysMissed} dias sin estudiar. Solo 15 min hoy!`
      );
      pushSent++;
    } catch (e) {
      console.error(`Push failed for ${student.id}:`, e);
    }
  }

  return NextResponse.json({
    success: true,
    inactiveCount: inactiveStudents.length,
    emailsSent,
    pushSent,
    timestamp: new Date().toISOString(),
  });
}
