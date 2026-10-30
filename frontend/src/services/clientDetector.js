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
    action: "Gaussian Blur",
    explanation: "Cryptographic private key detected. Exposure allows complete impersonation."
  },
  {
    category: "Authentication Information",
    type: "AWS Access Key",
    regex: /\bAKIA[0-9A-Z]{16}\b/,
    severity: "Critical",
    confidence: 0.98,
    action: "Gaussian Blur",
    explanation: "Amazon Web Services (AWS) Access Key ID detected."
  },
  {
    category: "Authentication Information",
    type: "GitHub Token",
    regex: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{36,40}\b|\bgithub_pat_[A-Za-z0-9_]{82}\b/,
    severity: "Critical",
    confidence: 0.99,
    action: "Gaussian Blur",
    explanation: "GitHub Personal Access Token detected."
  },
  {
    category: "Authentication Information",
    type: "API Key / Token",
    regex: /\b(?:api[_-]?key|secret[_-]?key|auth[_-]?token|bearer)[\s:=]+['"]?([A-Za-z0-9\-_]{16,64})['"]?/i,
    severity: "Critical",
    confidence: 0.95,
    action: "Gaussian Blur",
    explanation: "Production API Key or Secret detected."
  },
  {
    category: "Authentication Information",
    type: "Password / Credential",
    regex: /\b(?:password|passwd|pwd|passcode)[\s:=]+['"]?([^\s,;'"<>()]{4,32})['"]?/i,
    severity: "Critical",
    confidence: 0.94,
    action: "Gaussian Blur",
    explanation: "Plaintext password detected."
  },
  {
    category: "Authentication Information",
    type: "One-Time Password (OTP)",
    regex: /\b(?:otp|verification code|security code|2fa)[\s:is]+(\d{4,8})\b/i,
    severity: "Critical",
    confidence: 0.95,
    action: "Gaussian Blur",
    explanation: "Time-based authentication code detected."
  },
  {
    category: "Authentication Information",
    type: "API Key / Token Reference",
    regex: /\b(?:api[_\s-]?tokens?|cloud\s*api\s*keys?|access[_\s-]?tokens?|secret[_\s-]?keys?|bearer\s*tokens?|auth[_\s-]?tokens?|\.env\b)/i,
    severity: "Critical",
    confidence: 0.96,
    action: "Gaussian Blur",
    explanation: "Reference to API tokens, cloud keys, or environment secrets detected."
  },
  {
    category: "Authentication Information",
    type: "Password / Credential Reference",
    regex: /\b(?:passwords?|passcodes?|pin\s*codes?|login\s*credentials?|auth\s*credentials?|secret\s*passphrase)\b/i,
    severity: "High",
    confidence: 0.94,
    action: "Gaussian Blur",
    explanation: "Reference to password or login credentials detected."
  },
  {
    category: "Authentication Information",
    type: "Authentication Factor / OTP Reference",
    regex: /\b(?:one[- ]time\s*passwords?|phone\s*&\s*otp|chat,\s*phone\s*&\s*otp|2fa\s*codes?|mfa\s*tokens?|verification\s*codes?)\b/i,
    severity: "High",
    confidence: 0.92,
    action: "Gaussian Blur",
    explanation: "Reference to OTP, multi-factor, or phone verification authentication detected."
  },

  // Financial
  {
    category: "Financial Information",
    type: "Bank Account / IBAN",
    regex: /\b(?:iban|account|acct|a\/c)[\s:#-]+([A-Z0-9]{8,34})\b/i,
    severity: "Critical",
    confidence: 0.95,
    priority: "highest",
    default_keep_visible: false,
    action: "Solid Blackout",
    explanation: "Bank account number detected. Highest-priority critical financial record; automatically redacted with solid black box."
  },
  {
    category: "Financial Information",
    type: "Credit / Debit Card",
    regex: /\b(?:\d{4}[ -]?\d{4}[ -]?\d{4}[ -]?\d{1,4}|\d{4}[ -]?\d{6}[ -]?\d{5})\b/,
    severity: "Critical",
    confidence: 0.96,
    priority: "highest",
    default_keep_visible: false,
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
    type: "Banking & Payment Details Reference",
    regex: /\b(?:banking\s*details|bank\s*details|bank\s*&\s*credit\s*card|credit\s*cards?|debit\s*cards?|financial\s*records?|bank\s*statements?|account\s*details?|wire\s*transfers?|account\s*balance)\b/i,
    severity: "High",
    confidence: 0.95,
    action: "Gaussian Blur",
    explanation: "Reference to banking details, credit cards, or financial accounts detected."
  },

  // Personal Information
  {
    category: "Personal Information",
    type: "Email Address",
    regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/,
    severity: "Medium",
    confidence: 0.98,
    priority: "optional",
    default_keep_visible: true,
    action: "Blur",
    explanation: "Personal or corporate email address detected. Optional redaction (kept visible by default; select checkbox to blur)."
  },
  {
    category: "Personal Information",
    type: "Phone Number",
    regex: /(?<!\w)(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}(?!\w)/,
    severity: "Medium",
    confidence: 0.92,
    priority: "optional",
    default_keep_visible: true,
    action: "Blur",
    explanation: "Direct telephone contact number detected. Optional redaction (kept visible by default; select checkbox to blur)."
  },
  {
    category: "Personal Information",
    type: "Marks / Percentage / Score",
    regex: /\b(?:marks?|percentage|score|grade|aggregate|cgpa|gpa|total)[\s:=]+(\d{1,3}(?:\.\d{1,2})?\s?%|\d{1,2}(?:\.\d{1,2})?\s*(?:\/\s*(?:100|10|50))?)\b|\b\d{1,3}(?:\.\d{1,2})?%\b|\b(?:[0-9]|10)\.\d{1,2}\s*(?:cgpa|gpa)\b/i,
    severity: "Low",
    confidence: 0.90,
    priority: "optional",
    default_keep_visible: true,
    action: "Blur",
    explanation: "Academic marks or percentage score detected. Optional redaction (kept visible by default; select checkbox to blur)."
  },
  {
    category: "Personal Information",
    type: "Personal Contacts & Communications",
    regex: /\b(?:personal\s*contacts?|private\s*messages?|private\s*chats?|chat,\s*phone\s*&\s*otp|personal\s*emails?|private\s*photos?)\b/i,
    severity: "Medium",
    confidence: 0.91,
    action: "Gaussian Blur",
    explanation: "Reference to personal contact channels or private communications detected."
  },

  // Identity Information
  {
    category: "Identity Information",
    type: "Aadhaar Number",
    regex: /\b[2-9]\d{3}[ -]?\d{4}[ -]?\d{4}\b/,
    severity: "Critical",
    confidence: 0.97,
    priority: "highest",
    default_keep_visible: false,
    action: "Solid Blackout",
    explanation: "12-digit National Identity (Aadhaar) number detected. Highest-priority critical PII; automatically redacted with solid black box."
  },
  {
    category: "Identity Information",
    type: "Permanent Account Number (PAN)",
    regex: /\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b/,
    severity: "Critical",
    confidence: 0.98,
    priority: "highest",
    default_keep_visible: false,
    action: "Solid Blackout",
    explanation: "National tax identification (PAN) card detected. Highest-priority fiscal identifier; automatically redacted with solid black box."
  },
  {
    category: "Identity Information",
    type: "Social Security Number (SSN)",
    regex: /\b\d{3}-\d{2}-\d{4}\b/,
    severity: "Critical",
    confidence: 0.96,
    action: "Solid Blackout",
    explanation: "Government-issued identity number detected."
  },
  {
    category: "Identity Information",
    type: "Personal Identity Reference",
    regex: /\b(?:personal\s*identit(?:y|ies)|identifying\s*information|confidential\s*identit(?:y|ies)|national\s*id|identity\s*cards?|government\s*ids?)\b/i,
    severity: "High",
    confidence: 0.94,
    action: "Gaussian Blur",
    explanation: "Reference to personally identifiable or individual identity records detected."
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
  },
  {
    category: "Confidential Information",
    type: "Confidentiality Risk / Sensitive Privacy Data",
    regex: /\b(?:confidentiality\s*risks?|confidential\s*data|confidential\s*information|privacy\s*risks?|sensitive\s*data|sensitive\s*information|trade\s*secrets?)\b/i,
    severity: "Medium",
    confidence: 0.92,
    action: "Gaussian Blur",
    explanation: "Discussion or designation of confidential risk and sensitive data detected."
  }
];

export function runClientDetection(tokens) {
  const detections = [];
  if (!tokens || tokens.length === 0) return detections;

  // Use line tokens if available to preserve phrases, otherwise words
  const lineTokens = tokens.filter(t => t.is_line);
  const textTokens = lineTokens.length > 0 ? lineTokens : tokens;
  const fullText = textTokens.map(t => t.text).join('\n');

  for (const pat of PATTERNS) {
    let match;
    const globalRegex = new RegExp(pat.regex.source, pat.regex.flags.includes('g') ? pat.regex.flags : pat.regex.flags + 'g');

    // 1. Search in concatenated text
    while ((match = globalRegex.exec(fullText)) !== null) {
      const matchedText = match[0].trim();
      if (!matchedText) continue;
      if (pat.validate && !pat.validate(matchedText)) {
        continue;
      }

      // Find the most appropriate bounding box from tokens
      let bestBox = null;
      const containerToken = tokens.find(t => t.text && (t.text.includes(matchedText) || matchedText.includes(t.text)));
      if (containerToken && containerToken.box) {
        bestBox = { ...containerToken.box };
      } else {
        const words = matchedText.split(/\s+/).map(w => w.toLowerCase());
        const matched = tokens.filter(t => t.text && words.some(w => t.text.toLowerCase().includes(w)));
        if (matched.length > 0) {
          const xMin = Math.min(...matched.map(t => t.box.x));
          const yMin = Math.min(...matched.map(t => t.box.y));
          const xMax = Math.max(...matched.map(t => t.box.x + t.box.width));
          const yMax = Math.max(...matched.map(t => t.box.y + t.box.height));
          bestBox = {
            x: xMin,
            y: yMin,
            width: Math.max(12, xMax - xMin),
            height: Math.max(12, yMax - yMin)
          };
        }
      }

      if (!bestBox) {
        bestBox = { x: 30, y: 30 + detections.length * 40, width: 220, height: 35 };
      }

      const id = 'det_' + Math.random().toString(36).substring(2, 9);
      const priority = pat.priority || (pat.severity === 'Critical' ? 'highest' : 'standard');
      const keepVisible = pat.default_keep_visible !== undefined ? pat.default_keep_visible : false;
      const style = pat.action.toLowerCase().includes('blackout') ? 'blackout' : (pat.action.toLowerCase().includes('pixel') ? 'pixelate' : 'blur');

      detections.push({
        id,
        category: pat.category,
        type: pat.type,
        factor_type: pat.type,
        text: matchedText,
        extracted_text: matchedText,
        risk_severity: pat.severity,
        confidence: pat.confidence,
        priority: priority,
        recommended_action: pat.action,
        protection_style: style,
        keep_visible: keepVisible,
        bounding_box: bestBox,
        explanation: pat.explanation
      });
    }

    // 2. Also search individual tokens
    for (const t of tokens) {
      if (!t.text) continue;
      const tokenMatch = pat.regex.exec(t.text);
      if (tokenMatch) {
        const val = tokenMatch[0].trim();
        if (!val) continue;
        if (pat.validate && !pat.validate(val)) continue;

        const already = detections.some(d => d.text.includes(val) || val.includes(d.text));
        if (!already) {
          const id = 'det_' + Math.random().toString(36).substring(2, 9);
          const priority = pat.priority || (pat.severity === 'Critical' ? 'highest' : 'standard');
          const keepVisible = pat.default_keep_visible !== undefined ? pat.default_keep_visible : false;
          const style = pat.action.toLowerCase().includes('blackout') ? 'blackout' : (pat.action.toLowerCase().includes('pixel') ? 'pixelate' : 'blur');

          detections.push({
            id,
            category: pat.category,
            type: pat.type,
            factor_type: pat.type,
            text: val,
            extracted_text: val,
            risk_severity: pat.severity,
            confidence: pat.confidence,
            priority: priority,
            recommended_action: pat.action,
            protection_style: style,
            keep_visible: keepVisible,
            bounding_box: t.box || { x: 30, y: 30, width: 200, height: 35 },
            explanation: pat.explanation
          });
        }
      }
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

// Render client-side protected image using HTML5 Canvas (Selective Spotlight Sharing)
export async function renderProtectedImage(imageSource, detections = [], manualBoxes = [], visibleBoxes = [], mode = 'spotlight') {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');

      // Collect user-selected visible areas
      const allVisible = [
        ...visibleBoxes,
        ...detections.filter(d => d.keep_visible).map(d => d.bounding_box)
      ].filter(b => b && b.width > 0 && b.height > 0);

      const isSpotlight = mode === 'spotlight' && allVisible.length > 0;

      if (isSpotlight) {
        // 1. Draw entire image with high-security Gaussian blur
        ctx.save();
        ctx.filter = 'blur(20px)';
        ctx.drawImage(img, -20, -20, w + 40, h + 40);
        ctx.restore();

        // 2. Restore 100% crystal-clear sharp original content for selected visible sections
        for (const box of allVisible) {
          const bx = Math.max(0, Math.round(box.x));
          const by = Math.max(0, Math.round(box.y));
          const bw = Math.min(w - bx, Math.round(box.width));
          const bh = Math.min(h - by, Math.round(box.height));
          if (bw <= 0 || bh <= 0) continue;

          // Draw sharp unblurred original pixels
          ctx.drawImage(img, bx, by, bw, bh, bx, by, bw, bh);

          // Subtle elegant highlight border around the shared section
          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 2;
          ctx.strokeRect(bx, by, bw, bh);
        }
      } else {
        // Redaction mode:
        // Highest-priority (Aadhaar, PAN, Bank Account) = solid black box
        // Optional items (Email, Phone, Marks) = blur if checked
        // Manual boxes = user-selected style (blackout, blur, pixelate)
        ctx.drawImage(img, 0, 0);

        const toRedact = [
          ...detections.filter(d => !d.keep_visible).map(d => ({
            box: d.bounding_box,
            style: d.protection_style || (d.priority === 'highest' ? 'blackout' : 'blur')
          })),
          ...manualBoxes.map(b => ({
            box: b,
            style: b.style || 'blackout'
          }))
        ];

        for (const item of toRedact) {
          const { box, style } = item;
          if (!box) continue;

          const pad = 3;
          const x = Math.max(0, box.x - pad);
          const y = Math.max(0, box.y - pad);
          const rw = Math.min(canvas.width - x, box.width + pad * 2);
          const rh = Math.min(canvas.height - y, box.height + pad * 2);
          if (rw <= 0 || rh <= 0) continue;

          if (style === 'blackout') {
            // Requirement 1 & 3: Solid black boxes
            ctx.fillStyle = '#000000';
            ctx.fillRect(x, y, rw, rh);
          } else if (style === 'pixelate') {
            // Pixelation mosaic
            const pixelSize = Math.max(8, Math.min(rw, rh) / 6);
            ctx.save();
            ctx.imageSmoothingEnabled = false;
            // Draw small then stretch back
            const offCanvas = document.createElement('canvas');
            offCanvas.width = Math.max(1, Math.floor(rw / pixelSize));
            offCanvas.height = Math.max(1, Math.floor(rh / pixelSize));
            const offCtx = offCanvas.getContext('2d');
            offCtx.drawImage(canvas, x, y, rw, rh, 0, 0, offCanvas.width, offCanvas.height);
            ctx.drawImage(offCanvas, 0, 0, offCanvas.width, offCanvas.height, x, y, rw, rh);
            ctx.restore();
          } else {
            // Gaussian Blur
            ctx.save();
            ctx.filter = 'blur(16px)';
            ctx.drawImage(canvas, x, y, rw, rh, x, y, rw, rh);
            ctx.restore();
          }
        }
      }

      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error("Failed to load image for canvas protection"));

    if (typeof imageSource === 'string') {
      img.src = imageSource;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => { img.src = e.target.result; };
      reader.readAsDataURL(imageSource);
    }
  });
}
