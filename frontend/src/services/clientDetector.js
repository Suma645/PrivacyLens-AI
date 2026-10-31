// Client-side Sensitive Data Detection & Canvas Redactor
// Provides 100% offline, on-device privacy analysis when backend is unavailable

export function luhnCheck(cardStr) {
  if (cardStr.includes('*') || cardStr.toLowerCase().includes('x')) return true;
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

export function maskSensitiveValue(type = '', text = '') {
  if (!text) return '••••••';
  const str = String(text).trim();
  const lowerType = type.toLowerCase();

  // 1. Aadhaar: 1234 5678 9012 -> 1234 •••• 9012
  if (lowerType.includes('aadhaar')) {
    const digits = str.replace(/\D/g, '');
    if (digits.length === 12) {
      return `${digits.slice(0, 4)} •••• ${digits.slice(8)}`;
    }
    return str.slice(0, 4) + ' •••• ' + str.slice(-4);
  }

  // 2. PAN: ABCDE1234F -> ABCD •••• F
  if (lowerType.includes('pan')) {
    if (str.length === 10) {
      return `${str.slice(0, 4)}••••${str.slice(-1)}`;
    }
    return str.slice(0, 3) + '••••' + str.slice(-2);
  }

  // 3. Bank Account: 887654321088 -> ••••••••1088
  if (lowerType.includes('account') || lowerType.includes('a/c') || lowerType.includes('iban')) {
    const digits = str.replace(/\D/g, '');
    if (digits.length >= 4) {
      return `••••••••${digits.slice(-4)}`;
    }
    return '••••••••' + str.slice(-3);
  }

  // 4. IFSC: SBIN0001420 -> SBIN••••420
  if (lowerType.includes('ifsc')) {
    if (str.length === 11) {
      return `${str.slice(0, 4)}••••${str.slice(-3)}`;
    }
    return str.slice(0, 4) + '••••';
  }

  // 5. Payment Cards: 4532 1122 3344 1092 -> 4532 •••• •••• 1092
  if (lowerType.includes('card')) {
    const clean = str.replace(/[^0-9X*]/gi, '');
    if (clean.length >= 12) {
      return `${clean.slice(0, 4)} •••• •••• ${clean.slice(-4)}`;
    }
    return str.slice(0, 4) + ' •••• ' + str.slice(-4);
  }

  // 6. UPI ID / VPA: sharma@okhdfcbank -> s••••@okhdfcbank
  if (lowerType.includes('upi') || str.includes('@')) {
    const parts = str.split('@');
    if (parts.length === 2) {
      const name = parts[0];
      const maskedName = name.length > 2 ? `${name[0]}••••${name.slice(-1)}` : `${name[0]}••••`;
      return `${maskedName}@${parts[1]}`;
    }
  }

  // 7. Phone: +91 9876543210 -> +91 ••••• ••210
  if (lowerType.includes('phone') || lowerType.includes('mobile')) {
    const digits = str.replace(/\D/g, '');
    if (digits.length >= 10) {
      return `${digits.slice(0, 2)}••••••${digits.slice(-2)}`;
    }
    return str.slice(0, 3) + '••••' + str.slice(-2);
  }

  // 8. Password / Secret / Key / Token:
  if (lowerType.includes('password') || lowerType.includes('key') || lowerType.includes('token') || lowerType.includes('secret')) {
    return '••••••••••••';
  }

  // 9. OTP:
  if (lowerType.includes('otp') || lowerType.includes('2fa')) {
    return '•••' + str.slice(-2);
  }

  if (str.length > 8) {
    return `${str.slice(0, 3)}••••${str.slice(-3)}`;
  }

  return str;
}

// 3-Tier Priority System:
// CRITICAL (Red)   : Aadhaar, PAN, Bank Account, IFSC, Cards, SSN (Auto-Blackout)
// HIGH (Orange)    : UPI ID, UTR, Passwords, OTPs, API keys (Auto-Blur)
// NORMAL (Yellow)  : Email, Phone, Marks & Grades, Names, Addresses (Kept visible by default)

const PATTERNS = [
  // ================= 1. CRITICAL – Red (Auto-Protected / Solid Blackout) =================
  {
    category: "Identity Information",
    type: "Aadhaar Number",
    regex: /\b[2-9]\d{3}[ -]?\d{4}[ -]?\d{4}\b|\b\d{4}\s\d{4}\s\d{4}\b/,
    severity: "Critical",
    priority: "critical",
    confidence: 0.98,
    default_keep_visible: false,
    action: "Solid Blackout",
    explanation: "12-digit Indian National Identity (Aadhaar) number detected. Critical government PII; automatically protected with solid blackout."
  },
  {
    category: "Identity Information",
    type: "Permanent Account Number (PAN)",
    regex: /\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b/,
    severity: "Critical",
    priority: "critical",
    confidence: 0.98,
    default_keep_visible: false,
    action: "Solid Blackout",
    explanation: "National tax identification (PAN) card detected. Critical fiscal identifier; automatically protected with solid blackout."
  },
  {
    category: "Financial Information",
    type: "Bank Account Number",
    regex: /\b(?:account|acct|a\/c|acc|debited\s*from|credited\s*to)[\s\S]{0,35}?(?:x{2,}|\*{2,}|\.{2,})?([0-9]{3,24})\b|\b(?:ending\s*(?:with|in))[\s:#]+([0-9]{4})\b/i,
    severity: "Critical",
    priority: "critical",
    confidence: 0.97,
    default_keep_visible: false,
    action: "Solid Blackout",
    explanation: "Bank account number or linked account identifier detected. Automatically protected with solid blackout."
  },
  {
    category: "Financial Information",
    type: "Bank IFSC Code",
    regex: /\b[A-Z]{4}0[A-Z0-9]{6}\b/,
    severity: "Critical",
    priority: "critical",
    confidence: 0.97,
    default_keep_visible: false,
    action: "Solid Blackout",
    explanation: "Indian Financial System Code (IFSC) detected. Identifies specific bank branch; automatically protected."
  },
  {
    category: "Financial Information",
    type: "Credit / Debit Card",
    regex: /\b(?:\d{4}[ -]?\d{4}[ -]?\d{4}[ -]?\d{1,4}|\d{4}[ -]?(?:\*{4}|X{4})[ -]?(?:\*{4}|X{4})[ -]?\d{4}|(?:\*{4}|X{4})[ -]?(?:\*{4}|X{4})[ -]?(?:\*{4}|X{4})[ -]?\d{4})\b/,
    severity: "Critical",
    priority: "critical",
    confidence: 0.97,
    validate: (match) => luhnCheck(match),
    default_keep_visible: false,
    action: "Solid Blackout",
    explanation: "Payment card number detected. Critical financial asset; automatically protected with solid blackout."
  },
  {
    category: "Financial Information",
    type: "Card CVV Code",
    regex: /\b(?:cvv|cvc|security code)[\s:=]+(\d{3,4})\b/i,
    severity: "Critical",
    priority: "critical",
    confidence: 0.98,
    default_keep_visible: false,
    action: "Solid Blackout",
    explanation: "Card security code (CVV) detected. Critical payment secret; automatically protected."
  },
  {
    category: "Identity Information",
    type: "Social Security Number (SSN)",
    regex: /\b\d{3}-\d{2}-\d{4}\b/,
    severity: "Critical",
    priority: "critical",
    confidence: 0.97,
    default_keep_visible: false,
    action: "Solid Blackout",
    explanation: "Social Security Number (SSN) detected. High risk of identity theft; automatically protected."
  },

  // ================= 2. HIGH – Orange (Financial & Identity Protections) =================
  {
    category: "Financial Information",
    type: "UPI ID / Virtual Payment Address",
    regex: /\b[a-zA-Z0-9.\-_]{2,}@(okhdfcbank|oksbi|okaxis|okicici|ybl|ibl|axl|paytm|upi|apl|sbi|hdfcbank|icici|kotak|postbank|barodampay|federal|allbank|cnrb|idbi|pnb|boi|rbl|indus|citi|yesbank|aubank|fbl|jupiteraxis|pz)\b|\b(?:upi\s*id|vpa|payee\s*upi|pay\s*to)[\s:=]+([a-zA-Z0-9.\-_]{2,}@[a-zA-Z0-9.\-_]{2,})\b/i,
    severity: "High",
    priority: "high",
    confidence: 0.96,
    default_keep_visible: false,
    action: "Gaussian Blur",
    explanation: "Virtual Payment Address / UPI ID detected. Direct financial payment endpoint."
  },
  {
    category: "Financial Information",
    type: "UPI Ref No. / UTR / Transaction ID",
    regex: /\b(?:upi\s*(?:ref|transaction|txn)(?:\s*no\.?|\s*id)?|utr(?:\s*no\.?)?|txn\s*(?:id|no\.?)?|transaction\s*(?:id|no\.?)?|reference\s*(?:no\.?)?|ref\s*id|order\s*id)[\s:=#]+([A-Za-z0-9_\-]{6,36})\b|\b(?:utr|upi\s*ref)[\s:#]+(\d{12})\b/i,
    severity: "High",
    priority: "high",
    confidence: 0.96,
    default_keep_visible: false,
    action: "Gaussian Blur",
    explanation: "Financial transaction reference (UTR / UPI Ref / Transaction ID) detected. Proof of payment receipt."
  },
  {
    category: "Authentication Information",
    type: "Password / Credential",
    regex: /\b(?:password|passwd|pwd|passcode)[\s:=]+['"]?([^\s,;'"<>()]{4,32})['"]?/i,
    severity: "High",
    priority: "high",
    confidence: 0.95,
    default_keep_visible: false,
    action: "Gaussian Blur",
    explanation: "Plaintext login password or credential detected."
  },
  {
    category: "Authentication Information",
    type: "One-Time Password (OTP) / 2FA",
    regex: /\b(?:otp|verification code|security code|2fa)[\s:is]+(\d{4,8})\b/i,
    severity: "High",
    priority: "high",
    confidence: 0.95,
    default_keep_visible: false,
    action: "Gaussian Blur",
    explanation: "Time-based authentication code detected. Enables real-time two-factor bypass."
  },
  {
    category: "Authentication Information",
    type: "API Key / Access Token",
    regex: /\b(?:api[_-]?key|secret[_-]?key|auth[_-]?token|bearer)[\s:=]+['"]?([A-Za-z0-9\-_]{16,64})['"]?|\bAKIA[0-9A-Z]{16}\b|\bAIza[0-9A-Za-z\-_]{35}\b/i,
    severity: "High",
    priority: "high",
    confidence: 0.96,
    default_keep_visible: false,
    action: "Gaussian Blur",
    explanation: "Cloud API Key or Secret Token detected."
  },
  {
    category: "Authentication Information",
    type: "Private Key",
    regex: /-----BEGIN (?:RSA|EC|OPENSSH|DSA|PRIVATE) KEY-----/i,
    severity: "High",
    priority: "high",
    confidence: 0.99,
    default_keep_visible: false,
    action: "Gaussian Blur",
    explanation: "Cryptographic private key detected."
  },
  {
    category: "Financial Information",
    type: "Payment App / Transaction Status",
    regex: /\b(?:google\s*pay|gpay|phonepe|paytm|bhim\s*upi|payment\s*successful|paid\s*successfully|transfer\s*successful|payment\s*completed|money\s*sent|paid\s*to\b|payment\s*to\b|banking\s*name)/i,
    severity: "High",
    priority: "high",
    confidence: 0.93,
    default_keep_visible: false,
    action: "Gaussian Blur",
    explanation: "Payment application receipt or transaction confirmation status detected."
  },

  // ================= 3. NORMAL – Yellow (Manual User Control / Kept Visible by Default) =================
  {
    category: "Personal Information",
    type: "Email Address",
    regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/,
    severity: "Normal",
    priority: "normal",
    confidence: 0.97,
    default_keep_visible: true,
    action: "Blur",
    explanation: "Personal or corporate email address detected. Normal personal info (kept visible by default; manual toggle to blur)."
  },
  {
    category: "Personal Information",
    type: "Phone Number",
    regex: /(?<!\w)(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}(?!\w)|\b[6-9]\d{9}\b/,
    severity: "Normal",
    priority: "normal",
    confidence: 0.92,
    default_keep_visible: true,
    action: "Blur",
    explanation: "Direct telephone contact number detected. Normal personal info (kept visible by default; manual toggle to blur)."
  },
  {
    category: "Personal Information",
    type: "Student Marks / Grade",
    regex: /\b(?:marks?|percentage|score|grade|aggregate|cgpa|sgpa|total|examination\s*results?)[\s:=]+(\d{1,3}(?:\.\d{1,2})?\s?%|\d{1,2}(?:\.\d{1,2})?\s*(?:\/\s*(?:100|10|50))?)\b|\b\d{1,3}(?:\.\d{1,2})?%\b|\b(?:[0-9]|10)\.\d{1,2}\s*(?:cgpa|sgpa|gpa)\b/i,
    severity: "Normal",
    priority: "normal",
    confidence: 0.90,
    default_keep_visible: true,
    action: "Blur",
    explanation: "Student marks, percentage, or CGPA detected with context. Normal personal info (kept visible by default; manual toggle to blur)."
  },
  {
    category: "Personal Information",
    type: "Full Name / Identity Context",
    regex: /\b(?:name|full\s*name|account\s*holder|user|customer|student\s*name)[\s:#]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\b/i,
    severity: "Normal",
    priority: "normal",
    confidence: 0.88,
    default_keep_visible: true,
    action: "Blur",
    explanation: "Individual name identified in context. Normal personal info (kept visible by default; manual toggle to blur)."
  },
  {
    category: "Personal Information",
    type: "Residential Address",
    regex: /\b\d{1,5}\s+(?:[A-Za-z0-9\.]+\s+){1,4}(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Way|Suite|Apt|Apartment)\b/i,
    severity: "Normal",
    priority: "normal",
    confidence: 0.89,
    default_keep_visible: true,
    action: "Blur",
    explanation: "Residential address detected. Normal personal info (kept visible by default; manual toggle to blur)."
  },
  {
    category: "Personal Information",
    type: "Date of Birth",
    regex: /\b(?:dob|date\s*of\s*birth|born\s*on)[\s:=]+(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\b/i,
    severity: "Normal",
    priority: "normal",
    confidence: 0.92,
    default_keep_visible: true,
    action: "Blur",
    explanation: "Date of birth detected. Normal personal info (kept visible by default; manual toggle to blur)."
  },
  {
    category: "Financial Information",
    type: "Payment Amount",
    regex: /(?:₹|rs\.?|inr|usd|\$)\s*[0-9]+(?:,[0-9]{2,3})*(?:\.[0-9]{2})?|\b(?:amount|paid|total|sent|debited)[\s:=]+(?:₹|rs\.?|inr|usd|\$)?\s*[0-9]+(?:,[0-9]{2,3})*(?:\.[0-9]{2})?\b/i,
    severity: "Normal",
    priority: "normal",
    confidence: 0.91,
    default_keep_visible: true,
    action: "Blur",
    explanation: "Transaction amount detected. Normal info (kept visible by default; manual toggle to blur)."
  },
  {
    category: "Confidential Information",
    type: "Confidential Watermark / Label",
    regex: /\b(?:confidential|strictly private|do not share|internal only|proprietary|nda protected)\b/i,
    severity: "High",
    priority: "high",
    confidence: 0.95,
    default_keep_visible: false,
    action: "Gaussian Blur",
    explanation: "Confidentiality designation marker detected."
  }
];

export function runClientDetection(tokens, defaultLocation = "Page 1") {
  const detections = [];
  if (!tokens || tokens.length === 0) return detections;

  const textTokens = tokens.filter(t => t.text && t.text.trim().length > 0);
  const fullTextLines = textTokens.map(t => t.text).join('\n');
  const fullTextSpaces = textTokens.map(t => t.text).join(' ');
  const combinedText = `${fullTextLines}\n${fullTextSpaces}`;

  for (const pat of PATTERNS) {
    let match;
    const globalRegex = new RegExp(pat.regex.source, pat.regex.flags.includes('g') ? pat.regex.flags : pat.regex.flags + 'g');

    // 1. Search in concatenated text stream
    while ((match = globalRegex.exec(combinedText)) !== null) {
      const matchedText = match[0].trim();
      if (!matchedText) continue;
      if (pat.validate && !pat.validate(matchedText)) {
        continue;
      }

      const already = detections.some(d => d.type === pat.type && (d.text.includes(matchedText) || matchedText.includes(d.text)));
      if (already) continue;

      let bestBox = null;
      const containerToken = tokens.find(t => t.text && (t.text.includes(matchedText) || matchedText.includes(t.text)));
      if (containerToken && containerToken.box) {
        bestBox = { ...containerToken.box };
      } else {
        const words = matchedText.split(/\s+/).map(w => w.toLowerCase()).filter(w => w.length > 1);
        const matched = tokens.filter(t => t.text && words.some(w => t.text.toLowerCase().includes(w)));
        if (matched.length > 0) {
          const xMin = Math.min(...matched.map(t => t.box.x));
          const yMin = Math.min(...matched.map(t => t.box.y));
          const xMax = Math.max(...matched.map(t => t.box.x + t.box.width));
          const yMax = Math.max(...matched.map(t => t.box.y + t.box.height));
          bestBox = {
            x: xMin,
            y: yMin,
            width: Math.max(16, xMax - xMin),
            height: Math.max(16, yMax - yMin)
          };
        }
      }

      if (!bestBox) {
        bestBox = { x: 30, y: 30 + detections.length * 40, width: 220, height: 35 };
      }

      const id = 'det_' + Math.random().toString(36).substring(2, 9);
      const priority = pat.priority || (pat.severity === 'Critical' ? 'critical' : 'normal');
      const keepVisible = pat.default_keep_visible !== undefined ? pat.default_keep_visible : false;
      const style = pat.action.toLowerCase().includes('blackout') ? 'blackout' : 'blur';
      const maskedVal = maskSensitiveValue(pat.type, matchedText);

      detections.push({
        id,
        category: pat.category,
        type: pat.type,
        factor_type: pat.type,
        text: matchedText,
        extracted_text: matchedText,
        raw_text: matchedText,
        masked_value: maskedVal,
        location: defaultLocation,
        risk_severity: pat.severity,
        priority: priority,
        confidence: pat.confidence,
        recommended_action: pat.action,
        protection_style: style,
        keep_visible: keepVisible,
        bounding_box: bestBox,
        explanation: pat.explanation,
        warning: priority === 'critical' ? 'CRITICAL PII: Automatically protected with solid blackout to prevent identity/financial theft.' : null
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

        const already = detections.some(d => d.type === pat.type && (d.text.includes(val) || val.includes(d.text)));
        if (!already) {
          const id = 'det_' + Math.random().toString(36).substring(2, 9);
          const priority = pat.priority || (pat.severity === 'Critical' ? 'critical' : 'normal');
          const keepVisible = pat.default_keep_visible !== undefined ? pat.default_keep_visible : false;
          const style = pat.action.toLowerCase().includes('blackout') ? 'blackout' : 'blur';
          const maskedVal = maskSensitiveValue(pat.type, val);

          detections.push({
            id,
            category: pat.category,
            type: pat.type,
            factor_type: pat.type,
            text: val,
            extracted_text: val,
            raw_text: val,
            masked_value: maskedVal,
            location: defaultLocation,
            risk_severity: pat.severity,
            priority: priority,
            confidence: pat.confidence,
            recommended_action: pat.action,
            protection_style: style,
            keep_visible: keepVisible,
            bounding_box: t.box || { x: 30, y: 30, width: 200, height: 35 },
            explanation: pat.explanation,
            warning: priority === 'critical' ? 'CRITICAL PII: Automatically protected with solid blackout to prevent identity/financial theft.' : null
          });
        }
      }
    }
  }

  // Deduplicate overlapping detections
  const uniqueDetections = [];
  const seen = new Set();
  for (const d of detections) {
    const key = `${d.type}_${d.text}`;
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
      breakdown: { Critical: 0, High: 0, Normal: 0, Medium: 0, Low: 0 },
      priority_summary: {
        total: 0,
        critical: 0,
        high: 0,
        normal: 0,
        auto_protected: 0,
        awaiting_decisions: 0
      },
      category_breakdown: {},
      explanation: "No sensitive data patterns found. Keep visible or manually redact if desired.",
      factor_reasons: ["No sensitive credentials found"]
    };
  }

  const weights = { Critical: 35, High: 20, Normal: 10, Medium: 10, Low: 5 };
  const mults = {
    "Authentication Information": 1.25,
    "Financial Information": 1.20,
    "Identity Information": 1.15,
    "Personal Information": 1.0,
    "Confidential Information": 1.05
  };

  const breakdown = { Critical: 0, High: 0, Normal: 0, Medium: 0, Low: 0 };
  const category_breakdown = {};
  let rawScore = 0;

  let criticalCount = 0;
  let highCount = 0;
  let normalCount = 0;
  let autoProtectedCount = 0;
  let awaitingCount = 0;

  for (const d of detections) {
    const p = d.priority || 'normal';
    if (p === 'critical') criticalCount++;
    else if (p === 'high') highCount++;
    else normalCount++;

    if (d.keep_visible) awaitingCount++;
    else autoProtectedCount++;

    const sev = d.risk_severity || (p === 'critical' ? 'Critical' : (p === 'high' ? 'High' : 'Normal'));
    const cat = d.category || "Personal Information";
    breakdown[sev] = (breakdown[sev] || 0) + 1;
    category_breakdown[cat] = (category_breakdown[cat] || 0) + 1;

    const w = weights[sev] || 10;
    const m = mults[cat] || 1.0;
    rawScore += w * m * (d.confidence || 0.9);
  }

  // Guaranteed minimum 15 when sensitive data is detected (never 0/100)
  const finalScore = Math.max(15, Math.min(100, Math.round(rawScore)));
  let classification = "Low Risk";
  let color = "#10b981";

  if (finalScore >= 75 || criticalCount > 0) {
    classification = "Critical Risk";
    color = "#ef4444";
  } else if (finalScore >= 50 || highCount > 0) {
    classification = "High Risk";
    color = "#f97316";
  } else if (finalScore >= 25 || normalCount > 0) {
    classification = "Normal Risk";
    color = "#eab308";
  }

  return {
    score: finalScore,
    classification,
    color,
    total_items: detections.length,
    breakdown,
    priority_summary: {
      total: detections.length,
      critical: criticalCount,
      high: highCount,
      normal: normalCount,
      auto_protected: autoProtectedCount,
      awaiting_decisions: awaitingCount
    },
    category_breakdown,
    explanation: `Identified ${detections.length} privacy exposure factor(s). Score: ${finalScore}/100.`,
    factor_reasons: Object.keys(category_breakdown).map(c => `${category_breakdown[c]} ${c} item(s)`)
  };
}

export async function renderProtectedImage(imageSource, detections = [], manualBoxes = [], visibleBoxes = [], mode = 'spotlight') {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const w = img.width || 800;
      const h = img.height || 600;
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');

      const allVisible = [
        ...visibleBoxes,
        ...detections.filter(d => d.keep_visible).map(d => d.bounding_box)
      ].filter(Boolean);

      const isSpotlight = mode === 'spotlight' && allVisible.length > 0;

      if (isSpotlight) {
        ctx.save();
        ctx.filter = 'blur(20px)';
        ctx.drawImage(img, -20, -20, w + 40, h + 40);
        ctx.restore();

        for (const vb of allVisible) {
          const bx = Math.max(0, vb.x);
          const by = Math.max(0, vb.y);
          const bw = Math.min(w - bx, vb.width);
          const bh = Math.min(h - by, vb.height);
          if (bw <= 0 || bh <= 0) continue;

          ctx.drawImage(img, bx, by, bw, bh, bx, by, bw, bh);
          ctx.strokeStyle = '#06b6d4';
          ctx.lineWidth = 2;
          ctx.strokeRect(bx, by, bw, bh);
        }
      } else {
        ctx.drawImage(img, 0, 0);

        const toRedact = [
          ...detections.filter(d => !d.keep_visible).map(d => ({
            box: d.bounding_box,
            style: d.protection_style || (d.priority === 'critical' ? 'blackout' : 'blur'),
            priority: d.priority
          })),
          ...manualBoxes.map(b => ({ box: b, style: b.style || 'blackout', priority: 'manual' }))
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

          if (style === 'blackout' || item.priority === 'critical') {
            ctx.fillStyle = '#000000';
            ctx.fillRect(x, y, rw, rh);
          } else if (style === 'pixelate') {
            const pixelSize = Math.max(8, Math.min(rw, rh) / 6);
            ctx.save();
            ctx.imageSmoothingEnabled = false;
            const offCanvas = document.createElement('canvas');
            offCanvas.width = Math.max(1, Math.floor(rw / pixelSize));
            offCanvas.height = Math.max(1, Math.floor(rh / pixelSize));
            const offCtx = offCanvas.getContext('2d');
            offCtx.drawImage(canvas, x, y, rw, rh, 0, 0, offCanvas.width, offCanvas.height);
            ctx.drawImage(offCanvas, 0, 0, offCanvas.width, offCanvas.height, x, y, rw, rh);
            ctx.restore();
          } else {
            ctx.save();
            ctx.filter = 'blur(16px)';
            ctx.drawImage(canvas, x, y, rw, rh, x, y, rw, rh);
            ctx.restore();
          }
        }
      }

      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => {
      resolve(imageSource);
    };
    img.src = imageSource;
  });
}
