import type { Worker } from "tesseract.js";

let workerPromise: Promise<Worker> | null = null;

export async function readImageText(
  image: Blob,
  onProgress?: (progress: number) => void,
): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  if (!workerPromise) {
    workerPromise = createWorker("eng", 1, {
      logger: (message) => {
        if (message.status === "recognizing text" && typeof message.progress === "number") {
          onProgress?.(message.progress);
        }
      },
    });
  }
  const worker = await workerPromise;
  await worker.setParameters({ tessedit_pageseg_mode: "4" });
  const { data } = await worker.recognize(image);
  return data.text?.trim() ?? "";
}
