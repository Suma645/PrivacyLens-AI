import re
import uuid

def luhn_checksum_valid(card_num_str):
    """Verifies credit card number using Luhn algorithm."""
    digits = [int(c) for c in card_num_str if c.isdigit()]
    if len(digits) < 13 or len(digits) > 19:
        return False
    checksum = 0
    reverse_digits = digits[::-1]
    for i, d in enumerate(reverse_digits):
        if i % 2 == 1:
            doubled = d * 2
            checksum += doubled - 9 if doubled > 9 else doubled
        else:
            checksum += d
    return checksum % 10 == 0

class SensitiveDetector:
    def __init__(self):
        # Compile sensitive patterns
        self.patterns = [
            # ================= C. Authentication Information =================
            {
                "category": "Authentication Information",
                "type": "Private Key",
                "regex": re.compile(r"-----BEGIN (?:RSA|EC|OPENSSH|DSA|PRIVATE) KEY-----", re.IGNORECASE),
                "severity": "Critical",
                "confidence": 0.99,
                "action": "Solid Blackout",
                "explanation": "Cryptographic private key detected. Exposure allows complete impersonation and decrypting of secure systems."
            },
            {
                "category": "Authentication Information",
                "type": "AWS Access Key",
                "regex": re.compile(r"\bAKIA[0-9A-Z]{16}\b"),
                "severity": "Critical",
                "confidence": 0.98,
                "action": "Solid Blackout",
                "explanation": "Amazon Web Services (AWS) Access Key ID detected. Hackers use these to compromise cloud infrastructure."
            },
            {
                "category": "Authentication Information",
                "type": "GitHub Token",
                "regex": re.compile(r"\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{36,40}\b|\bgithub_pat_[A-Za-z0-9_]{82}\b"),
                "severity": "Critical",
                "confidence": 0.99,
                "action": "Solid Blackout",
                "explanation": "GitHub Personal Access Token detected. Grants direct access to code repositories and private repos."
            },
            {
                "category": "Authentication Information",
                "type": "API Key / Secret Token",
                "regex": re.compile(r"(?i)\b(?:api[_-]?key|secret[_-]?key|client[_-]?secret|auth[_-]?token)[\s:=]+['\"]?([A-Za-z0-9\-_]{16,64})['\"]?"),
                "severity": "Critical",
                "confidence": 0.95,
                "action": "Solid Blackout",
                "explanation": "Production API Key or Secret detected. Compromised keys lead to severe account takeover and data breach."
            },
            {
                "category": "Authentication Information",
                "type": "Google / Gemini API Key",
                "regex": re.compile(r"\bAIza[0-9A-Za-z\-_]{35}\b"),
                "severity": "Critical",
                "confidence": 0.98,
                "action": "Solid Blackout",
                "explanation": "Google / Firebase / Gemini API Key detected. Can be abused for unauthorized API quota billing."
            },
            {
                "category": "Authentication Information",
                "type": "JWT Access Token",
                "regex": re.compile(r"\beyJ[a-zA-Z0-9_\-]{10,}\.eyJ[a-zA-Z0-9_\-]{10,}\.[a-zA-Z0-9_\-]{10,}\b"),
                "severity": "Critical",
                "confidence": 0.97,
                "action": "Solid Blackout",
                "explanation": "JSON Web Token (JWT) session detected. Allows immediate session replay and identity spoofing."
            },
            {
                "category": "Authentication Information",
                "type": "Password / Credential",
                "regex": re.compile(r"(?i)\b(?:password|passwd|pwd|passcode)[\s:=]+['\"]?([^\s,;'\"]{4,32})['\"]?"),
                "severity": "Critical",
                "confidence": 0.94,
                "action": "Solid Blackout",
                "explanation": "Explicit plaintext password found. Immediate account compromise risk if shared."
            },
            {
                "category": "Authentication Information",
                "type": "One-Time Password (OTP) / 2FA Code",
                "regex": re.compile(r"(?i)\b(?:otp|one[- ]time password|2fa|verification code|security code)[\s:is]+(\d{4,8})\b"),
                "severity": "Critical",
                "confidence": 0.95,
                "action": "Solid Blackout",
                "explanation": "Time-based authentication code detected. Enables real-time two-factor authentication bypass."
            },
            {
                "category": "Authentication Information",
                "type": "API Key / Token Reference",
                "regex": re.compile(r"\b(?:api[_\s-]?tokens?|cloud\s*api\s*keys?|access[_\s-]?tokens?|secret[_\s-]?keys?|bearer\s*tokens?|auth[_\s-]?tokens?|\.env\b)", re.IGNORECASE),
                "severity": "Critical",
                "confidence": 0.96,
                "action": "Solid Blackout",
                "explanation": "Reference to API tokens, cloud keys, or environment secrets detected."
            },
            {
                "category": "Authentication Information",
                "type": "Password / Credential Reference",
                "regex": re.compile(r"\b(?:passwords?|passcodes?|pin\s*codes?|login\s*credentials?|auth\s*credentials?|secret\s*passphrase)\b", re.IGNORECASE),
                "severity": "High",
                "confidence": 0.94,
                "action": "Solid Blackout",
                "explanation": "Reference to password or login credentials detected."
            },
            {
                "category": "Authentication Information",
                "type": "Authentication Factor / OTP Reference",
                "regex": re.compile(r"\b(?:one[- ]time\s*passwords?|phone\s*&\s*otp|chat,\s*phone\s*&\s*otp|2fa\s*codes?|mfa\s*tokens?|verification\s*codes?)\b", re.IGNORECASE),
                "severity": "High",
                "confidence": 0.92,
                "action": "Solid Blackout",
                "explanation": "Reference to OTP, multi-factor, or phone verification authentication detected."
            },

            # ================= B. Financial Information =================
            {
                "category": "Financial Information",
                "type": "Payment Card (Luhn Checked)",
                "regex": re.compile(r"\b(?:\d{4}[ -]?){3}\d{4}\b|\b\d{15,16}\b"),
                "severity": "Critical",
                "confidence": 0.95,
                "action": "Solid Blackout",
                "validator": luhn_checksum_valid,
                "explanation": "Credit or debit card number detected with valid checksum. Unauthorized disclosure can cause fraudulent card charges."
            },
            {
                "category": "Financial Information",
                "type": "Card CVV / Expiry",
                "regex": re.compile(r"(?i)\b(?:cvv|cvc|security code)[\s:=]+(\d{3,4})\b|\b(?:exp|expires|expiry)[\s:=]+((?:0[1-9]|1[0-2])[\/\-]\d{2,4})\b"),
                "severity": "Critical",
                "confidence": 0.92,
                "action": "Solid Blackout",
                "explanation": "Card security code (CVV) or expiry date detected. Combined with card numbers, this enables instant checkout fraud."
            },
            {
                "category": "Financial Information",
                "type": "UPI ID (Digital Payment)",
                "regex": re.compile(r"\b[a-zA-Z0-9.\-_]{2,256}@(okhdfcbank|okaxis|oksbi|okicici|paytm|ybl|ibl|upi|axl|apl|barodampay|postbank)\b"),
                "severity": "High",
                "confidence": 0.96,
                "action": "Blur",
                "explanation": "UPI ID handle detected. Exposes personal banking identity and payment recipient target."
            },
            {
                "category": "Financial Information",
                "type": "Bank Account / IBAN",
                "regex": re.compile(r"\b[A-Z]{2}\d{2}[A-Z0-9]{4}\d{7}([A-Z0-9]?){0,16}\b|\b(?:account\s*(?:no|num|number)?[\s:#]+)(\d{8,18})\b", re.IGNORECASE),
                "severity": "High",
                "confidence": 0.91,
                "action": "Blur",
                "explanation": "Bank account number or international IBAN identifier detected. Exposes banking records and wire transfer vectors."
            },
            {
                "category": "Financial Information",
                "type": "Crypto Wallet Address",
                "regex": re.compile(r"\b(?:0x[a-fA-F0-9]{40}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})\b"),
                "severity": "High",
                "confidence": 0.93,
                "action": "Blur",
                "explanation": "Public cryptocurrency wallet address detected. Enables public blockchain balance and transaction tracking."
            },
            {
                "category": "Financial Information",
                "type": "Banking & Payment Details Reference",
                "regex": re.compile(r"\b(?:banking\s*details|bank\s*details|bank\s*&\s*credit\s*card|credit\s*cards?|debit\s*cards?|financial\s*records?|bank\s*statements?|account\s*details?|wire\s*transfers?|account\s*balance)\b", re.IGNORECASE),
                "severity": "High",
                "confidence": 0.95,
                "action": "Solid Blackout",
                "explanation": "Reference to banking details, credit cards, or financial accounts detected."
            },

            # ================= D. Identity Information =================
            {
                "category": "Identity Information",
                "type": "Social Security Number (SSN)",
                "regex": re.compile(r"\b(?!000|666|9\d{2})\d{3}-(?!00)\d{2}-(?!0000)\d{4}\b"),
                "severity": "Critical",
                "confidence": 0.96,
                "action": "Solid Blackout",
                "explanation": "US Social Security Number (SSN) detected. High risk of identity theft, synthetic identity fraud, and credit damage."
            },
            {
                "category": "Identity Information",
                "type": "Aadhaar Number",
                "regex": re.compile(r"\b[2-9]\d{3}\s\d{4}\s\d{4}\b"),
                "severity": "Critical",
                "confidence": 0.93,
                "action": "Solid Blackout",
                "explanation": "12-digit National Identity (Aadhaar) number detected. Exposure facilitates impersonation and unauthorized KYC queries."
            },
            {
                "category": "Identity Information",
                "type": "Permanent Account Number (PAN)",
                "regex": re.compile(r"\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b"),
                "severity": "High",
                "confidence": 0.94,
                "action": "Solid Blackout",
                "explanation": "National tax identification (PAN) card number detected. Exposes fiscal identity and tax records."
            },
            {
                "category": "Identity Information",
                "type": "Passport / Gov ID",
                "regex": re.compile(r"(?i)\b(?:passport\s*(?:no|num|#)?[\s:]+)([A-Z0-9]{7,10})\b|\b[A-PR-WYa-pr-wy][1-9]\d\s?\d{4}[1-9]\b"),
                "severity": "High",
                "confidence": 0.90,
                "action": "Solid Blackout",
                "explanation": "Passport or government travel identification number detected. High identity duplication risk."
            },
            {
                "category": "Identity Information",
                "type": "Employee / Student ID",
                "regex": re.compile(r"(?i)\b(?:emp(?:loyee)?\s*id|staff\s*id|student\s*id|badge\s*id)[\s:#]+([A-Z0-9\-]{4,15})\b"),
                "severity": "Medium",
                "confidence": 0.88,
                "action": "Blur",
                "explanation": "Organizational or institutional identifier detected. Reveals internal enterprise employment status."
            },
            {
                "category": "Identity Information",
                "type": "Personal Identity Reference",
                "regex": re.compile(r"\b(?:personal\s*identit(?:y|ies)|identifying\s*information|confidential\s*identit(?:y|ies)|national\s*id|identity\s*cards?|government\s*ids?)\b", re.IGNORECASE),
                "severity": "High",
                "confidence": 0.94,
                "action": "Blur",
                "explanation": "Reference to personally identifiable or individual identity records detected."
            },

            # ================= A. Personal Information =================
            {
                "category": "Personal Information",
                "type": "Email Address",
                "regex": re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b"),
                "severity": "Medium",
                "confidence": 0.97,
                "action": "Blur",
                "explanation": "Email address detected. Can be targeted for targeted spear-phishing, credential stuffing, and spam."
            },
            {
                "category": "Personal Information",
                "type": "Phone Number",
                "regex": re.compile(r"(?:(?:\+?[1-9]\d{0,2}[ -]?)?(?:\(?\d{3}\)?[ -]?|\b\d{3}[ -]?)\d{3}[ -]?\d{4}\b)|(?:\b[6-9]\d{9}\b)"),
                "severity": "Medium",
                "confidence": 0.92,
                "action": "Blur",
                "explanation": "Direct phone or mobile contact number detected. Exposes user to SIM swapping, unsolicited calls, and smishing attacks."
            },
            {
                "category": "Personal Information",
                "type": "Physical Street Address",
                "regex": re.compile(r"\b\d{1,5}\s+(?:[A-Za-z0-9\.]+\s+){1,4}(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Way|Suite|Apt|Apartment)\b", re.IGNORECASE),
                "severity": "High",
                "confidence": 0.89,
                "action": "Blur",
                "explanation": "Residential or physical street address detected. High personal physical safety and stalking concern."
            },
            {
                "category": "Personal Information",
                "type": "Full Name / Identity Context",
                "regex": re.compile(r"(?i)\b(?:name|full\s*name|account\s*holder|user|customer)[\s:#]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\b"),
                "severity": "Medium",
                "confidence": 0.86,
                "action": "Blur",
                "explanation": "Individual name identified in context. Personally identifiable information (PII)."
            },
            {
                "category": "Personal Information",
                "type": "Personal Communications & Contacts Reference",
                "regex": re.compile(r"\b(?:personal\s*contacts?|private\s*messages?|private\s*chats?|chat,\s*phone\s*&\s*otp|personal\s*emails?|private\s*photos?)\b", re.IGNORECASE),
                "severity": "Medium",
                "confidence": 0.91,
                "action": "Blur",
                "explanation": "Reference to personal contact channels or private communications detected."
            },

            # ================= E. Confidential Information =================
            {
                "category": "Confidential Information",
                "type": "Confidentiality Classification Label",
                "regex": re.compile(r"\b(?:CONFIDENTIAL|STRICTLY CONFIDENTIAL|INTERNAL ONLY|PROPRIETARY|RESTRICTED|DO NOT DISTRIBUTE|TOP SECRET|NDA PROTECTED)\b", re.IGNORECASE),
                "severity": "High",
                "confidence": 0.98,
                "action": "Solid Blackout",
                "explanation": "Enterprise confidentiality or trade secret marking detected. Unauthorized dissemination violates non-disclosure agreements."
            },
            {
                "category": "Confidential Information",
                "type": "Confidentiality Risk / Sensitive Privacy Data",
                "regex": re.compile(r"\b(?:confidentiality\s*risks?|confidential\s*data|confidential\s*information|privacy\s*risks?|sensitive\s*data|sensitive\s*information|trade\s*secrets?)\b", re.IGNORECASE),
                "severity": "Medium",
                "confidence": 0.92,
                "action": "Blur",
                "explanation": "Discussion or designation of confidential risk and sensitive data detected."
            },
            {
                "category": "Confidential Information",
                "type": "Internal IP / Network Address",
                "regex": re.compile(r"\b(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|127\.0\.0\.1|localhost:\d{2,5})\b"),
                "severity": "Medium",
                "confidence": 0.94,
                "action": "Pixelate",
                "explanation": "Internal corporate network IP or staging port exposed. Assisting network attackers in mapping internal topography."
            },
            {
                "category": "Confidential Information",
                "type": "Database Connection String",
                "regex": re.compile(r"(?i)\b(?:mongodb|postgres|mysql|redis):\/\/[^\s]+"),
                "severity": "Critical",
                "confidence": 0.97,
                "action": "Solid Blackout",
                "explanation": "Database URI with potential embedded authentication credentials detected. Extreme risk of database dump."
            }
        ]

    def scan_text(self, text, bounding_box=None):
        """
        Scans a given text segment against all sensitivity rules.
        Returns list of matched findings.
        """
        findings = []
        if not text:
            return findings

        for rule in self.patterns:
            matches = rule["regex"].finditer(text)
            for m in matches:
                matched_val = m.group(0).strip()
                if not matched_val:
                    continue

                # Run optional custom validator (e.g. Luhn algorithm for cards)
                if "validator" in rule and not rule["validator"](matched_val):
                    continue

                # Clean display text for safety in UI
                display_text = matched_val
                if len(display_text) > 40:
                    display_text = display_text[:37] + "..."

                findings.append({
                    "id": f"det_{uuid.uuid4().hex[:8]}",
                    "category": rule["category"],
                    "type": rule["type"],
                    "extracted_text": display_text,
                    "raw_text": matched_val,
                    "risk_severity": rule["severity"],
                    "confidence": rule["confidence"],
                    "bounding_box": bounding_box or {"x": 0, "y": 0, "width": 100, "height": 30},
                    "recommended_action": rule["action"],
                    "explanation": rule["explanation"],
                    "keep_visible": False, # Core principle: user chooses what to share, protected by default!
                    "protection_style": "blackout" if rule["action"] == "Solid Blackout" else ("pixelate" if rule["action"] == "Pixelate" else "blur")
                })

        return findings

    def scan_ocr_blocks(self, ocr_data):
        """
        Scans structured OCR word/line blocks with accurate bounding boxes.
        ocr_data is a list of dicts: {'text': str, 'box': {'x': int, 'y': int, 'width': int, 'height': int}, 'conf': float}
        """
        all_detections = []
        
        # 1. Scan line-by-line / block-by-block
        full_text_buffer = []
        for item in ocr_data:
            text = item.get("text", "").strip()
            box = item.get("box", {"x": 0, "y": 0, "width": 50, "height": 20})
            if not text:
                continue
            
            full_text_buffer.append(text)
            matches = self.scan_text(text, bounding_box=box)
            all_detections.extend(matches)

        # 2. Also scan entire concatenated text to catch multi-word or spaced patterns (e.g., phone numbers or card numbers split across OCR words)
        combined_text = " ".join(full_text_buffer)
        for rule in self.patterns:
            matches = rule["regex"].finditer(combined_text)
            for m in matches:
                matched_val = m.group(0).strip()
                if "validator" in rule and not rule["validator"](matched_val):
                    continue
                
                # Check if this matched item is already detected
                already_found = any(d["raw_text"] in matched_val or matched_val in d["raw_text"] for d in all_detections)
                if not already_found:
                    # Find approximate bounding box from tokens that comprise this match
                    matched_box = self._find_approximate_box_for_text(matched_val, ocr_data)
                    display_text = matched_val[:37] + "..." if len(matched_val) > 40 else matched_val
                    
                    all_detections.append({
                        "id": f"det_{uuid.uuid4().hex[:8]}",
                        "category": rule["category"],
                        "type": rule["type"],
                        "extracted_text": display_text,
                        "raw_text": matched_val,
                        "risk_severity": rule["severity"],
                        "confidence": rule["confidence"],
                        "bounding_box": matched_box,
                        "recommended_action": rule["action"],
                        "explanation": rule["explanation"],
                        "keep_visible": False,
                        "protection_style": "blackout" if rule["action"] == "Solid Blackout" else ("pixelate" if rule["action"] == "Pixelate" else "blur")
                    })

        return all_detections

    def _find_approximate_box_for_text(self, text, ocr_data):
        """Finds bounding box enclosing the tokens corresponding to text sequence."""
        if not text or not ocr_data:
            return {"x": 10, "y": 10, "width": 150, "height": 30}

        target_words = [w.lower().strip(".,;:?!'\"()[]{}") for w in text.split()]
        target_words = [w for w in target_words if w]
        if not target_words:
            return ocr_data[0].get("box", {"x": 10, "y": 10, "width": 150, "height": 30})

        n = len(ocr_data)
        # Search for consecutive subsequence match in ocr_data
        for i in range(n):
            matched_boxes = []
            target_idx = 0
            for j in range(i, min(n, i + len(target_words) + 4)):
                token_text = ocr_data[j].get("text", "").lower().strip(".,;:?!'\"()[]{}")
                if not token_text:
                    continue
                if target_idx < len(target_words) and (target_words[target_idx] in token_text or token_text in target_words[target_idx]):
                    matched_boxes.append(ocr_data[j].get("box"))
                    target_idx += 1
                    if target_idx == len(target_words):
                        min_x = min(b["x"] for b in matched_boxes)
                        min_y = min(b["y"] for b in matched_boxes)
                        max_x = max(b["x"] + b["width"] for b in matched_boxes)
                        max_y = max(b["y"] + b["height"] for b in matched_boxes)
                        return {
                            "x": int(min_x),
                            "y": int(min_y),
                            "width": max(10, int(max_x - min_x)),
                            "height": max(10, int(max_y - min_y))
                        }

        # Fallback to nearest cluster of words on similar y coordinate
        candidate_boxes = []
        for w in target_words:
            for item in ocr_data:
                token_clean = item.get("text", "").lower().strip(".,;:?!'\"()[]{}")
                if w in token_clean or token_clean in w:
                    b = item.get("box")
                    if b:
                        candidate_boxes.append(b)
                        break

        if candidate_boxes:
            median_y = sorted([b["y"] for b in candidate_boxes])[len(candidate_boxes) // 2]
            close_boxes = [b for b in candidate_boxes if abs(b["y"] - median_y) < 60]
            boxes_to_use = close_boxes if close_boxes else candidate_boxes
            min_x = min(b["x"] for b in boxes_to_use)
            min_y = min(b["y"] for b in boxes_to_use)
            max_x = max(b["x"] + b["width"] for b in boxes_to_use)
            max_y = max(b["y"] + b["height"] for b in boxes_to_use)
            return {
                "x": int(min_x),
                "y": int(min_y),
                "width": max(10, int(max_x - min_x)),
                "height": max(10, int(max_y - min_y))
            }

        return ocr_data[0].get("box", {"x": 10, "y": 10, "width": 150, "height": 30})
