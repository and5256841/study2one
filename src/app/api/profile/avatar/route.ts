import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const AVATAR_STYLES = ["adventurer", "avataaars", "bottts", "fun-emoji", "lorelei", "pixel-art"];
const AVATAR_SEEDS = ["Felix", "Luna", "Max", "Cleo", "Buddy"];

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { avatarSeed: true, avatarStyle: true, pseudonym: true },
  });

  // Generate all avatar options
  const options = AVATAR_STYLES.flatMap((style) =>
    AVATAR_SEEDS.map((seed) => ({
      style,
      seed,
      url: `https://api.dicebear.com/7.x/${style}/svg?seed=${seed}`,
    }))
  );

  return NextResponse.json({
    current: {
      style: user?.avatarStyle || "adventurer",
      seed: user?.avatarSeed || "Felix",
      pseudonym: user?.pseudonym || "",
    },
    options,
    styles: AVATAR_STYLES,
    seeds: AVATAR_SEEDS,
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { style, seed, pseudonym } = await req.json();

  if (!AVATAR_STYLES.includes(style) || !AVATAR_SEEDS.includes(seed)) {
    return NextResponse.json({ error: "Avatar invalido" }, { status: 400 });
  }

  if (pseudonym && (pseudonym.length < 3 || pseudonym.length > 20)) {
    return NextResponse.json({ error: "El seudonimo debe tener entre 3 y 20 caracteres" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      avatarStyle: style,
      avatarSeed: seed,
      pseudonym: pseudonym || undefined,
    },
  });

  return NextResponse.json({ success: true });
}
