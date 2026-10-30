import os
import uuid
import time
import cv2
import numpy as np
from PIL import Image
from flask import Flask, request, jsonify, send_file, make_response
from flask_cors import CORS
from werkzeug.utils import secure_filename

from config import Config
from services.cv_detector import CVDetector
from services.sensitive_detector import SensitiveDetector
from services.risk_scorer import RiskScorer
from services.image_processor import ImageProcessor
from services.ocr_service import OCRService
from services.modular_ai_service import ModularAIService
from utils.cleanup import clean_expired_files, delete_session_file

# Initialize Flask App
app = Flask(__name__)
app.config.from_object(Config)

# Enable CORS for frontend Vite dev server, mobile apps, and production domains
CORS(app, resources={r"/api/*": {"origins": "*"}}, expose_headers=["Content-Disposition", "Content-Type"])

# Ensure temp directory exists
os.makedirs(Config.TEMP_DIR, exist_ok=True)

# Initialize Services
cv_detector = CVDetector()
sensitive_detector = SensitiveDetector()
risk_scorer = RiskScorer()
image_processor = ImageProcessor()
ocr_service = OCRService(tesseract_cmd=Config.TESSERACT_CMD)
ai_service = ModularAIService()

# In-memory session cache mapping file_id -> file paths & latest protected image
SESSIONS = {}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in Config.ALLOWED_EXTENSIONS

@app.before_request
def cleanup_routine():
    """Periodically clean expired files before processing requests."""
    clean_expired_files()

@app.route("/api/health", methods=["GET"])
def health():
    """Health check endpoint for Render/Vercel and monitoring."""
    return jsonify({
        "status": "healthy",
        "service": "SnapShield - Smart Screenshot Privacy Protector",
        "version": "1.0.0",
        "opencv_version": cv2.__version__,
        "ocr_available": ocr_service.is_engine_ready(),
        "ai_service_connected": ai_service.is_ai_connected(),
        "ai_provider": ai_service.get_provider_name()
    })

@app.route("/api/analyze", methods=["POST"])
def analyze_screenshot():
    """
    Analyzes uploaded screenshot:
    - Performs OCR text extraction
    - Computer vision face and QR code detection
    - EXIF metadata extraction
    - Rule-based sensitive pattern scanning across all categories
    - Confidentiality risk score calculation (0-100)
    - Default secure initial protection preview
    """
    try:
        file = None
        client_tokens = []

        if 'screenshot' in request.files:
            file = request.files['screenshot']
        elif 'file' in request.files:
            file = request.files['file']

        if not file or file.filename == '':
            return jsonify({"error": "No screenshot file provided"}), 400

        if not allowed_file(file.filename):
            return jsonify({"error": "Unsupported file format. Please upload PNG, JPG, JPEG, or WEBP."}), 400

        # Optional client OCR tokens passed as JSON string in form data
        if 'client_ocr_tokens' in request.form:
            import json
            try:
                client_tokens = json.loads(request.form.get('client_ocr_tokens', '[]'))
            except Exception:
                client_tokens = []

        # Generate unique secure session ID
        file_id = str(uuid.uuid4())
        ext = file.filename.rsplit('.', 1)[1].lower()
        saved_filename = f"{file_id}.{ext}"
        filepath = os.path.join(Config.TEMP_DIR, saved_filename)
        file.save(filepath)

        # Load image via Pillow and OpenCV
        pil_img = Image.open(filepath)
        img_width, img_height = pil_img.size
        
        # Security validation on dimensions
        if img_width < 10 or img_height < 10 or img_width > 8000 or img_height > 8000:
            os.remove(filepath)
            return jsonify({"error": "Invalid image dimensions. Maximum supported resolution is 8000x8000."}), 400

        cv_img = cv2.imread(filepath)
        if cv_img is None:
            # Fallback load from Pillow for uncommon color spaces
            cv_img = cv2.cvtColor(np.array(pil_img.convert('RGB')), cv2.COLOR_RGB2BGR)

        # 1. EXIF Metadata inspection
        exif_findings = cv_detector.extract_exif_metadata(pil_img)

        # 2. Computer Vision: Faces and QR codes
        face_detections = cv_detector.detect_faces(cv_img)
        qr_detections = cv_detector.detect_qr_codes(cv_img)

        # 3. OCR Text Extraction
        ocr_blocks = ocr_service.extract_text_and_boxes(pil_img, cv_img, client_tokens, filename=file.filename)

        # 4. Sensitive Information Pattern Matching
        text_detections = sensitive_detector.scan_ocr_blocks(ocr_blocks)

        # 5. Modular AI Contextual Enhancement
        all_raw_text = " ".join([b.get("text", "") for b in ocr_blocks])
        combined_detections = face_detections + qr_detections + text_detections
        enhanced_detections = ai_service.enhance_detections(all_raw_text, combined_detections)

        # Deduplicate overlapping detections
        final_detections = []
        seen_keys = set()
        for det in enhanced_detections:
            key = f"{det['category']}_{det['extracted_text']}_{det['bounding_box']['x']}_{det['bounding_box']['y']}"
            if key not in seen_keys:
                seen_keys.add(key)
                final_detections.append(det)

        # 6. Confidentiality Risk Score Calculation
        score_data = risk_scorer.calculate_score(final_detections, exif_findings)

        # 7. Residual Risk (initial state: all detected items are protected by default)
        initial_residual = risk_scorer.calculate_residual_risk(final_detections)

        # 8. Generate Default Protected Image
        # Default policy: protect all detected sensitive regions unless user explicitly shares
        default_redaction_specs = [
            {
                "x": d["bounding_box"]["x"],
                "y": d["bounding_box"]["y"],
                "width": d["bounding_box"]["width"],
                "height": d["bounding_box"]["height"],
                "style": d.get("protection_style", "blur")
            }
            for d in final_detections
        ]
        protected_cv_img = image_processor.redact_image(cv_img, default_redaction_specs)

        # Generate Base64 previews
        original_preview = image_processor.cv2_to_base64(cv_img, format=ext)
        protected_preview = image_processor.cv2_to_base64(protected_cv_img, format=ext)

        # Cache session data
        SESSIONS[file_id] = {
            "filepath": filepath,
            "ext": ext,
            "original_cv": cv_img,
            "protected_cv": protected_cv_img,
            "detections": final_detections,
            "timestamp": time.time()
        }

        return jsonify({
            "success": True,
            "file_id": file_id,
            "image_info": {
                "filename": secure_filename(file.filename),
                "width": img_width,
                "height": img_height,
                "format": ext.upper(),
                "size_bytes": os.path.getsize(filepath)
            },
            "metadata_leaks": exif_findings,
            "detections": final_detections,
            "confidentiality_score": score_data["score"],
            "risk_classification": score_data["classification"],
            "score_color": score_data["color"],
            "breakdown": score_data["breakdown"],
            "category_breakdown": score_data["category_breakdown"],
            "score_explanation": score_data["explanation"],
            "factor_reasons": score_data["factor_reasons"],
            "residual_risk": initial_residual,
            "original_image": original_preview,
            "protected_image": protected_preview
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Failed to analyze screenshot: {str(e)}"}), 500

@app.route("/api/protect", methods=["POST"])
def update_protection():
    """
    Applies user's selective privacy decisions:
    - Takes list of detections with updated `keep_visible` flags and `protection_style`
    - Accepts custom user-drawn manual rectangular selection areas
    - Applies server-side irreversible redactions (blur, pixelate, blackout)
    - Returns updated protected preview base64 and residual risk statistics
    """
    try:
        data = request.get_json() or {}
        file_id = data.get("file_id")

        if not file_id or file_id not in SESSIONS:
            return jsonify({"error": "Session expired or invalid file_id. Please re-upload your screenshot."}), 404

        session = SESSIONS[file_id]
        original_cv = session["original_cv"]
        detections = data.get("detections", session["detections"])
        manual_boxes = data.get("manual_boxes", [])

        # Build list of redaction specifications
        # Core principle: "The user explicitly chooses what to share. Everything else is protected."
        redaction_specs = []

        for det in detections:
            # If user marked keep_visible == True, it is safe to show
            if det.get("keep_visible") is True:
                continue

            # Otherwise protect it!
            box = det.get("bounding_box", {})
            style = det.get("protection_style", "blur")
            redaction_specs.append({
                "x": box.get("x", 0),
                "y": box.get("y", 0),
                "width": box.get("width", 0),
                "height": box.get("height", 0),
                "style": style
            })

        # Add any manual user-drawn rectangular areas
        for box in manual_boxes:
            redaction_specs.append({
                "x": box.get("x", 0),
                "y": box.get("y", 0),
                "width": box.get("width", 0),
                "height": box.get("height", 0),
                "style": box.get("style", "blackout")
            })

        # Apply redaction to fresh copy of original image
        new_protected_cv = image_processor.redact_image(original_cv, redaction_specs)
        session["protected_cv"] = new_protected_cv
        session["detections"] = detections

        # Calculate residual risk
        residual_risk = risk_scorer.calculate_residual_risk(detections, manual_boxes)

        # Generate updated preview
        protected_preview = image_processor.cv2_to_base64(new_protected_cv, format=session["ext"])

        return jsonify({
            "success": True,
            "file_id": file_id,
            "protected_image": protected_preview,
            "residual_risk": residual_risk,
            "active_redactions_count": len(redaction_specs)
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Failed to apply protection: {str(e)}"}), 500

@app.route("/api/download/<file_id>", methods=["GET", "POST"])
def download_protected(file_id):
    """
    Downloads the permanently redacted screenshot in PNG or JPG format.
    Strips all EXIF metadata and hidden layers.
    """
    try:
        if file_id not in SESSIONS:
            return jsonify({"error": "Session expired or file not found."}), 404

        session = SESSIONS[file_id]
        protected_cv = session.get("protected_cv")
        if protected_cv is None:
            return jsonify({"error": "No protected image available."}), 400

        fmt = request.args.get("format", "png").lower()
        if fmt not in ["png", "jpg", "jpeg"]:
            fmt = "png"

        image_bytes = image_processor.cv2_to_bytes(protected_cv, format=fmt)
        
        timestamp = int(time.time())
        download_filename = f"snapshield-protected-{timestamp}.{fmt}"
        
        response = make_response(image_bytes)
        response.headers.set('Content-Type', f'image/{fmt}')
        response.headers.set('Content-Disposition', 'attachment', filename=download_filename)
        return response

    except Exception as e:
        return jsonify({"error": f"Download failed: {str(e)}"}), 500

@app.route("/api/samples", methods=["GET"])
def get_sample_screenshots():
    """
    Returns pre-configured sample test cases so users can test immediately.
    """
    return jsonify({
        "samples": [
            {
                "id": "sample-banking",
                "title": "Bank Account & Credit Card Statement",
                "description": "Contains credit card number, CVV, account balance, IFSC, and customer name.",
                "category": "Financial Information",
                "type": "banking"
            },
            {
                "id": "sample-developer",
                "title": "Developer Terminal & Cloud Secrets",
                "description": "Contains AWS access key, private key header, database connection URI, and server IP.",
                "category": "Authentication Information",
                "type": "developer"
            },
            {
                "id": "sample-chat",
                "title": "Customer Support Chat",
                "description": "Contains customer phone number, home address, email, and one-time password (OTP).",
                "category": "Personal Information",
                "type": "chat"
            }
        ]
    })

if __name__ == "__main__":
    port = Config.PORT
    print(f"[*] SnapShield Backend starting on http://127.0.0.1:{port}")
    app.run(host="0.0.0.0", port=port, debug=Config.DEBUG)
