import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { MultipartFile } from "@fastify/multipart";

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const maxFileSize = 10 * 1024 * 1024;
export const uploadsDir = path.resolve(process.cwd(), "apps/api/uploads");

export async function saveUpload(file: MultipartFile) {
  if (!allowedMimeTypes.has(file.mimetype)) {
    throw new Error("Tipo de arquivo nao permitido.");
  }

  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of file.file) {
    size += chunk.length;
    if (size > maxFileSize) throw new Error("Arquivo maior que 10MB.");
    chunks.push(chunk);
  }

  await mkdir(uploadsDir, { recursive: true });
  const safeName = file.filename.replace(/[^\w.-]/g, "_");
  const storedName = `${Date.now()}-${Math.random().toString(16).slice(2)}-${safeName}`;
  const relativePath = storedName;
  const target = path.join(uploadsDir, storedName);
  await pipeline(Readable.from(Buffer.concat(chunks)), createWriteStream(target));

  return {
    originalName: file.filename,
    filePath: relativePath,
    mimeType: file.mimetype,
    size
  };
}
