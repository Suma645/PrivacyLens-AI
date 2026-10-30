// API Client for SnapShield Backend

const rawBase = import.meta.env.VITE_API_BASE_URL || '';
const API_BASE_URL = rawBase.endsWith('/') ? rawBase.slice(0, -1) : rawBase;

export async function checkBackendHealth() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("Backend health check failed:", err.message);
    return null;
  }
}

export async function analyzeScreenshot(file, clientOcrTokens = []) {
  const formData = new FormData();
  formData.append('screenshot', file);
  
  if (clientOcrTokens && clientOcrTokens.length > 0) {
    formData.append('client_ocr_tokens', JSON.stringify(clientOcrTokens));
  }

  const res = await fetch(`${API_BASE_URL}/api/analyze`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to analyze screenshot (HTTP ${res.status})`);
  }

  return await res.json();
}

export async function updateProtection(fileId, detections, manualBoxes = []) {
  const res = await fetch(`${API_BASE_URL}/api/protect`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      file_id: fileId,
      detections,
      manual_boxes: manualBoxes,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to update protection (HTTP ${res.status})`);
  }

  return await res.json();
}

export function getDownloadUrl(fileId, format = 'png') {
  return `${API_BASE_URL}/api/download/${fileId}?format=${format}`;
}
