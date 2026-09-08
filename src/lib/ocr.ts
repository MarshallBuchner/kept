import { PSM, type Worker } from "tesseract.js";
import { scoreReceiptText } from "./classify";

let workerPromise: Promise<Worker> | null = null;

async function getWorker(
  onProgress?: (progress: number) => void,
): Promise<Worker> {
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
  return workerPromise;
}

async function recognizeWithMode(
  worker: Worker,
  image: Blob,
  mode: (typeof PSM)[keyof typeof PSM],
): Promise<string> {
  await worker.setParameters({
    tessedit_pageseg_mode: mode,
    // Keep OCR more consistent across repeated uploads of the same photo.
    user_defined_dpi: "300",
  });
  const { data } = await worker.recognize(image);
  return data.text?.trim() ?? "";
}

export async function readImageText(
  image: Blob,
  onProgress?: (progress: number) => void,
): Promise<string> {
  const worker = await getWorker(onProgress);

  // Two passes: pick the text that looks more like a real receipt.
  // This reduces "different total every time" when one PSM mode flakes.
  const first = await recognizeWithMode(worker, image, PSM.SINGLE_COLUMN);
  const second = await recognizeWithMode(worker, image, PSM.AUTO);
  const best =
    scoreReceiptText(second) > scoreReceiptText(first) ? second : first;
  return best;
}
