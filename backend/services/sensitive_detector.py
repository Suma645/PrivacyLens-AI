import re
import uuid

def luhn_checksum_valid(card_num_str):
    """Verifies credit/debit card number using Luhn algorithm."""
    # If card is partially masked (e.g. 4532 **** 1092), skip Luhn and accept pattern
    if '*' in card_num_str or 'X' in card_num_str or 'x' in card_num_str:
        return True
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

def mask_sensitive_value(typ, text):
    """Generates safely masked representation for display in UI tables."""
    if not text:
        return "••••••"
    s = str(text).strip()
    t = typ.lower()

    if "aadhaar" in t:
        digits = re.sub(r"\D", "", s)
        if len(digits) == 12:
            return f"{digits[:4]} •••• {digits[8:]}"
        return s[:4] + " •••• " + s[-4:] if len(s) >= 8 else "••••••••"

    if "pan" in t:
        if len(s) == 10:
            return f"{s[:4]}••••{s[-1]}"
        return s[:3] + "••••" + s[-2:] if len(s) >= 6 else "••••••••"

    if "account" in t or "a/c" in t or "iban" in t:
        digits = re.sub(r"\D", "", s)
        if len(digits) >= 4:
            return f"••••••••{digits[-4:]}"
        return "••••••••" + s[-3:] if len(s) >= 4 else "••••••••"

    if "ifsc" in t:
        if len(s) == 11:
            return f"{s[:4]}••••{s[-3:]}"
        return s[:4] + "••••" if len(s) >= 4 else "••••••••"

    if "card" in t:
        clean = re.sub(r"[^0-9X*]", "", s)
        if len(clean) >= 12:
            return f"{clean[:4]} •••• •••• {clean[-4:]}"
        return s[:4] + " •••• " + s[-4:] if len(s) >= 8 else "••••••••"

    if "upi" in t or "@" in s:
        parts = s.split("@")
        if len(parts) == 2:
            name = parts[0]
            masked_name = f"{name[0]}••••{name[-1]}" if len(name) > 2 else f"{name[0]}••••"
            return f"{masked_name}@{parts[1]}"

    if "phone" in t or "mobile" in t:
        digits = re.sub(r"\D", "", s)
        if len(digits) >= 10:
            return f"{digits[:2]}••••••{digits[-2:]}"
        return s[:3] + "••••" + s[-2:] if len(s) >= 6 else "••••••••"

    if any(k in t for k in ["password", "key", "token", "secret", "cvv"]):
        return "••••••••••••"

    if "otp" in t or "2fa" in t:
        return "•••" + s[-2:] if len(s) >= 4 else "••••••"

    if len(s) > 8:
        return f"{s[:3]}••••{s[-3:]}"

    return s

class SensitiveDetector:
    def __init__(self):
        # 3-Tier Intelligent Priority Classification System
        # CRITICAL – Red: Aadhaar, PAN, Bank account, IFSC, Cards, SSN
        # HIGH – Orange: UPI ID, UTR, Passwords, OTPs, API keys, Private keys
        # NORMAL – Yellow: Email, Phone, Marks & Grades, Names, Addresses, DOB
        self.patterns = [
            # ================= 1. CRITICAL – Red (Auto-Protected / Solid Blackout) =================
            {
                "category": "Identity Information",
                "type": "Aadhaar Number",
                "regex": re.compile(r"\b[2-9]\d{3}[ -]?\d{4}[ -]?\d{4}\b|\b\d{4}\s\d{4}\s\d{4}\b"),
                "severity": "Critical",
                "priority": "critical",
                "confidence": 0.98,
                "default_keep_visible": False,
                "action": "Solid Blackout",
                "explanation": "12-digit Indian National Identity (Aadhaar) number detected. Critical government PII; automatically protected with solid blackout."
            },
            {
                "category": "Identity Information",
                "type": "Permanent Account Number (PAN)",
                "regex": re.compile(r"\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b"),
                "severity": "Critical",
                "priority": "critical",
                "confidence": 0.98,
                "default_keep_visible": False,
                "action": "Solid Blackout",
                "explanation": "National tax identification (PAN) card detected. Critical fiscal identifier; automatically protected with solid blackout."
            },
            {
                "category": "Financial Information",
                "type": "Bank Account Number",
                "regex": re.compile(r"(?i)\b(?:account|acct|a\/c|acc|debited\s*from|credited\s*to)[\s\S]{0,35}?(?:x{2,}|\*{2,}|\.{2,})?([0-9]{3,24})\b|\b(?:ending\s*(?:with|in))[\s:#]+([0-9]{4})\b"),
                "severity": "Critical",
                "priority": "critical",
                "confidence": 0.97,
                "default_keep_visible": False,
                "action": "Solid Blackout",
                "explanation": "Bank account number or linked account identifier detected. Automatically protected with solid blackout."
            },
            {
                "category": "Financial Information",
                "type": "Bank IFSC Code",
                "regex": re.compile(r"\b[A-Z]{4}0[A-Z0-9]{6}\b"),
                "severity": "Critical",
                "priority": "critical",
                "confidence": 0.97,
                "default_keep_visible": False,
                "action": "Solid Blackout",
                "explanation": "Indian Financial System Code (IFSC) detected. Identifies specific bank branch; automatically protected."
            },
            {
                "category": "Financial Information",
                "type": "Payment Card (Luhn Checked)",
                "regex": re.compile(r"\b(?:\d{4}[ -]?\d{4}[ -]?\d{4}[ -]?\d{1,4}|\d{4}[ -]?(?:\*{4}|X{4})[ -]?(?:\*{4}|X{4})[ -]?\d{4}|(?:\*{4}|X{4})[ -]?(?:\*{4}|X{4})[ -]?(?:\*{4}|X{4})[ -]?\d{4})\b"),
                "severity": "Critical",
                "priority": "critical",
                "confidence": 0.97,
                "validator": luhn_checksum_valid,
                "default_keep_visible": False,
                "action": "Solid Blackout",
                "explanation": "Credit or debit card number detected. Critical financial asset; automatically protected with solid blackout."
            },
            {
                "category": "Financial Information",
                "type": "Card CVV Code",
                "regex": re.compile(r"(?i)\b(?:cvv|cvc|security code)[\s:=]+(\d{3,4})\b"),
                "severity": "Critical",
                "priority": "critical",
                "confidence": 0.98,
                "default_keep_visible": False,
                "action": "Solid Blackout",
                "explanation": "Card security code (CVV) detected. Critical payment secret; automatically protected."
            },
            {
                "category": "Identity Information",
                "type": "Social Security Number (SSN)",
                "regex": re.compile(r"\b(?!000|666|9\d{2})\d{3}-(?!00)\d{2}-(?!0000)\d{4}\b"),
                "severity": "Critical",
                "priority": "critical",
                "confidence": 0.97,
                "default_keep_visible": False,
                "action": "Solid Blackout",
                "explanation": "Social Security Number (SSN) detected. High risk of identity theft; automatically protected."
            },
            {
                "category": "Identity Information",
                "type": "Passport ID",
                "regex": re.compile(r"(?i)\b(?:passport\s*(?:no|num|#)?[\s:]+)([A-Z0-9]{7,10})\b|\b[A-PR-WYa-pr-wy][1-9]\d\s?\d{4}[1-9]\b"),
                "severity": "Critical",
                "priority": "critical",
                "confidence": 0.94,
                "default_keep_visible": False,
                "action": "Solid Blackout",
                "explanation": "Government passport travel identity detected. Automatically protected."
            },

            # ================= 2. HIGH – Orange (Financial & Identity Protections) =================
            {
                "category": "Financial Information",
                "type": "UPI ID / Virtual Payment Address",
                "regex": re.compile(r"\b[a-zA-Z0-9.\-_]{2,}@(okhdfcbank|oksbi|okaxis|okicici|ybl|ibl|axl|paytm|upi|apl|sbi|hdfcbank|icici|kotak|postbank|barodampay|federal|allbank|cnrb|idbi|pnb|boi|rbl|indus|citi|yesbank|aubank|fbl|jupiteraxis|pz)\b|\b(?:upi\s*id|vpa|payee\s*upi|pay\s*to)[\s:=]+([a-zA-Z0-9.\-_]{2,}@[a-zA-Z0-9.\-_]{2,})\b", re.IGNORECASE),
                "severity": "High",
                "priority": "high",
                "confidence": 0.96,
                "default_keep_visible": False,
                "action": "Gaussian Blur",
                "explanation": "Virtual Payment Address / UPI ID detected. Direct financial payment endpoint."
            },
            {
                "category": "Financial Information",
                "type": "UPI Ref No. / UTR / Transaction ID",
                "regex": re.compile(r"(?i)\b(?:upi\s*(?:ref|transaction|txn)(?:\s*no\.?|\s*id)?|utr(?:\s*no\.?)?|txn\s*(?:id|no\.?)?|transaction\s*(?:id|no\.?)?|reference\s*(?:no\.?)?|ref\s*id|order\s*id)[\s:=#]+([A-Za-z0-9_\-]{6,36})\b|\b(?:utr|upi\s*ref)[\s:#]+(\d{12})\b"),
                "severity": "High",
                "priority": "high",
                "confidence": 0.96,
                "default_keep_visible": False,
                "action": "Gaussian Blur",
                "explanation": "Financial transaction reference (UTR / UPI Ref / Transaction ID) detected. Proof of payment receipt."
            },
            {
                "category": "Authentication Information",
                "type": "Password / Credential",
                "regex": re.compile(r"(?i)\b(?:password|passwd|pwd|passcode)[\s:=]+['\"]?([^\s,;'\"]{4,32})['\"]?"),
                "severity": "High",
                "priority": "high",
                "confidence": 0.95,
                "default_keep_visible": False,
                "action": "Gaussian Blur",
                "explanation": "Plaintext login password or credential detected."
            },
            {
                "category": "Authentication Information",
                "type": "One-Time Password (OTP) / 2FA",
                "regex": re.compile(r"(?i)\b(?:otp|one[- ]time password|2fa|verification code|security code)[\s:is]+(\d{4,8})\b"),
                "severity": "High",
                "priority": "high",
                "confidence": 0.95,
                "default_keep_visible": False,
                "action": "Gaussian Blur",
                "explanation": "Time-based authentication code detected. Enables real-time two-factor bypass."
            },
            {
                "category": "Authentication Information",
                "type": "API Key / Access Token",
                "regex": re.compile(r"(?i)\b(?:api[_-]?key|secret[_-]?key|client[_-]?secret|auth[_-]?token)[\s:=]+['\"]?([A-Za-z0-9\-_]{16,64})['\"]?|\bAKIA[0-9A-Z]{16}\b|\bAIza[0-9A-Za-z\-_]{35}\b"),
                "severity": "High",
                "priority": "high",
                "confidence": 0.96,
                "default_keep_visible": False,
                "action": "Gaussian Blur",
                "explanation": "Cloud API Key, AWS Access Key or Secret Token detected."
            },
            {
                "category": "Authentication Information",
                "type": "Private Key",
                "regex": re.compile(r"-----BEGIN (?:RSA|EC|OPENSSH|DSA|PRIVATE) KEY-----", re.IGNORECASE),
                "severity": "High",
                "priority": "high",
                "confidence": 0.99,
                "default_keep_visible": False,
                "action": "Gaussian Blur",
                "explanation": "Cryptographic private key detected."
            },
            {
                "category": "Financial Information",
                "type": "Payment App / Transaction Status",
                "regex": re.compile(r"(?i)\b(?:google\s*pay|gpay|phonepe|paytm|bhim\s*upi|payment\s*successful|paid\s*successfully|transfer\s*successful|payment\s*completed|money\s*sent|paid\s*to\b|payment\s*to\b|banking\s*name)"),
                "severity": "High",
                "priority": "high",
                "confidence": 0.93,
                "default_keep_visible": False,
                "action": "Gaussian Blur",
                "explanation": "Payment application receipt or transaction confirmation status detected."
            },

            # ================= 3. NORMAL – Yellow (Manual User Control / Kept Visible by Default) =================
            {
                "category": "Personal Information",
                "type": "Email Address",
                "regex": re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b"),
                "severity": "Normal",
                "priority": "normal",
                "confidence": 0.97,
                "default_keep_visible": True,
                "action": "Blur",
                "explanation": "Personal or corporate email address detected. Normal personal info (kept visible by default; manual toggle to blur)."
            },
            {
                "category": "Personal Information",
                "type": "Phone Number",
                "regex": re.compile(r"(?:(?:\+?[1-9]\d{0,2}[ -]?)?(?:\(?\d{3}\)?[ -]?|\b\d{3}[ -]?)\d{3}[ -]?\d{4}\b)|(?:\b[6-9]\d{9}\b)"),
                "severity": "Normal",
                "priority": "normal",
                "confidence": 0.92,
                "default_keep_visible": True,
                "action": "Blur",
                "explanation": "Phone contact number detected. Normal personal info (kept visible by default; manual toggle to blur)."
            },
            {
                "category": "Personal Information",
                "type": "Student Marks / Grade",
                "regex": re.compile(r"(?i)\b(?:marks?|percentage|score|grade|aggregate|cgpa|sgpa|total|examination\s*results?)[\s:=]+(\d{1,3}(?:\.\d{1,2})?\s?%|\d{1,2}(?:\.\d{1,2})?\s*(?:\/\s*(?:100|10|50))?)\b|\b\d{1,3}(?:\.\d{1,2})?%\b|\b(?:[0-9]|10)\.\d{1,2}\s*(?:cgpa|sgpa|gpa)\b"),
                "severity": "Normal",
                "priority": "normal",
                "confidence": 0.90,
                "default_keep_visible": True,
                "action": "Blur",
                "explanation": "Student marks, percentage, or CGPA detected with context. Normal personal info (kept visible by default; manual toggle to blur)."
            },
            {
                "category": "Personal Information",
                "type": "Full Name / Identity Context",
                "regex": re.compile(r"(?i)\b(?:name|full\s*name|account\s*holder|user|customer|student\s*name)[\s:#]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\b"),
                "severity": "Normal",
                "priority": "normal",
                "confidence": 0.88,
                "default_keep_visible": True,
                "action": "Blur",
                "explanation": "Individual name identified in context. Normal personal info (kept visible by default; manual toggle to blur)."
            },
            {
                "category": "Personal Information",
                "type": "Residential Address",
                "regex": re.compile(r"\b\d{1,5}\s+(?:[A-Za-z0-9\.]+\s+){1,4}(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Way|Suite|Apt|Apartment)\b", re.IGNORECASE),
                "severity": "Normal",
                "priority": "normal",
                "confidence": 0.89,
                "default_keep_visible": True,
                "action": "Blur",
                "explanation": "Residential address detected. Normal personal info (kept visible by default; manual toggle to blur)."
            },
            {
                "category": "Personal Information",
                "type": "Date of Birth",
                "regex": re.compile(r"(?i)\b(?:dob|date\s*of\s*birth|born\s*on)[\s:=]+(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\b"),
                "severity": "Normal",
                "priority": "normal",
                "confidence": 0.92,
                "default_keep_visible": True,
                "action": "Blur",
                "explanation": "Date of birth detected. Normal personal info (kept visible by default; manual toggle to blur)."
            },
            {
                "category": "Financial Information",
                "type": "Payment Amount",
                "regex": re.compile(r"(?:₹|rs\.?|inr|usd|\$)\s*[0-9]+(?:,[0-9]{2,3})*(?:\.[0-9]{2})?|\b(?:amount|paid|total|sent|debited)[\s:=]+(?:₹|rs\.?|inr|usd|\$)?\s*[0-9]+(?:,[0-9]{2,3})*(?:\.[0-9]{2})?\b", re.IGNORECASE),
                "severity": "Normal",
                "priority": "normal",
                "confidence": 0.91,
                "default_keep_visible": True,
                "action": "Blur",
                "explanation": "Transaction amount detected. Normal info (kept visible by default; manual toggle to blur)."
            },
            {
                "category": "Confidential Information",
                "type": "Confidential Watermark / Label",
                "regex": re.compile(r"\b(?:CONFIDENTIAL|STRICTLY CONFIDENTIAL|INTERNAL ONLY|PROPRIETARY|RESTRICTED|DO NOT DISTRIBUTE|TOP SECRET|NDA PROTECTED)\b", re.IGNORECASE),
                "severity": "High",
                "priority": "high",
                "confidence": 0.98,
                "default_keep_visible": False,
                "action": "Gaussian Blur",
                "explanation": "Enterprise confidentiality or trade secret marking detected."
            }
        ]

    def scan_text(self, text, location=None, bounding_box=None):
        """
        Scans a given text segment against all sensitivity rules.
        Returns list of matched findings with location and masking.
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

                if "validator" in rule and not rule["validator"](matched_val):
                    continue

                display_text = matched_val
                if len(display_text) > 40:
                    display_text = display_text[:37] + "..."

                masked_val = mask_sensitive_value(rule["type"], matched_val)

                findings.append({
                    "id": f"det_{uuid.uuid4().hex[:8]}",
                    "category": rule["category"],
                    "type": rule["type"],
                    "extracted_text": display_text,
                    "raw_text": matched_val,
                    "masked_value": masked_val,
                    "location": location or "Page 1",
                    "risk_severity": rule["severity"],
                    "priority": rule.get("priority", "normal"),
                    "confidence": rule["confidence"],
                    "bounding_box": bounding_box or {"x": 0, "y": 0, "width": 100, "height": 30},
                    "recommended_action": rule["action"],
                    "keep_visible": rule.get("default_keep_visible", False),
                    "protection_style": "blackout" if rule.get("action") == "Solid Blackout" else "blur",
                    "explanation": rule["explanation"]
                })

        return findings

    def scan_ocr_blocks(self, ocr_data, location="Page 1"):
        """
        Scans structured OCR word/line blocks with accurate bounding boxes.
        """
        all_detections = []
        full_text_buffer = []

        for item in ocr_data:
            text = item.get("text", "").strip()
            box = item.get("box", {"x": 0, "y": 0, "width": 50, "height": 20})
            if not text:
                continue

            full_text_buffer.append(text)
            matches = self.scan_text(text, location=location, bounding_box=box)
            all_detections.extend(matches)

        # Also scan combined text stream to catch multi-token patterns
        combined_text = " ".join(full_text_buffer)
        for rule in self.patterns:
            matches = rule["regex"].finditer(combined_text)
            for m in matches:
                matched_val = m.group(0).strip()
                if not matched_val:
                    continue
                if "validator" in rule and not rule["validator"](matched_val):
                    continue

                already_found = any(d["raw_text"] in matched_val or matched_val in d["raw_text"] for d in all_detections)
                if not already_found:
                    matched_box = self._find_approximate_box_for_text(matched_val, ocr_data)
                    display_text = matched_val[:37] + "..." if len(matched_val) > 40 else matched_val
                    masked_val = mask_sensitive_value(rule["type"], matched_val)

                    all_detections.append({
                        "id": f"det_{uuid.uuid4().hex[:8]}",
                        "category": rule["category"],
                        "type": rule["type"],
                        "extracted_text": display_text,
                        "raw_text": matched_val,
                        "masked_value": masked_val,
                        "location": location,
                        "risk_severity": rule["severity"],
                        "priority": rule.get("priority", "normal"),
                        "confidence": rule["confidence"],
                        "bounding_box": matched_box,
                        "recommended_action": rule["action"],
                        "keep_visible": rule.get("default_keep_visible", False),
                        "protection_style": "blackout" if rule.get("action") == "Solid Blackout" else "blur",
                        "explanation": rule["explanation"]
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

        # Fallback
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
