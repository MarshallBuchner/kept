import { classify, extractFacts, titleFromText } from "./classify";
import { fileToThumbnail, prepareForOcr } from "./image";
import { readImageText } from "./ocr";
import type { Clip } from "./types";

export async function processImage(
  file: Blob,
  onProgress?: (progress: number) => void,
): Promise<Clip> {
  const [thumbnail, ocrSource] = await Promise.all([fileToThumbnail(file), prepareForOcr(file)]);
  const text = await readImageText(ocrSource, onProgress);
  const cleaned = text || "Could not read text from this screenshot.";
  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    kind: classify(cleaned),
    title: titleFromText(cleaned),
    text: cleaned,
    thumbnail,
    facts: extractFacts(cleaned),
  };
}
