// Client-side OCR Service using Tesseract.js WebAssembly
import { createWorker } from 'tesseract.js';

let workerInstance = null;
let initializingPromise = null;

async function getWorker(onProgress = null) {
  if (workerInstance) return workerInstance;
  if (initializingPromise) return initializingPromise;

  initializingPromise = (async () => {
    try {
      const worker = await createWorker('eng', 1, {
        logger: (m) => {
          if (onProgress && m.status === 'recognizing text' && m.progress !== undefined) {
            onProgress(m.progress);
          }
        }
      });
      workerInstance = worker;
      return worker;
    } catch (err) {
      console.warn("Tesseract.js worker initialization failed:", err);
      initializingPromise = null;
      return null;
    }
  })();

  return initializingPromise;
}

if (typeof window !== 'undefined') {
  setTimeout(() => {
    getWorker().catch(() => {});
  }, 1000);
}

export async function runClientOcr(imageFileOrBlob, onProgress = null) {
  try {
    const worker = await getWorker(onProgress);
    if (!worker) return [];

    const ret = await worker.recognize(imageFileOrBlob);
    const tokens = [];

    // 1. Extract full lines with bounding boxes (critical for Aadhaar, Bank A/C, Marks)
    const lines = ret.data.lines || [];
    for (const l of lines) {
      const txt = (l.text || '').trim();
      if (txt.length > 0 && l.bbox) {
        tokens.push({
          text: txt,
          box: {
            x: Math.round(l.bbox.x0),
            y: Math.round(l.bbox.y0),
            width: Math.max(12, Math.round(l.bbox.x1 - l.bbox.x0)),
            height: Math.max(12, Math.round(l.bbox.y1 - l.bbox.y0))
          },
          conf: (l.confidence || 90) / 100.0,
          is_line: true
        });
      }
    }

    // 2. Extract individual words
    const words = ret.data.words || [];
    for (const w of words) {
      const txt = (w.text || '').trim();
      if (txt.length > 0 && w.bbox) {
        tokens.push({
          text: txt,
          box: {
            x: Math.round(w.bbox.x0),
            y: Math.round(w.bbox.y0),
            width: Math.max(8, Math.round(w.bbox.x1 - w.bbox.x0)),
            height: Math.max(8, Math.round(w.bbox.y1 - w.bbox.y0))
          },
          conf: (w.confidence || 85) / 100.0
        });
      }
    }

    return tokens;
  } catch (err) {
    console.warn("Client OCR execution encountered error:", err);
    return [];
  }
}
