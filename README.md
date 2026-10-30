# SnapShield – Smart Screenshot Privacy Protector

> **"The user chooses what to share. SnapShield protects everything else."**

![SnapShield Cybersecurity Dashboard](https://img.shields.io/badge/Security-Zero--Storage-blue?style=for-the-badge&logo=shield)
![Status](https://img.shields.io/badge/Status-Production--Ready-emerald?style=for-the-badge)
![Vercel](https://img.shields.io/badge/Deploy-Vercel-black?style=for-the-badge&logo=vercel)
![Render](https://img.shields.io/badge/Deploy-Render-46E3B7?style=for-the-badge&logo=render)

SnapShield is an enterprise-grade screenshot privacy sanitization platform. It protects users from accidentally exposing banking credentials, payment cards, cloud access tokens, passwords, customer personal identities (PII), and biometric faces before sharing screenshots across Slack, WhatsApp, Twitter/X, Discord, or public support forums.

---

## 🌟 Architecture & Core Innovations

SnapShield is built on the **PrivacyLens AI 3-Pillar Security Model** presented at the **Tech-ಶೋಧ Technical Hackathon (ECE Department, Vidyavardhaka College of Engineering, Mysuru)**:

```
[1. SCAN & DETECT]       ──>      [2. ANALYSE & ASSESS]      ──>      [3. REDACT & PROTECT]
• Hybrid OCR (Tesseract / Wasm)    • Confidentiality Score (0-100)     • Secure Default Inversion
• OpenCV Biometric Face Detection  • 5 Privacy Vector Classification   • Multi-pass Irreversible Blur
• OpenCV QR & Barcode Scanner      • Exposure Compounding Risk         • Mosaic Pixelation & Solid Blackout
• EXIF GPS Metadata Sanitizer      • Explanatory Threat Intelligence   • Custom Drag-to-Draw Redaction
```

### 1. Inverted Privacy Model (Zero-Accident Design)
Traditional redaction tools require users to spot and draw boxes around sensitive items manually—leading to catastrophic human error. SnapShield **inverts the workflow**:
- Every detected sensitive element is **redacted by default**.
- The user only clicks what they **explicitly wish to share**.
- Everything else remains cryptographically flattened and blurred.

### 2. Multi-Vector Deep Pattern Detection
- **Personal Information**: Names, emails (RFC 5322), phone numbers (E.164, US, Indian mobile), physical street addresses.
- **Financial Information**: Credit/debit card numbers with real **Luhn Algorithm checksum verification**, CVV/expiry dates, IBAN, bank account numbers, IFSC codes, UPI handles (`user@okhdfcbank`).
- **Authentication Information**: AWS Access Keys (`AKIA...`), GitHub Personal Access Tokens (`ghp_...`), JWT sessions (`eyJ...`), database connection URIs, RSA/SSH private keys, plaintext passwords, 2FA/OTPs.
- **Identity Information**: Social Security Numbers (SSN), Indian Aadhaar cards, PAN cards, Passports, Driver's licenses, Employee IDs.
- **Computer Vision & Hardware Privacy**: Facial identities (OpenCV Haar cascades), QR codes (which leak Wi-Fi keys, UPI links, and auth tokens), and EXIF GPS coordinates.

---

## 🚀 Live Demo & Screenshot Tour

1. **Cybersecurity Command Center Landing Page**: Highlights core value proposition, architecture workflow, and 1-click test suites.
2. **Instant Preset Test Drives**: Built-in 1-click presets:
   - 💳 **Banking & Credit Card Statement** (Card numbers, CVV, balance, customer name)
   - 🔑 **Developer Cloud Secrets** (AWS Access Keys, GitHub PAT, Postgres URI, RSA key)
   - 💬 **Customer Support Chat** (Phone number, email, physical address, OTP, employee ID)
3. **Risk Analysis Dashboard**:
   - Circular animated **Confidentiality Score Gauge (0–100)**:
     - `0–29`: Low Risk
     - `30–59`: Medium Risk
     - `60–79`: High Risk
     - `80–100`: Critical Risk
   - Breakdown of Critical, High, Medium, and Low risk items.
   - Interactive table with category badges, confidence ratings, and privacy actions.
4. **Interactive Split-Screen Privacy Editor**:
   - **Left**: Original screenshot with color-coded bounding boxes (Red for Critical, Green for Shared).
   - **Right**: Live real-time protected screenshot showing multi-pass Gaussian blur, mosaic pixelation, or solid blackout.
   - **Compare Slider**: Interactive before/after wipe slider.
   - **Custom Drawing Tool**: Click-and-drag crosshair to draw rectangular redactions over any undetected custom regions.
   - **Residual Risk Meter**: Real-time counter showing residual risk dropping towards `0/100` as items are redacted.
5. **Pre-Flight Checklist & Irreversible Export**:
   - 3-point verification modal confirming no PII leaks.
   - PNG (Lossless) or JPG export with 100% metadata stripping.
   - Confetti celebration upon clean export.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS v4, Lucide React, Canvas Confetti, Tesseract.js (Wasm) |
| **Backend** | Python Flask, OpenCV (`cv2`), Pillow (`PIL`), PyTesseract, Gunicorn |
| **Security** | Zero-Storage in-memory pipeline, Luhn checksum validator, EXIF scrubber |
| **Deployment** | Vercel (Frontend), Render (Backend / Docker / Web Service) |

---

## 📦 Project Structure

```
snapshield/
├── backend/
│   ├── app.py                     # Flask REST API endpoints (/api/analyze, /api/protect, /api/download)
│   ├── config.py                  # Environment configurations & risk scoring weights
│   ├── requirements.txt           # Python dependencies (Flask, OpenCV, Pillow, PyTesseract, Gunicorn)
│   ├── .env.example               # Backend environment variables
│   ├── generate_samples.py        # Generates realistic test screenshot datasets
│   ├── generate_ocr_samples.py    # Companion OCR annotations for automated testing
│   ├── test_api.py                # Comprehensive integration test suite (100% pass rate)
│   ├── services/
│   │   ├── cv_detector.py         # OpenCV Face detection, QR code scanning, EXIF GPS extractor
│   │   ├── sensitive_detector.py  # Regex rules across 5 privacy categories + Luhn validator
│   │   ├── risk_scorer.py         # 0-100 scoring algorithm & residual risk calculator
│   │   ├── image_processor.py     # Multi-pass Gaussian blur, pixelation, and blackout rasterizer
│   │   ├── ocr_service.py         # PyTesseract integration + text region extraction
│   │   └── modular_ai_service.py  # Contextual AI detection hook (Gemini / OpenAI compatible)
│   └── utils/
│       └── cleanup.py             # Automatic zero-permanent storage volatile file sweeper
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx         # Header navigation, brand logo, and live API status pill
│   │   │   ├── LandingHero.jsx    # Hero section, feature cards, and instant test buttons
│   │   │   ├── HowItWorks.jsx     # 3-step privacy workflow explanation
│   │   │   ├── UploadZone.jsx     # Drag-and-drop ingestion with dimension/size validator
│   │   │   ├── ScoreGauge.jsx     # SVG animated 0-100 circular confidentiality gauge
│   │   │   ├── RiskDashboard.jsx  # KPI metrics, category filters, and actionable detections table
│   │   │   ├── PrivacyEditor.jsx  # Split-screen editor, interactive bounding boxes & compare slider
│   │   │   ├── DownloadModal.jsx  # Pre-flight privacy checklist & PNG/JPG export trigger
│   │   │   ├── AboutModal.jsx     # Security guarantees, threat model, hackathon credits
│   │   │   └── Footer.jsx         # Professional SaaS footer
│   │   ├── services/
│   │   │   ├── api.js             # REST API client
│   │   │   └── clientOcr.js       # Client-side Tesseract.js WebAssembly engine
│   │   ├── App.jsx                # Main application state orchestrator
│   │   └── index.css              # Cyber-inspired design system with Tailwind v4
│   ├── public/samples/            # Sample screenshot test files
│   ├── package.json
│   ├── vite.config.js
│   └── vercel.json                # Vercel SPA routing configuration
│
├── render.yaml                    # Turnkey Render deployment specification
└── README.md
```

---

## 💻 Local Development Setup

### 1. Prerequisites
- Node.js 18+ (tested on Node v24)
- Python 3.10+ (tested on Python 3.14)
- (Optional) Tesseract OCR installed locally, or leverage client-side Tesseract.js WebAssembly

### 2. Backend Setup
```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# (Optional) Copy environment template
cp .env.example .env

# Generate realistic test screenshots
python generate_samples.py
python generate_ocr_samples.py

# Run backend integration tests
python test_api.py

# Start Flask backend server
python app.py
# Backend runs at http://127.0.0.1:5000
```

### 3. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Start Vite dev server with proxy
npm run dev
# Frontend runs at http://127.0.0.1:5173
```

---

## ☁️ Deployment Instructions

### Deploy Backend to Render

1. Create a new Web Service on [Render](https://render.com).
2. Connect your repository.
3. Configure settings:
   - **Environment**: Python 3
   - **Build Command**: `pip install -r backend/requirements.txt`
   - **Start Command**: `gunicorn --chdir backend app:app --bind 0.0.0.0:$PORT`
4. Set Environment Variables:
   - `FLASK_ENV`: `production`
   - `SECRET_KEY`: *(Generate a secure random string)*
5. The `GET /api/health` endpoint serves as the Render health check path.

*(Or simply select the bundled `render.yaml` for 1-click Infrastructure-as-Code deployment!)*

### Deploy Frontend to Vercel

1. Create a new Project on [Vercel](https://vercel.com).
2. Set Root Directory to `frontend`.
3. Set Framework Preset to **Vite**.
4. Configure Environment Variables:
   - `VITE_API_BASE_URL`: `https://your-snapshield-api.onrender.com`
5. Click **Deploy**. Vercel will compile the frontend using `npm run build` and use `vercel.json` for seamless client-side routing.

---

## 🛡️ Privacy & Cybersecurity Guarantees

- **Zero Permanent Storage**: All uploaded screenshots and processed rasters exist only in volatile temporary cache and are wiped after the user's session.
- **Multi-pass Irreversible Redaction**: Blurred and pixelated regions are permanently destructive to the underlying pixel data; text is mathematically unrecoverable.
- **Hardware Metadata Erasure**: All EXIF tags, GPS latitude/longitude, camera serial numbers, and device fingerprints are stripped on export.
- **Luhn Checksum Verification**: Eliminates false positives on payment cards while catching real exposed Visa, Mastercard, Amex, and Discover numbers.
- **Explicit Consent**: Images are never routed to external cloud AI without user knowledge.

---

## 👥 Hackathon Team Attribution

Developed for **Tech-ಶೋಧ Technical Hackathon (Vidyavardhaka College of Engineering, Mysuru)** under the **PrivacyLens AI** initiative:

1. **Nudi C**
2. **Suma M Arkachari**
3. **Lakshmi E**

*Department of Electronics and Communication Engineering, VVCE, Mysuru.*
