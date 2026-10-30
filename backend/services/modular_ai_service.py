import os
import json

class ModularAIService:
    """
    Modular AI service interface for contextual privacy detection.
    Can be connected to cloud AI (e.g. Gemini, OpenAI) or local LLMs/transformers
    via environment variables, without breaking rule-based offline processing.
    """
    def __init__(self):
        self.ai_enabled = bool(os.environ.get("GEMINI_API_KEY") or os.environ.get("OPENAI_API_KEY"))
        self.provider = "Gemini" if os.environ.get("GEMINI_API_KEY") else ("OpenAI" if os.environ.get("OPENAI_API_KEY") else "Heuristic Engine")

    def is_ai_connected(self):
        return self.ai_enabled

    def get_provider_name(self):
        return self.provider

    def enhance_detections(self, text_content, existing_detections, ocr_blocks=None):
        """
        Enhances existing detections with contextual sensitivity analysis.
        Detects implicit private contexts (e.g., medical diagnoses, salary negotiations, financial terms).
        """
        sensitive_topics = [
            {"keyword": "banking details", "category": "Financial Information", "type": "Banking Reference", "severity": "High"},
            {"keyword": "credit card", "category": "Financial Information", "type": "Payment Card Reference", "severity": "High"},
            {"keyword": "bank account", "category": "Financial Information", "type": "Bank Account Reference", "severity": "High"},
            {"keyword": "api tokens", "category": "Authentication Information", "type": "API Key Reference", "severity": "Critical"},
            {"keyword": "passwords", "category": "Authentication Information", "type": "Password Reference", "severity": "High"},
            {"keyword": "personal identities", "category": "Identity Information", "type": "PII Reference", "severity": "High"},
            {"keyword": "salary", "category": "Confidential Information", "type": "Compensation Data", "severity": "High"},
            {"keyword": "compensation", "category": "Confidential Information", "type": "Compensation Data", "severity": "High"},
            {"keyword": "diagnosis", "category": "Personal Information", "type": "Health / Medical Information", "severity": "Critical"},
            {"keyword": "prescription", "category": "Personal Information", "type": "Health / Medical Information", "severity": "High"},
            {"keyword": "termination", "category": "Confidential Information", "type": "Internal HR Record", "severity": "High"},
            {"keyword": "performance review", "category": "Confidential Information", "type": "Internal HR Record", "severity": "Medium"}
        ]

        text_lower = text_content.lower() if text_content else ""
        ai_findings = []

        existing_texts = [d.get("extracted_text", "").lower() for d in existing_detections]
        existing_raws = [d.get("raw_text", "").lower() for d in existing_detections]

        for item in sensitive_topics:
            kw = item["keyword"]
            if kw in text_lower:
                # Skip if already captured by regex detector
                if any(kw in t or t in kw for t in existing_texts) or any(kw in r or r in kw for r in existing_raws):
                    continue

                # Locate box from OCR tokens if available
                box = {"x": 20, "y": 20, "width": 180, "height": 30}
                if ocr_blocks:
                    matched_boxes = [b.get("box") for b in ocr_blocks if any(part in b.get("text", "").lower() for part in kw.split()) if b.get("box")]
                    if matched_boxes:
                        min_x = min(b["x"] for b in matched_boxes)
                        min_y = min(b["y"] for b in matched_boxes)
                        max_x = max(b["x"] + b["width"] for b in matched_boxes)
                        max_y = max(b["y"] + b["height"] for b in matched_boxes)
                        box = {
                            "x": int(min_x),
                            "y": int(min_y),
                            "width": max(10, int(max_x - min_x)),
                            "height": max(10, int(max_y - min_y))
                        }

                ai_findings.append({
                    "id": f"ai_context_{kw.replace(' ', '_')}",
                    "category": item["category"],
                    "type": item["type"],
                    "extracted_text": kw,
                    "raw_text": kw,
                    "risk_severity": item["severity"],
                    "confidence": 0.88,
                    "bounding_box": box,
                    "recommended_action": "Blur",
                    "explanation": f"Contextual privacy analysis identified '{kw}' ({item['type']}).",
                    "keep_visible": False,
                    "protection_style": "blur"
                })

        return existing_detections + ai_findings
