import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  TWEMOJI_AVATARS,
  getTwemojiUrl,
  isValidTwemojiCode,
  getDefaultTwemoji,
} from "@/lib/twemoji";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { avatarSeed: true, avatarStyle: true, pseudonym: true },
  });

  // Generar opciones de avatares con Twemoji
  const options = TWEMOJI_AVATARS.map((emoji) => ({
    code: emoji.code,
    label: emoji.label,
    category: emoji.category,
    url: getTwemojiUrl(emoji.code),
  }));

  // El avatarSeed ahora guarda el código del emoji
  const currentCode = user?.avatarSeed || getDefaultTwemoji().code;

  return NextResponse.json({
    current: {
      code: currentCode,
      url: getTwemojiUrl(currentCode),
      pseudonym: user?.pseudonym || "",
    },
    options,
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { code, pseudonym } = await req.json();

  // Validar código de emoji
  if (!code || !isValidTwemojiCode(code)) {
    return NextResponse.json({ error: "Avatar invalido" }, { status: 400 });
  }

  // Validar pseudónimo
  if (pseudonym && (pseudonym.length < 3 || pseudonym.length > 20)) {
    return NextResponse.json(
      { error: "El seudonimo debe tener entre 3 y 20 caracteres" },
      { status: 400 }
    );
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      avatarSeed: code,
      avatarStyle: "twemoji", // Marcar que usa el nuevo sistema
      pseudonym: pseudonym || undefined,
    },
  });

  return NextResponse.json({ success: true });
}
