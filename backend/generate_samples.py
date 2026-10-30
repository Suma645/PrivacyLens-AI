import os
from PIL import Image, ImageDraw, ImageFont

def generate_sample_images():
    output_dirs = [
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "samples"),
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "frontend", "public", "samples")
    ]
    for d in output_dirs:
        os.makedirs(d, exist_ok=True)

    # 1. Sample Banking Screenshot
    w, h = 800, 520
    img1 = Image.new("RGB", (w, h), color=(15, 23, 42)) # Dark navy
    d1 = ImageDraw.Draw(img1)
    
    # Header bar
    d1.rectangle([(0, 0), (w, 60)], fill=(30, 41, 59))
    d1.text((30, 20), "APEX PREMIER BANK - ACCOUNT OVERVIEW", fill=(56, 189, 248))
    d1.text((w - 180, 20), "CONFIDENTIAL", fill=(244, 63, 94))
    
    # Card card
    d1.rectangle([(40, 90), (450, 310)], fill=(30, 58, 138), outline=(59, 130, 246), width=2)
    d1.text((60, 110), "Apex Platinum Credit Card", fill=(255, 255, 255))
    d1.text((60, 160), "Card Number: 4532 8920 1234 5678", fill=(224, 231, 255))
    d1.text((60, 200), "Cardholder: Lakshmi E", fill=(255, 255, 255))
    d1.text((60, 240), "Expires: 08/29   CVV: 742", fill=(248, 113, 113))
    
    # Account Details card
    d1.rectangle([(480, 90), (760, 310)], fill=(15, 23, 42), outline=(51, 65, 85), width=1)
    d1.text((500, 110), "Checking Account", fill=(148, 163, 184))
    d1.text((500, 140), "Account No: 987654321098", fill=(255, 255, 255))
    d1.text((500, 180), "IFSC: APEX0001429", fill=(255, 255, 255))
    d1.text((500, 220), "UPI ID: lakshmi@okhdfcbank", fill=(96, 165, 250))
    d1.text((500, 260), "Available: $24,850.50", fill=(52, 211, 153))

    # Transaction table
    d1.rectangle([(40, 330), (760, 480)], fill=(24, 33, 50), outline=(51, 65, 85))
    d1.text((60, 345), "Recent Activity - Customer Support Reference: TXN-894721", fill=(148, 163, 184))
    d1.text((60, 380), "2026-10-28   Wire Transfer Inbound   +$4,200.00", fill=(255, 255, 255))
    d1.text((60, 415), "2026-10-29   Cloud Services Sub      -$149.00", fill=(255, 255, 255))
    d1.text((60, 445), "Billing Address: 742 Evergreen Terrace, Springfield, OR", fill=(251, 191, 36))

    for d in output_dirs:
        img1.save(os.path.join(d, "sample_banking.png"))

    # 2. Sample Developer / Secrets Screenshot
    img2 = Image.new("RGB", (820, 500), color=(11, 15, 25))
    d2 = ImageDraw.Draw(img2)
    # Window bar
    d2.rectangle([(0, 0), (820, 40)], fill=(26, 32, 44))
    d2.ellipse([(15, 13), (27, 25)], fill=(239, 68, 68))
    d2.ellipse([(35, 13), (47, 25)], fill=(245, 158, 11))
    d2.ellipse([(55, 13), (67, 25)], fill=(16, 185, 129))
    d2.text((100, 12), "terminal - bash - .env.production (INTERNAL ONLY)", fill=(156, 163, 175))

    lines = [
        "# ENVIRONMENT CONFIGURATION - STRICTLY CONFIDENTIAL",
        "AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE",
        "AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
        "GITHUB_TOKEN=ghp_kL90qRSTuvWxYz1234567890abcdefABCDEF",
        "DATABASE_URL=postgres://admin:SuperSecretPass99@10.0.4.15:5432/prod_db",
        "REDIS_URL=redis://192.168.1.100:6379",
        "DEV_CONTACT_EMAIL=devops-lead@snapshield.internal.net",
        "SSH_HOST=172.16.254.1:22",
        "-----BEGIN RSA PRIVATE KEY-----",
        "MIIEowIBAAKCAQEA0Y3q...[PRIVATE SIGNING KEY]...",
        "-----END RSA PRIVATE KEY-----"
    ]
    y_pos = 60
    for line in lines:
        col = (239, 68, 68) if "KEY=" in line or "TOKEN=" in line or "DATABASE_URL=" in line or "BEGIN" in line else (209, 213, 219)
        if line.startswith("#"):
            col = (245, 158, 11)
        d2.text((30, y_pos), line, fill=col)
        y_pos += 38

    for d in output_dirs:
        img2.save(os.path.join(d, "sample_developer.png"))

    # 3. Sample Support Chat Screenshot
    img3 = Image.new("RGB", (780, 520), color=(15, 23, 42))
    d3 = ImageDraw.Draw(img3)
    d3.rectangle([(0, 0), (780, 55)], fill=(30, 41, 59))
    d3.text((30, 18), "SecureSupport Chat - Case #CS-9921", fill=(255, 255, 255))
    d3.text((780 - 150, 18), "Live Agent Active", fill=(52, 211, 153))

    # Messages
    # Agent message
    d3.rectangle([(30, 80), (520, 140)], fill=(30, 41, 59), outline=(51, 65, 85))
    d3.text((45, 90), "Support Agent: Suma M", fill=(96, 165, 250))
    d3.text((45, 112), "Hello! Please verify your phone number and security OTP.", fill=(226, 232, 240))

    # User message
    d3.rectangle([(240, 160), (740, 240)], fill=(29, 78, 216), outline=(59, 130, 246))
    d3.text((255, 170), "Customer: Nudi C", fill=(255, 255, 255))
    d3.text((255, 192), "Sure, my phone is +1 (555) 839-2041 and email is nudi@example.com", fill=(255, 255, 255))
    d3.text((255, 214), "The OTP code sent to my device is 849201", fill=(254, 240, 138))

    # User message 2
    d3.rectangle([(240, 260), (740, 340)], fill=(29, 78, 216), outline=(59, 130, 246))
    d3.text((255, 272), "Please update my delivery address to:", fill=(255, 255, 255))
    d3.text((255, 295), "1042 Maple Avenue, Suite 4B, Seattle, WA 98101", fill=(254, 240, 138))
    d3.text((255, 318), "SSN for ID verification: 987-65-4321", fill=(248, 113, 113))

    # System notice
    d3.rectangle([(30, 370), (740, 460)], fill=(24, 33, 50), outline=(51, 65, 85))
    d3.text((45, 385), "SYSTEM PRIVACY NOTICE", fill=(245, 158, 11))
    d3.text((45, 410), "Do not share unredacted screenshots of chat containing passwords, OTPs, or PII.", fill=(148, 163, 184))
    d3.text((45, 432), "Employee ID: EMP-99410 | IP: 192.168.1.42", fill=(100, 116, 139))

    for d in output_dirs:
        img3.save(os.path.join(d, "sample_chat.png"))

    print("[+] Sample screenshots created successfully!")

if __name__ == "__main__":
    generate_sample_images()
