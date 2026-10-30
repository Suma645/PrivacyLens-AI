// Client-side Sensitive Data Detection & Canvas Redactor
// Provides 100% offline, on-device privacy analysis when backend is unavailable

export function luhnCheck(cardStr) {
  const digits = (cardStr.match(/\d/g) || []).map(Number);
  if (digits.length < 13 || digits.length > 19) return false;
  let checksum = 0;
  const reversed = digits.reverse();
  for (let i = 0; i < reversed.length; i++) {
    let d = reversed[i];
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    checksum += d;
  }
  return checksum % 10 === 0;
}

const PATTERNS = [
  // Authentication
  {
    category: "Authentication Information",
    type: "Private Key",
    regex: /-----BEGIN (?:RSA|EC|OPENSSH|DSA|PRIVATE) KEY-----/i,
    severity: "Critical",
    confidence: 0.99,
    action: "Solid Blackout",
    explanation: "Cryptographic private key detected. Exposure allows complete impersonation."
  },
  {
    category: "Authentication Information",
    type: "AWS Access Key",
    regex: /\bAKIA[0-9A-Z]{16}\b/,
    severity: "Critical",
    confidence: 0.98,
    action: "Solid Blackout",
    explanation: "Amazon Web Services (AWS) Access Key ID detected."
  },
  {
    category: "Authentication Information",
    type: "GitHub Token",
    regex: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{36,40}\b|\bgithub_pat_[A-Za-z0-9_]{82}\b/,
    severity: "Critical",
    confidence: 0.99,
    action: "Solid Blackout",
    explanation: "GitHub Personal Access Token detected."
  },
  {
    category: "Authentication Information",
    type: "API Key / Token",
    regex: /\b(?:api[_-]?key|secret[_-]?key|auth[_-]?token|bearer)[\s:=]+['"]?([A-Za-z0-9\-_]{16,64})['"]?/i,
    severity: "Critical",
    confidence: 0.95,
    action: "Solid Blackout",
    explanation: "Production API Key or Secret detected."
  },
  {
    category: "Authentication Information",
    type: "Password / Credential",
    regex: /\b(?:password|passwd|pwd|passcode)[\s:=]+['"]?([^\s,;'"<>()]{4,32})['"]?/i,
    severity: "Critical",
    confidence: 0.94,
    action: "Solid Blackout",
    explanation: "Plaintext password detected."
  },
  {
    category: "Authentication Information",
    type: "One-Time Password (OTP)",
    regex: /\b(?:otp|verification code|security code|2fa)[\s:is]+(\d{4,8})\b/i,
    severity: "Critical",
    confidence: 0.95,
    action: "Solid Blackout",
    explanation: "Time-based authentication code detected."
  },

  // Financial
  {
    category: "Financial Information",
    type: "Credit / Debit Card",
    regex: /\b(?:\d{4}[ -]?\d{4}[ -]?\d{4}[ -]?\d{1,4}|\d{4}[ -]?\d{6}[ -]?\d{5})\b/,
    severity: "Critical",
    confidence: 0.96,
    action: "Solid Blackout",
    explanation: "Payment card number detected.",
    validate: (match) => luhnCheck(match)
  },
  {
    category: "Financial Information",
    type: "Card CVV Code",
    regex: /\b(?:cvv|cvc|security code)[\s:=]+(\d{3,4})\b/i,
    severity: "Critical",
    confidence: 0.97,
    action: "Solid Blackout",
    explanation: "Card security code (CVV) detected."
  },
  {
    category: "Financial Information",
    type: "Bank Account / IBAN",
    regex: /\b(?:iban|account|acct)[\s:#-]+([A-Z0-9]{8,34})\b/i,
    severity: "High",
    confidence: 0.90,
    action: "Pixelate",
    explanation: "Bank account or international identifier detected."
  },

  // Personal Information
  {
    category: "Personal Information",
    type: "Email Address",
    regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/,
    severity: "Medium",
    confidence: 0.98,
    action: "Gaussian Blur",
    explanation: "Personal or corporate email address detected."
  },
  {
    category: "Personal Information",
    type: "Phone Number",
    regex: /(?<!\w)(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}(?!\w)/,
    severity: "Medium",
    confidence: 0.92,
    action: "Gaussian Blur",
    explanation: "Direct telephone contact number detected."
  },

  // Identity Information
  {
    category: "Identity Information",
    type: "Aadhaar / SSN / National ID",
    regex: /\b\d{4}\s\d{4}\s\d{4}\b|\b\d{3}-\d{2}-\d{4}\b|\b[A-Z]{5}\d{4}[A-Z]\b/,
    severity: "Critical",
    confidence: 0.96,
    action: "Solid Blackout",
    explanation: "Government-issued identity number detected."
  },

  // Confidential Information
  {
    category: "Confidential Information",
    type: "Confidential Watermark / Label",
    regex: /\b(?:confidential|strictly private|do not share|internal only|proprietary|nda protected)\b/i,
    severity: "High",
    confidence: 0.95,
    action: "Gaussian Blur",
    explanation: "Confidentiality designation marker detected."
  }
];

export function runClientDetection(tokens) {
  const detections = [];
  const fullText = tokens.map(t => t.text).join(' ');

  // For each pattern, find matches in fullText or token by token
  for (const pat of PATTERNS) {
    let match;
    const globalRegex = new RegExp(pat.regex.source, pat.regex.flags.includes('g') ? pat.regex.flags : pat.regex.flags + 'g');

    while ((match = globalRegex.exec(fullText)) !== null) {
      const matchedText = match[0];
      if (pat.validate && !pat.validate(matchedText)) {
        continue;
      }

      // Find tokens that correspond to this match index range
      const matchStart = match.index;
      const matchEnd = matchStart + matchedText.length;

      let currentPos = 0;
      const matchedTokens = [];

      for (const t of tokens) {
        const tokenStart = currentPos;
        const tokenEnd = currentPos + t.text.length;
        currentPos = tokenEnd + 1; // plus space

        if (tokenStart < matchEnd && tokenEnd > matchStart) {
          matchedTokens.push(t);
        }
      }

      // Bounding box: union of matched token boxes
      let box = { x: 50, y: 50, width: 200, height: 40 };
      if (matchedTokens.length > 0) {
        const xMin = Math.min(...matchedTokens.map(t => t.box.x));
        const yMin = Math.min(...matchedTokens.map(t => t.box.y));
        const xMax = Math.max(...matchedTokens.map(t => t.box.x + t.box.width));
        const yMax = Math.max(...matchedTokens.map(t => t.box.y + t.box.height));
        box = {
          x: xMin,
          y: yMin,
          width: Math.max(10, xMax - xMin),
          height: Math.max(10, yMax - yMin)
        };
      }

      const id = 'det_' + Math.random().toString(36).substring(2, 9);
      detections.push({
        id,
        category: pat.category,
        factor_type: pat.type,
        text: matchedText,
        risk_severity: pat.severity,
        confidence: pat.confidence,
        recommended_action: pat.action,
        protection_style: pat.action.toLowerCase().includes('blackout') ? 'blackout' : pat.action.toLowerCase().includes('pixel') ? 'pixelate' : 'blur',
        keep_visible: false,
        bounding_box: box,
        explanation: pat.explanation
      });
    }
  }

  // Deduplicate overlapping detections of same text
  const uniqueDetections = [];
  const seen = new Set();
  for (const d of detections) {
    const key = `${d.category}_${d.text}_${d.bounding_box.x}_${d.bounding_box.y}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueDetections.push(d);
    }
  }

  return uniqueDetections;
}

export function calculateRiskScore(detections) {
  if (!detections || detections.length === 0) {
    return {
      score: 0,
      classification: "Low Risk",
      color: "#10b981",
      total_items: 0,
      breakdown: { Critical: 0, High: 0, Medium: 0, Low: 0 },
      category_breakdown: {},
      explanation: "No sensitive data patterns found. Keep visible or manually redact if desired.",
      factor_reasons: ["No sensitive credentials found"]
    };
  }

  const weights = { Critical: 35, High: 20, Medium: 10, Low: 5 };
  const mults = {
    "Authentication Information": 1.25,
    "Financial Information": 1.20,
    "Identity Information": 1.15,
    "Personal Information": 1.0,
    "Confidential Information": 1.05
  };

  const breakdown = { Critical: 0, High: 0, Medium: 0, Low: 0 };
  const category_breakdown = {};
  let rawScore = 0;

  for (const d of detections) {
    const sev = d.risk_severity || "Low";
    const cat = d.category || "Confidential Information";
    breakdown[sev] = (breakdown[sev] || 0) + 1;
    category_breakdown[cat] = (category_breakdown[cat] || 0) + 1;

    const w = weights[sev] || 5;
    const m = mults[cat] || 1.0;
    rawScore += w * m * (d.confidence || 0.9);
  }

  const finalScore = Math.min(100, Math.round(rawScore));
  let classification = "Low Risk";
  let color = "#10b981";

  if (finalScore >= 75) {
    classification = "Critical Risk";
    color = "#ef4444";
  } else if (finalScore >= 50) {
    classification = "High Risk";
    color = "#f97316";
  } else if (finalScore >= 25) {
    classification = "Medium Risk";
    color = "#eab308";
  }

  return {
    score: finalScore,
    classification,
    color,
    total_items: detections.length,
    breakdown,
    category_breakdown,
    explanation: `Identified ${detections.length} privacy exposure factor(s). Score: ${finalScore}/100.`,
    factor_reasons: Object.keys(category_breakdown).map(c => `${category_breakdown[c]} ${c} item(s)`)
  };
}

// Render client-side protected image using HTML5 Canvas
export async function renderProtectedImage(imageSource, detections, manualBoxes = []) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d');

      // Draw original image
      ctx.drawImage(img, 0, 0);

      // Redact detections (only those where keep_visible is false)
      const toRedact = [
        ...detections.filter(d => !d.keep_visible).map(d => ({ box: d.bounding_box, style: d.protection_style || 'blackout' })),
        ...manualBoxes.map(b => ({ box: b, style: b.style || 'blackout' }))
      ];

      for (const item of toRedact) {
        const { box, style } = item;
        if (!box) continue;

        const pad = 4;
        const x = Math.max(0, box.x - pad);
        const y = Math.max(0, box.y - pad);
        const w = Math.min(canvas.width - x, box.width + pad * 2);
        const h = Math.min(canvas.height - y, box.height + pad * 2);

        if (w <= 0 || h <= 0) continue;

        if (style === 'blackout') {
          ctx.fillStyle = '#070b14';
          ctx.fillRect(x, y, w, h);
        } else if (style === 'pixelate') {
          // Pixelate effect
          const pixelSize = Math.max(8, Math.floor(Math.min(w, h) / 6));
          ctx.imageSmoothingEnabled = false;
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = Math.max(1, Math.floor(w / pixelSize));
          tempCanvas.height = Math.max(1, Math.floor(h / pixelSize));
          const tCtx = tempCanvas.getContext('2d');
          tCtx.drawImage(canvas, x, y, w, h, 0, 0, tempCanvas.width, tempCanvas.height);
          ctx.drawImage(tempCanvas, 0, 0, tempCanvas.width, tempCanvas.height, x, y, w, h);
          ctx.imageSmoothingEnabled = true;
        } else {
          // Blur effect
          ctx.save();
          ctx.filter = 'blur(12px)';
          ctx.drawImage(canvas, x, y, w, h, x, y, w, h);
          ctx.restore();
        }
      }

      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = (e) => reject(new Error("Failed to load image for canvas redaction"));

    if (typeof imageSource === 'string') {
      img.src = imageSource;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => { img.src = e.target.result; };
      reader.readAsDataURL(imageSource);
    }
  });
}
