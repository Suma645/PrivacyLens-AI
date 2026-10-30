// API Client for Privacy Lens AI Backend with Seamless On-Device Privacy Fallback
import { runClientDetection, calculateRiskScore, renderProtectedImage } from './clientDetector';

const rawBase = import.meta.env.VITE_API_BASE_URL || '';
const API_BASE_URL = rawBase.endsWith('/') ? rawBase.slice(0, -1) : rawBase;

// Cache current session image data for instant client-side updates
let currentImageDataUrl = null;

export async function checkBackendHealth() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/health`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("Backend offline or unreachable, using on-device privacy engine:", err.message);
    return {
      status: "healthy (on-device engine)",
      ai_provider: "On-Device Privacy Engine",
      ocr_available: true
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

export async function analyzeScreenshot(file, clientOcrTokens = []) {
  // Save local data URL for client fallback
  try {
    currentImageDataUrl = await fileToDataUrl(file);
  } catch (e) {
    console.warn("Could not cache file data URL:", e);
  }

  // 1. Try server backend first if configured/available
  try {
    const formData = new FormData();
    formData.append('screenshot', file);
    
    if (clientOcrTokens && clientOcrTokens.length > 0) {
      formData.append('client_ocr_tokens', JSON.stringify(clientOcrTokens));
    }

    const res = await fetch(`${API_BASE_URL}/api/analyze`, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(30000)
    });

    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch (err) {
    console.warn("Backend API unavailable or timed out. Falling back to On-Device Privacy Engine:", err);
  }

  // 2. On-Device Standalone Fallback (100% works on phone, airplane mode, or Vercel static)
  const detections = runClientDetection(clientOcrTokens);
  const riskAnalysis = calculateRiskScore(detections);
  const protectedImage = await renderProtectedImage(currentImageDataUrl, detections, []);

  const fileId = 'client_' + Date.now();

  return {
    file_id: fileId,
    original_image: currentImageDataUrl,
    protected_image: protectedImage,
    image_info: {
      filename: file.name,
      dimensions: [800, 600],
      file_size_kb: Math.round(file.size / 1024)
    },
    detections: detections,
    confidentiality_score: riskAnalysis.score,
    risk_classification: riskAnalysis.classification,
    score_color: riskAnalysis.color,
    breakdown: riskAnalysis.breakdown,
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
      extracted_text_preview: clientOcrTokens.map(t => t.text).join(' ').substring(0, 300)
    }
  };
}

export async function updateProtection(fileId, detections, manualBoxes = [], visibleBoxes = [], mode = 'spotlight') {
  // If this was a client-side session or backend is unavailable, render with Canvas
  if (!fileId || fileId.startsWith('client_')) {
    const protectedImage = await renderProtectedImage(currentImageDataUrl, detections, manualBoxes, visibleBoxes, mode);
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
      signal: AbortSignal.timeout(5000)
    });

    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn("Server update failed, falling back to on-device canvas redactor:", err);
  }

  // Fallback to canvas
  const protectedImage = await renderProtectedImage(currentImageDataUrl, detections, manualBoxes, visibleBoxes, mode);
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
  if (fileId && fileId.startsWith('client_') && protectedImageDataUrl) {
    return protectedImageDataUrl;
  }
  return `${API_BASE_URL}/api/download/${fileId}?format=${format}`;
}
