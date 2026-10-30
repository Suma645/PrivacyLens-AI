// Client-side OCR Service using Tesseract.js WebAssembly
import { createWorker } from 'tesseract.js';

let workerPromise = null;

async function getWorker() {
  if (!workerPromise) {
    workerPromise = (async () => {
      try {
        const worker = await createWorker('eng');
        return worker;
      } catch (err) {
        console.warn("Failed to initialize Tesseract.js worker:", err);
        workerPromise = null;
        return null;
      }
    })();
  }
  return workerPromise;
}

export async function runClientOcr(imageFileOrBlob, onProgress = null) {
  try {
    const worker = await getWorker();
    if (!worker) return [];

    const ret = await worker.recognize(imageFileOrBlob);
    const words = ret.data.words || [];

    const tokens = words.map(w => ({
      text: w.text,
      box: {
        x: Math.round(w.bbox.x0),
        y: Math.round(w.bbox.y0),
        width: Math.max(8, Math.round(w.bbox.x1 - w.bbox.x0)),
        height: Math.max(8, Math.round(w.bbox.y1 - w.bbox.y0))
      },
      conf: w.confidence / 100.0
    }));

    return tokens;
  } catch (err) {
    console.warn("Client OCR execution encountered non-fatal error:", err);
    return [];
  }
}
