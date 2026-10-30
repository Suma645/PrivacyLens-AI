class RiskScorer:
    def __init__(self):
        self.severity_weights = {
            "Critical": 35,
            "High": 20,
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
        Calculates a transparent confidentiality risk score (0-100)
        and categorizes risk level and breakdown.
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
                    "Medium": 0,
                    "Low": 0
                },
                "category_breakdown": {},
                "explanation": "No sensitive data patterns, facial identities, or authentication credentials detected in this screenshot.",
                "factor_reasons": ["Clean image", "No credentials or PII found"]
            }

        total_weight = 0.0
        breakdown = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}
        category_breakdown = {}
        factor_reasons = []

        for det in detections:
            sev = det.get("risk_severity", "Low")
            cat = det.get("category", "Confidential Information")
            conf = det.get("confidence", 0.9)
            
            breakdown[sev] = breakdown.get(sev, 0) + 1
            category_breakdown[cat] = category_breakdown.get(cat, 0) + 1

            sev_wt = self.severity_weights.get(sev, 5)
            cat_mult = self.category_multipliers.get(cat, 1.0)
            item_score = sev_wt * cat_mult * conf
            total_weight += item_score

        # Check metadata leaks (e.g. EXIF GPS)
        if metadata_findings and metadata_findings.get("has_gps"):
            total_weight += 20
            factor_reasons.append("Exact GPS location coordinates found embedded in image metadata.")

        # Cross-category compounding risk
        unique_categories = len(category_breakdown)
        if unique_categories >= 3:
            total_weight += 10
            factor_reasons.append(f"Multi-vector exposure: Contains {unique_categories} different privacy categories simultaneously.")
        elif unique_categories == 2:
            total_weight += 5

        # Normalize score between 0 and 100
        raw_score = int(min(100, round(total_weight)))
        
        # Determine classification
        if raw_score >= 80:
            classification = "Critical Risk"
            color = "#ef4444" # Red
        elif raw_score >= 60:
            classification = "High Risk"
            color = "#f97316" # Orange
        elif raw_score >= 30:
            classification = "Medium Risk"
            color = "#f59e0b" # Amber
        else:
            classification = "Low Risk"
            color = "#10b981" # Emerald

        # Generate human-friendly explanations
        if breakdown["Critical"] > 0:
            factor_reasons.append(f"{breakdown['Critical']} critical credential/financial item(s) detected that could result in direct breach.")
        if breakdown["High"] > 0:
            factor_reasons.append(f"{breakdown['High']} high-risk identifiers detected (e.g. ID, address, biometric face, or banking info).")
        if breakdown["Medium"] > 0:
            factor_reasons.append(f"{breakdown['Medium']} medium-risk personal contact or network items found.")

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
        Protected items (blur, pixelate, blackout) drop the risk score.
        Items marked 'keep_visible: True' retain their risk weight.
        """
        unprotected_detections = [d for d in detections if d.get("keep_visible", False) is True]
        
        if not unprotected_detections:
            return {
                "residual_score": 0,
                "residual_classification": "Low Risk (Safe to Share)",
                "color": "#10b981",
                "reduction_percent": 100,
                "message": "All detected sensitive zones are protected. Safe for public sharing."
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
            "message": f"Residual risk reduced by {reduction}%. {len(unprotected_detections)} item(s) kept visible."
        }
