class RiskScorer:
    def __init__(self):
        self.severity_weights = {
            "Critical": 35,
            "High": 20,
            "Normal": 10,
            "Medium": 10,
            "Low": 5
        }

        self.category_multipliers = {
            "Authentication Information": 1.25,
            "Financial Information": 1.2,
            "Identity Information": 1.15,
            "Personal Information": 1.0,
            "Confidential Information": 1.05
        }

    def calculate_score(self, detections, metadata_findings=None):
        """
        Calculates transparent confidentiality risk score (0-100)
        and categorizes 3-tier risk level (Critical, High, Normal).
        Guarantees that when detections exist, risk score is never 0.
        """
        if not detections and not metadata_findings:
            return {
                "score": 0,
                "classification": "Low Risk",
                "color": "#10b981", # Emerald
                "total_items": 0,
                "breakdown": {
                    "Critical": 0,
                    "High": 0,
                    "Normal": 0,
                    "Medium": 0,
                    "Low": 0
                },
                "category_breakdown": {},
                "explanation": "No sensitive data patterns found. Keep visible or manually redact if desired.",
                "factor_reasons": ["Clean file", "No sensitive PII found"]
            }

        total_weight = 0.0
        breakdown = {"Critical": 0, "High": 0, "Normal": 0, "Medium": 0, "Low": 0}
        category_breakdown = {}
        factor_reasons = []

        for det in detections:
            sev = det.get("risk_severity", "Normal")
            # Normalize severity labels
            if sev not in self.severity_weights:
                sev = "Normal" if sev in ("Medium", "Low") else "High"

            cat = det.get("category", "Personal Information")
            conf = det.get("confidence", 0.9)
            
            breakdown[sev] = breakdown.get(sev, 0) + 1
            category_breakdown[cat] = category_breakdown.get(cat, 0) + 1

            sev_wt = self.severity_weights.get(sev, 10)
            cat_mult = self.category_multipliers.get(cat, 1.0)
            item_score = sev_wt * cat_mult * conf
            total_weight += item_score

        # Check metadata leaks (e.g. EXIF GPS)
        if metadata_findings and metadata_findings.get("has_gps"):
            total_weight += 20
            factor_reasons.append("Exact GPS location coordinates found embedded in file metadata.")

        # Cross-category compounding risk
        unique_categories = len(category_breakdown)
        if unique_categories >= 3:
            total_weight += 10
            factor_reasons.append(f"Multi-vector exposure: Contains {unique_categories} different privacy categories simultaneously.")
        elif unique_categories == 2:
            total_weight += 5

        # Guaranteed minimum 15 when sensitive data is detected (never 0/100)
        raw_score = max(15, int(min(100, round(total_weight))))
        
        # Determine classification:
        # Critical (Red >= 75), High (Orange >= 50), Normal / Medium (Yellow >= 25)
        if raw_score >= 75 or breakdown.get("Critical", 0) > 0:
            classification = "Critical Risk"
            color = "#ef4444" # Red
        elif raw_score >= 50 or breakdown.get("High", 0) > 0:
            classification = "High Risk"
            color = "#f97316" # Orange
        elif raw_score >= 25:
            classification = "Normal Risk"
            color = "#eab308" # Yellow
        else:
            classification = "Low Risk"
            color = "#10b981" # Emerald

        # Generate human-friendly explanations
        if breakdown.get("Critical", 0) > 0:
            factor_reasons.append(f"{breakdown['Critical']} critical identifier(s) (Aadhaar, PAN, Bank A/C, Cards) auto-protected.")
        if breakdown.get("High", 0) > 0:
            factor_reasons.append(f"{breakdown['High']} high-risk identifier(s) (UPI/UTR, passwords, credentials) detected.")
        if breakdown.get("Normal", 0) > 0:
            factor_reasons.append(f"{breakdown['Normal']} personal item(s) (email, phone, marks) awaiting user review.")

        explanation = f"Calculated {classification} score ({raw_score}/100) across {len(detections)} detected privacy factors. " + " ".join(factor_reasons)

        return {
            "score": raw_score,
            "classification": classification,
            "color": color,
            "total_items": len(detections),
            "breakdown": breakdown,
            "category_breakdown": category_breakdown,
            "explanation": explanation,
            "factor_reasons": factor_reasons
        }

    def calculate_residual_risk(self, detections, manual_boxes=None):
        """
        Calculates residual risk score after user has chosen which items to protect.
        Protected items (blackout, blur, pixelate) drop the risk score.
        Items marked 'keep_visible: True' retain their risk weight.
        """
        unprotected_detections = [d for d in detections if d.get("keep_visible", False) is True]
        
        if not unprotected_detections:
            return {
                "residual_score": 0,
                "residual_classification": "Low Risk (All Sensitive Items Protected)",
                "color": "#10b981",
                "reduction_percent": 100,
                "message": "All sensitive items are securely protected. Safe for sharing."
            }

        res = self.calculate_score(unprotected_detections)
        orig = self.calculate_score(detections)
        orig_score = max(orig["score"], 1)
        reduction = max(0, min(100, int((1 - res["score"] / orig_score) * 100)))

        return {
            "residual_score": res["score"],
            "residual_classification": res["classification"],
            "color": res["color"],
            "reduction_percent": reduction,
            "message": f"Residual risk: {res['score']}/100 ({reduction}% reduction). {len(unprotected_detections)} normal item(s) kept visible."
        }
