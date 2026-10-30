import subprocess, json, sys, os
sys.path.insert(0, r'C:\Users\WIN10\.gemini\antigravity\scratch\snapshield\backend')
from services.sensitive_detector import SensitiveDetector
from services.risk_scorer import RiskScorer

bin_path = r'C:\Users\WIN10\.gemini\antigravity\scratch\snapshield\backend\bin\win_ocr.exe'
img_path = r'C:\Users\WIN10\.gemini\antigravity\scratch\snapshield\backend\samples\sample_banking.png'

proc = subprocess.run([bin_path, img_path], capture_output=True, text=True, timeout=10)
tokens = json.loads(proc.stdout)

detector = SensitiveDetector()
detections = detector.scan_ocr_blocks(tokens)

scorer = RiskScorer()
risk = scorer.calculate_score(detections)

print(f"Total Detections: {len(detections)}")
for d in detections:
    print(f" - [{d['risk_severity']}] {d['category']} / {d['type']}: '{d['extracted_text']}'")
print(f"\nCalculated Risk Score: {risk['score']}/100 ({risk['classification']})")
