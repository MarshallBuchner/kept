import { classify, extractFacts, normalizeOcrText, titleFromText } from "./classify";
import { fileToDataUrl, fileToThumbnail, prepareForOcr } from "./image";
import { readImageText } from "./ocr";
import type { DocCategory, KeptDoc } from "./types";

export async function processImage(
  file: Blob,
  onProgress?: (progress: number) => void,
  preferredCategory?: DocCategory,
): Promise<KeptDoc> {
  const [thumbnail, image, ocrSource] = await Promise.all([
    fileToThumbnail(file),
    fileToDataUrl(file),
    prepareForOcr(file),
  ]);
  const text = normalizeOcrText(await readImageText(ocrSource, onProgress));
  const cleaned = text || "Could not read text from this document.";
  const category = preferredCategory ?? classify(cleaned);
  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    category,
    title: titleFromText(cleaned),
    text: cleaned,
    thumbnail,
    image,
    facts: extractFacts(cleaned),
    tags: [],
    notes: "",
  };
}
