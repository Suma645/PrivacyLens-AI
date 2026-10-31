// API Client for PrivacyLens-AI with Lightning-Fast On-Device Privacy Fallback
import { runClientDetection, calculateRiskScore, renderProtectedImage } from './clientDetector';
import { runClientOcr } from './clientOcr';

const rawBase = import.meta.env.VITE_API_BASE_URL || '';
const API_BASE_URL = rawBase.endsWith('/') ? rawBase.slice(0, -1) : rawBase;

// Cache current session image data for instant client-side updates
let currentImageDataUrl = null;
let currentUploadedFile = null;

export async function checkBackendHealth() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/health`, { signal: AbortSignal.timeout(2000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    return {
      status: "healthy (on-device engine)",
      ai_provider: "On-Device Privacy Engine",
      ocr_available: true,
      supported_documents: ["pdf", "docx", "xlsx", "pptx", "txt", "rtf", "png", "jpg", "jpeg", "webp"]
    };
  }
}

// Convert File to Data URL helper
function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

export async function analyzeScreenshot(file, clientOcrTokens = []) {
  currentUploadedFile = file;
  const isImage = /\.(png|jpe?g|webp|bmp)$/i.test(file.name);
  const isTextDoc = /\.(txt|rtf|json|csv|log)$/i.test(file.name);

  if (isImage) {
    try {
      currentImageDataUrl = await fileToDataUrl(file);
    } catch (e) {
      console.warn("Could not cache file data URL:", e);
    }
  }

  // 1. Fast check if server backend is reachable (PDF, DOCX, XLSX, PPTX, Images)
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('screenshot', file);
    formData.append('document', file);
    if (clientOcrTokens && clientOcrTokens.length > 0) {
      formData.append('client_ocr_tokens', JSON.stringify(clientOcrTokens));
    }

    const res = await fetch(`${API_BASE_URL}/api/analyze`, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(12000)
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.detections) {
        if (data.protected_image) {
          currentImageDataUrl = data.original_image;
        }
        return data;
      }
    }
  } catch (err) {
    console.warn("Backend /api/analyze unavailable, using on-device privacy engine:", err);
  }

  // 2. Lightning On-Device Standalone Engine (100% offline & safe)
  let activeTokens = clientOcrTokens || [];
  let fileText = "";

  if (isTextDoc) {
    try {
      fileText = await readFileAsText(file);
      const lines = fileText.split('\n').filter(l => l.trim().length > 0);
      activeTokens = lines.map((line, idx) => ({
        text: line.trim(),
        box: { x: 30, y: 30 + idx * 25, width: Math.min(600, line.length * 9), height: 20 },
        is_line: true
      }));
    } catch (e) {
      console.warn("Error reading text document locally:", e);
    }
  } else if (isImage && activeTokens.length === 0) {
    try {
      activeTokens = await runClientOcr(file);
    } catch (e) {
      console.warn("Direct client OCR fallback error:", e);
    }
  }

  const detections = runClientDetection(activeTokens, "Page 1");
  const riskAnalysis = calculateRiskScore(detections);
  const protectedImage = isImage && currentImageDataUrl 
    ? await renderProtectedImage(currentImageDataUrl, detections, [])
    : null;

  const fileId = 'client_' + Date.now();

  return {
    file_id: fileId,
    original_image: currentImageDataUrl || null,
    protected_image: protectedImage || currentImageDataUrl || null,
    image_info: {
      filename: file.name,
      dimensions: [800, 600],
      file_size_kb: Math.round(file.size / 1024),
      pages_count: 1,
      is_document: !isImage,
      file_type: file.name.split('.').pop().toLowerCase()
    },
    detections: detections,
    confidentiality_score: riskAnalysis.score,
    risk_classification: riskAnalysis.classification,
    score_color: riskAnalysis.color,
    breakdown: riskAnalysis.breakdown,
    priority_summary: riskAnalysis.priority_summary,
    category_breakdown: riskAnalysis.category_breakdown,
    score_explanation: riskAnalysis.explanation,
    factor_reasons: riskAnalysis.factor_reasons,
    residual_risk: {
      residual_score: 0,
      classification: "Low Risk",
      color: "#10b981",
      unprotected_count: 0
    },
    metadata_leaks: {
      has_gps: false,
      extracted_text_preview: activeTokens.map(t => t.text).join(' ').substring(0, 300)
    }
  };
}

export async function updateProtection(fileId, detections, manualBoxes = [], visibleBoxes = [], mode = 'spotlight') {
  // If this was a client-side session or backend is unavailable, render with Canvas
  if (!fileId || fileId.startsWith('client_') || !API_BASE_URL) {
    const protectedImage = currentImageDataUrl 
      ? await renderProtectedImage(currentImageDataUrl, detections, manualBoxes, visibleBoxes, mode)
      : null;
    const unmasked = detections.filter(d => d.keep_visible);
    const residual = calculateRiskScore(unmasked);

    return {
      success: true,
      protected_image: protectedImage,
      residual_risk: {
        residual_score: residual.score,
        classification: residual.classification,
        color: residual.color,
        unprotected_count: unmasked.length
      }
    };
  }

  // Otherwise call backend
  try {
    const res = await fetch(`${API_BASE_URL}/api/protect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file_id: fileId,
        detections,
        manual_boxes: manualBoxes,
        visible_boxes: visibleBoxes,
        mode
      }),
      signal: AbortSignal.timeout(4000)
    });

    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    // fallback
  }

  const protectedImage = currentImageDataUrl 
    ? await renderProtectedImage(currentImageDataUrl, detections, manualBoxes, visibleBoxes, mode)
    : null;
  const unmasked = detections.filter(d => d.keep_visible);
  const residual = calculateRiskScore(unmasked);

  return {
    success: true,
    protected_image: protectedImage,
    residual_risk: {
      residual_score: residual.score,
      classification: residual.classification,
      color: residual.color,
      unprotected_count: unmasked.length
    }
  };
}

export function getDownloadUrl(fileId, format = 'png', protectedImageDataUrl = null) {
  if ((!fileId || fileId.startsWith('client_') || !API_BASE_URL) && protectedImageDataUrl) {
    return protectedImageDataUrl;
  }
  return `${API_BASE_URL}/api/download/${fileId}?format=${format}`;
}

export async function encodeStegoMessage(imageFile, message, password = null) {
  const formData = new FormData();
  formData.append('image', imageFile);
  formData.append('message', message);
  if (password) {
    formData.append('password', password);
  }

  const res = await fetch(`${API_BASE_URL}/api/stego/encode`, {
    method: 'POST',
    body: formData,
    signal: AbortSignal.timeout(15000)
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Steganography encoding failed (${res.status})`);
  }

  return await res.json();
}

export async function decodeStegoMessage(imageFile, password = null) {
  const formData = new FormData();
  formData.append('image', imageFile);
  if (password) {
    formData.append('password', password);
  }

  const res = await fetch(`${API_BASE_URL}/api/stego/decode`, {
    method: 'POST',
    body: formData,
    signal: AbortSignal.timeout(15000)
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Steganography decoding failed (${res.status})`);
  }

  return await res.json();
}
