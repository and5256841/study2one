/**
 * Cloudinary Configuration for Study2One
 * Used for audio file storage and CDN delivery
 */

import { v2 as cloudinary } from "cloudinary";

// Configurar Cloudinary con variables de entorno
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export { cloudinary };

/**
 * Sube un archivo de audio a Cloudinary
 * @param filePath - Ruta local del archivo MP3
 * @param publicId - ID público para el archivo (ej: "study2one/audio/module-01/dia-01")
 * @returns URL del archivo en Cloudinary
 */
export async function uploadAudio(filePath: string, publicId: string): Promise<string> {
  const result = await cloudinary.uploader.upload(filePath, {
    public_id: publicId,
    resource_type: "video", // Cloudinary usa "video" para audio
    folder: "", // El folder ya está en publicId
    overwrite: true,
    format: "mp3",
  });

  return result.secure_url;
}

/**
 * Genera la URL de un audio en Cloudinary
 * @param publicId - ID público del archivo
 * @returns URL del archivo
 */
export function getAudioUrl(publicId: string): string {
  return cloudinary.url(publicId, {
    resource_type: "video",
    secure: true,
  });
}

/**
 * Elimina un archivo de Cloudinary
 * @param publicId - ID público del archivo
 */
export async function deleteAudio(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId, {
    resource_type: "video",
  });
}
