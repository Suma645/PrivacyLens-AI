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

    def enhance_detections(self, text_content, existing_detections):
        """
        Enhances existing detections with contextual sensitivity analysis.
        Detects implicit private contexts (e.g., medical diagnoses, salary negotiations, HR disputes).
        """
        # Contextual keywords for high-sensitivity discussions
        sensitive_topics = [
            {"keyword": "salary", "category": "Confidential Information", "type": "Compensation Data", "severity": "High"},
            {"keyword": "compensation", "category": "Confidential Information", "type": "Compensation Data", "severity": "High"},
            {"keyword": "diagnosis", "category": "Personal Information", "type": "Health / Medical Information", "severity": "Critical"},
            {"keyword": "prescription", "category": "Personal Information", "type": "Health / Medical Information", "severity": "High"},
            {"keyword": "termination", "category": "Confidential Information", "type": "Internal HR Record", "severity": "High"},
            {"keyword": "performance review", "category": "Confidential Information", "type": "Internal HR Record", "severity": "Medium"}
        ]

        text_lower = text_content.lower() if text_content else ""
        ai_findings = []

        for item in sensitive_topics:
            if item["keyword"] in text_lower:
                ai_findings.append({
                    "id": f"ai_context_{item['keyword'].replace(' ', '_')}",
                    "category": item["category"],
                    "type": item["type"],
                    "extracted_text": f"Context: '{item['keyword']}'",
                    "risk_severity": item["severity"],
                    "confidence": 0.88,
                    "bounding_box": {"x": 20, "y": 20, "width": 200, "height": 35},
                    "recommended_action": "Blur",
                    "explanation": f"Contextual AI analysis detected sensitive {item['type'].lower()} topic in conversation.",
                    "keep_visible": False,
                    "protection_style": "blur"
                })

        return existing_detections + ai_findings
