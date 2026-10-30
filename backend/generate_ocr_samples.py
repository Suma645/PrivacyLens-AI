import os
import json

def create_sample_ocr_tokens():
    dirs = [
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "samples"),
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "frontend", "public", "samples")
    ]

    banking_tokens = [
        {"text": "APEX PREMIER BANK - ACCOUNT OVERVIEW", "box": {"x": 30, "y": 20, "width": 380, "height": 25}, "conf": 0.98},
        {"text": "CONFIDENTIAL", "box": {"x": 620, "y": 20, "width": 140, "height": 25}, "conf": 0.99},
        {"text": "Apex Platinum Credit Card", "box": {"x": 60, "y": 110, "width": 220, "height": 20}, "conf": 0.95},
        {"text": "Card Number: 4532 8920 1234 5678", "box": {"x": 60, "y": 160, "width": 300, "height": 25}, "conf": 0.99},
        {"text": "Cardholder: Lakshmi E", "box": {"x": 60, "y": 200, "width": 180, "height": 20}, "conf": 0.96},
        {"text": "Expires: 08/29   CVV: 742", "box": {"x": 60, "y": 240, "width": 200, "height": 20}, "conf": 0.97},
        {"text": "Checking Account", "box": {"x": 500, "y": 110, "width": 150, "height": 20}, "conf": 0.95},
        {"text": "Account No: 987654321098", "box": {"x": 500, "y": 140, "width": 210, "height": 20}, "conf": 0.98},
        {"text": "IFSC: APEX0001429", "box": {"x": 500, "y": 180, "width": 160, "height": 20}, "conf": 0.95},
        {"text": "UPI ID: lakshmi@okhdfcbank", "box": {"x": 500, "y": 220, "width": 210, "height": 20}, "conf": 0.98},
        {"text": "Available: $24,850.50", "box": {"x": 500, "y": 260, "width": 180, "height": 20}, "conf": 0.95},
        {"text": "Billing Address: 742 Evergreen Terrace, Springfield, OR", "box": {"x": 60, "y": 445, "width": 420, "height": 22}, "conf": 0.94}
    ]

    dev_tokens = [
        {"text": "# ENVIRONMENT CONFIGURATION - STRICTLY CONFIDENTIAL", "box": {"x": 30, "y": 60, "width": 450, "height": 20}, "conf": 0.99},
        {"text": "AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE", "box": {"x": 30, "y": 98, "width": 380, "height": 22}, "conf": 0.99},
        {"text": "AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY", "box": {"x": 30, "y": 136, "width": 520, "height": 22}, "conf": 0.98},
        {"text": "GITHUB_TOKEN=ghp_kL90qRSTuvWxYz1234567890abcdefABCDEF", "box": {"x": 30, "y": 174, "width": 480, "height": 22}, "conf": 0.99},
        {"text": "DATABASE_URL=postgres://admin:SuperSecretPass99@10.0.4.15:5432/prod_db", "box": {"x": 30, "y": 212, "width": 560, "height": 22}, "conf": 0.98},
        {"text": "REDIS_URL=redis://192.168.1.100:6379", "box": {"x": 30, "y": 250, "width": 320, "height": 22}, "conf": 0.96},
        {"text": "DEV_CONTACT_EMAIL=devops-lead@snapshield.internal.net", "box": {"x": 30, "y": 288, "width": 440, "height": 22}, "conf": 0.97},
        {"text": "SSH_HOST=172.16.254.1:22", "box": {"x": 30, "y": 326, "width": 240, "height": 22}, "conf": 0.95},
        {"text": "-----BEGIN RSA PRIVATE KEY-----", "box": {"x": 30, "y": 364, "width": 300, "height": 22}, "conf": 0.99}
    ]

    chat_tokens = [
        {"text": "SecureSupport Chat - Case #CS-9921", "box": {"x": 30, "y": 18, "width": 300, "height": 22}, "conf": 0.95},
        {"text": "Support Agent: Suma M", "box": {"x": 45, "y": 90, "width": 180, "height": 20}, "conf": 0.96},
        {"text": "Customer: Nudi C", "box": {"x": 255, "y": 170, "width": 160, "height": 20}, "conf": 0.96},
        {"text": "Sure, my phone is +1 (555) 839-2041 and email is nudi@example.com", "box": {"x": 255, "y": 192, "width": 470, "height": 22}, "conf": 0.98},
        {"text": "The OTP code sent to my device is 849201", "box": {"x": 255, "y": 214, "width": 340, "height": 22}, "conf": 0.99},
        {"text": "1042 Maple Avenue, Suite 4B, Seattle, WA 98101", "box": {"x": 255, "y": 295, "width": 380, "height": 22}, "conf": 0.97},
        {"text": "SSN for ID verification: 987-65-4321", "box": {"x": 255, "y": 318, "width": 300, "height": 22}, "conf": 0.99},
        {"text": "Employee ID: EMP-99410 | IP: 192.168.1.42", "box": {"x": 45, "y": 432, "width": 320, "height": 20}, "conf": 0.96}
    ]

    for d in dirs:
        os.makedirs(d, exist_ok=True)
        with open(os.path.join(d, "sample_banking.ocr.json"), "w") as f:
            json.dump(banking_tokens, f, indent=2)
        with open(os.path.join(d, "sample_developer.ocr.json"), "w") as f:
            json.dump(dev_tokens, f, indent=2)
        with open(os.path.join(d, "sample_chat.ocr.json"), "w") as f:
            json.dump(chat_tokens, f, indent=2)

    print("[+] Sample OCR companion token files written.")

if __name__ == "__main__":
    create_sample_ocr_tokens()
