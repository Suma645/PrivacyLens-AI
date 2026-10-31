// Client-side OCR Service using Tesseract.js WebAssembly
// Configured for Tesseract.js v5/v6/v7 with blocks extraction and text fallback
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
  }, 300);
}

export async function runClientOcr(imageFileOrBlob, onProgress = null) {
  if (!imageFileOrBlob) return [];

  // Guard: Only process image formats in Tesseract. Documents (PDF, DOCX, XLSX, TXT) skip OCR
  const filename = imageFileOrBlob.name || '';
  const fileType = imageFileOrBlob.type || '';
  const isImage = fileType.startsWith('image/') || /\.(png|jpe?g|webp|bmp|gif|tiff?)$/i.test(filename);
  if (filename && !isImage) {
    return [];
  }

  try {
    const worker = await getWorker(onProgress);
    if (!worker) return [];

    // Critical for Tesseract.js v5/v6/v7: Pass { blocks: true } so layout tree is generated
    const ret = await worker.recognize(imageFileOrBlob, {}, { blocks: true, text: true });
    const tokens = [];

    // 1. Extract from layout blocks (paragraphs -> lines -> words)
    if (ret.data && ret.data.blocks) {
      for (const b of ret.data.blocks) {
        if (!b.paragraphs) continue;
        for (const p of b.paragraphs) {
          if (!p.lines) continue;
          for (const l of p.lines) {
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

            if (l.words) {
              for (const w of l.words) {
                const wTxt = (w.text || '').trim();
                if (wTxt.length > 0 && w.bbox) {
                  tokens.push({
                    text: wTxt,
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
            }
          }
        }
      }
    }

    // 2. Fallback: If blocks were empty, extract directly from ret.data.lines / words
    if (tokens.length === 0 && ret.data) {
      const directLines = ret.data.lines || [];
      for (const l of directLines) {
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
            is_line: true
          });
        }
      }

      const directWords = ret.data.words || [];
      for (const w of directWords) {
        const txt = (w.text || '').trim();
        if (txt.length > 0 && w.bbox) {
          tokens.push({
            text: txt,
            box: {
              x: Math.round(w.bbox.x0),
              y: Math.round(w.bbox.y0),
              width: Math.max(8, Math.round(w.bbox.x1 - w.bbox.x0)),
              height: Math.max(8, Math.round(w.bbox.y1 - w.bbox.y0))
            }
          });
        }
      }
    }

    // 3. Ultimate Fallback: Parse raw text stream if bounding boxes were unavailable
    if (tokens.length === 0 && ret.data && ret.data.text) {
      const rawLines = ret.data.text.split('\n').map(l => l.trim()).filter(Boolean);
      for (let i = 0; i < rawLines.length; i++) {
        const lineText = rawLines[i];
        tokens.push({
          text: lineText,
          box: { x: 30, y: 30 + i * 40, width: 250, height: 35 },
          is_line: true
        });

        const words = lineText.split(/\s+/).filter(Boolean);
        for (let j = 0; j < words.length; j++) {
          tokens.push({
            text: words[j],
            box: { x: 30 + j * 60, y: 30 + i * 40, width: 55, height: 30 }
          });
        }
      }
    }

    return tokens;
  } catch (err) {
    console.warn("Client OCR execution encountered error:", err);
    return [];
  }
}
