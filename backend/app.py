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
from services.document_service import DocumentService
from services.stego_service import StegoService
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
document_service = DocumentService()
stego_service = StegoService()

# In-memory session cache mapping file_id -> file paths & latest protected image/document
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
        "service": "Privacy Lens AI - Smart Screenshot & Document Privacy Protector",
        "version": "2.0.0",
        "opencv_version": cv2.__version__,
        "ocr_available": ocr_service.is_engine_ready(),
        "ai_service_connected": ai_service.is_ai_connected(),
        "ai_provider": ai_service.get_provider_name(),
        "document_support": ["pdf", "docx", "png", "jpg", "jpeg", "webp"],
        "steganography_supported": True
    })

@app.route("/api/analyze", methods=["POST"])
def analyze_screenshot():
    """
    Analyzes uploaded screenshot or document (PDF / DOCX):
    - Multi-format support: PDF, DOCX, and images
    - Automatic highest-priority detection: Aadhaar, PAN, Bank Account (Solid Blackout by default)
    - Optional detection: Email, Phone, Marks/Percentages (Visible by default, checkbox to blur)
    - OCR text extraction & bounding box alignment
    - Confidentiality risk score calculation (0-100)
    - Generates sanitized live preview
    """
    try:
        file = None
        client_tokens = []

        if 'screenshot' in request.files:
            file = request.files['screenshot']
        elif 'file' in request.files:
            file = request.files['file']
        elif 'document' in request.files:
            file = request.files['document']

        if not file or file.filename == '':
            return jsonify({"error": "No file provided"}), 400

        if not allowed_file(file.filename):
            return jsonify({"error": "Unsupported file format. Please upload PNG, JPG, JPEG, WEBP, PDF, or DOCX."}), 400

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

        is_doc = document_service.is_document(file.filename)
        doc_meta = {}

        if is_doc:
            # 1. Process Document (PDF / DOCX)
            doc_data = document_service.extract_document_text_and_preview(filepath, file.filename)
            pil_img = doc_data['preview_pil']
            cv_img = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
            doc_text = doc_data['text']
            doc_meta = {
                "pages_count": doc_data.get('pages_count', 1),
                "is_document": True,
                "file_type": doc_data.get('file_type', ext)
            }
            exif_findings = {"has_exif": False, "sanitized": True}
            face_detections = []
            qr_detections = []

            # OCR scan on the document page preview
            ocr_blocks = ocr_service.extract_text_and_boxes(pil_img, cv_img, client_tokens, filename=file.filename)

            # Detect sensitive patterns from document text
            direct_text_dets = sensitive_detector.scan_text(doc_text)
            block_dets = sensitive_detector.scan_ocr_blocks(ocr_blocks)

            # Merge and align detections
            combined_raw = direct_text_dets + block_dets
            text_detections = []
            seen_texts = set()
            for d in combined_raw:
                k = f"{d['category']}_{d['extracted_text']}"
                if k not in seen_texts:
                    seen_texts.add(k)
                    text_detections.append(d)

        else:
            # 2. Process Image / Screenshot
            pil_img = Image.open(filepath)
            img_width, img_height = pil_img.size

            if img_width < 10 or img_height < 10 or img_width > 8000 or img_height > 8000:
                os.remove(filepath)
                return jsonify({"error": "Invalid image dimensions. Maximum supported resolution is 8000x8000."}), 400

            cv_img = cv2.imread(filepath)
            if cv_img is None:
                cv_img = cv2.cvtColor(np.array(pil_img.convert('RGB')), cv2.COLOR_RGB2BGR)

            exif_findings = cv_detector.extract_exif_metadata(pil_img)
            face_detections = cv_detector.detect_faces(cv_img)
            qr_detections = cv_detector.detect_qr_codes(cv_img)

            ocr_blocks = ocr_service.extract_text_and_boxes(pil_img, cv_img, client_tokens, filename=file.filename)
            text_detections = sensitive_detector.scan_ocr_blocks(ocr_blocks)

        img_width, img_height = pil_img.size

        # Modular AI Contextual Enhancement
        all_raw_text = " ".join([b.get("text", "") for b in ocr_blocks])
        combined_detections = face_detections + qr_detections + text_detections
        enhanced_detections = ai_service.enhance_detections(all_raw_text, combined_detections, ocr_blocks=ocr_blocks)

        # Classify Priority & Deduplicate
        final_detections = []
        seen_keys = set()
        for det in enhanced_detections:
            cat = det.get('category', '')
            typ = det.get('type', '')
            text_val = det.get('extracted_text', '')

            # Enforce Highest-Priority vs Optional rules
            if any(h in typ.lower() for h in ['aadhaar', 'pan card', 'bank account', 'iban']):
                det['priority'] = 'highest'
                det['risk_severity'] = 'Critical'
                det['keep_visible'] = False
                det['protection_style'] = 'blackout'
                det['recommended_action'] = 'Solid Blackout'
            elif any(o in typ.lower() for o in ['email', 'phone', 'marks', 'percentage', 'score']):
                det['priority'] = 'optional'
                det['keep_visible'] = True # Kept visible by default per user requirement!
                det['protection_style'] = 'blur'
                det['recommended_action'] = 'Blur'

            key = f"{cat}_{text_val}_{det['bounding_box']['x']}_{det['bounding_box']['y']}"
            if key not in seen_keys:
                seen_keys.add(key)
                final_detections.append(det)

        # Confidentiality Risk Score Calculation
        score_data = risk_scorer.calculate_score(final_detections, exif_findings)
        initial_residual = risk_scorer.calculate_residual_risk(final_detections)

        # Generate Initial Protected Preview
        # Rule: Only redact items where keep_visible == False
        # (Highest-priority blacked out; Optional kept visible by default!)
        default_redaction_specs = [
            {
                "x": d["bounding_box"]["x"],
                "y": d["bounding_box"]["y"],
                "width": d["bounding_box"]["width"],
                "height": d["bounding_box"]["height"],
                "style": d.get("protection_style", "blackout" if d.get("priority") == "highest" else "blur")
            }
            for d in final_detections
            if d.get("keep_visible") is False
        ]

        protected_cv_img = image_processor.redact_image(cv_img, default_redaction_specs)

        # Generate Base64 previews
        original_preview = image_processor.cv2_to_base64(cv_img, format="PNG")
        protected_preview = image_processor.cv2_to_base64(protected_cv_img, format="PNG")

        # Cache session data
        SESSIONS[file_id] = {
            "filepath": filepath,
            "ext": ext,
            "is_document": is_doc,
            "doc_meta": doc_meta,
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
                "size_bytes": os.path.getsize(filepath),
                "is_document": is_doc,
                **doc_meta
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
        return jsonify({"error": f"Failed to analyze file: {str(e)}"}), 500

@app.route("/api/protect", methods=["POST"])
def update_protection():
    """
    Applies user's selective privacy decisions:
    - Highest-priority items (Aadhaar, PAN, Bank Accounts) blacked out with solid black boxes
    - Optional items (Email, Phone, Marks) blurred only when checkbox is selected by user
    - Custom manual rectangular redactions with choice of: blackout, blur, or pixelate
    - Spotlight Mode: user selects what to keep visible, rest is blurred out
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
        visible_boxes = data.get("visible_boxes", [])
        mode = data.get("mode", "spotlight" if len(visible_boxes) > 0 else "auto")

        # Collect user-selected visible areas (Spotlight Sharing)
        all_visible = list(visible_boxes)
        redaction_specs = []

        for det in detections:
            if det.get("keep_visible") is True:
                b = det.get("bounding_box", {})
                if b and b not in all_visible:
                    all_visible.append(b)

        if mode == "spotlight" and len(all_visible) > 0:
            # Spotlight Sharing: Only selected area stays clear, everything else is automatically blurred!
            new_protected_cv = image_processor.render_spotlight_image(original_cv, all_visible)
            session["protected_cv"] = new_protected_cv
            session["detections"] = detections
            residual_risk = {
                "residual_score": 0,
                "residual_classification": "Low Risk (Spotlight Active)",
                "color": "#10b981",
                "reduction_percent": 100,
                "message": f"Only your {len(all_visible)} selected section(s) are visible. Everything else is securely blurred."
            }
        else:
            # Redaction mode:
            # - Aadhaar, PAN, Bank Accounts: solid black box by default
            # - Optional items (Email, Phone, Marks): blurred if keep_visible == False
            # - Manual boxes: blackout, blur, or pixelate
            for det in detections:
                if det.get("keep_visible") is True:
                    continue

                box = det.get("bounding_box", {})
                priority = det.get("priority", "standard")
                style = det.get("protection_style", "blackout" if priority == "highest" else "blur")

                redaction_specs.append({
                    "x": box.get("x", 0),
                    "y": box.get("y", 0),
                    "width": box.get("width", 0),
                    "height": box.get("height", 0),
                    "style": style
                })

            for box in manual_boxes:
                redaction_specs.append({
                    "x": box.get("x", 0),
                    "y": box.get("y", 0),
                    "width": box.get("width", 0),
                    "height": box.get("height", 0),
                    "style": box.get("style", "blackout")
                })

            new_protected_cv = image_processor.redact_image(original_cv, redaction_specs)
            session["protected_cv"] = new_protected_cv
            session["detections"] = detections
            residual_risk = risk_scorer.calculate_residual_risk(detections, manual_boxes)

        # Generate updated preview
        protected_preview = image_processor.cv2_to_base64(new_protected_cv, format="PNG")

        return jsonify({
            "success": True,
            "file_id": file_id,
            "protected_image": protected_preview,
            "residual_risk": residual_risk,
            "active_redactions_count": len(all_visible) if mode == "spotlight" else len(redaction_specs)
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Failed to apply protection: {str(e)}"}), 500

@app.route("/api/download/<file_id>", methods=["GET"])
def download_protected(file_id):
    """
    Downloads the final sanitized file:
    - Supports PNG, JPG, PDF, and DOCX
    - Permanently sanitizes original file content
    - Strips all EXIF metadata and hidden layers
    """
    try:
        if file_id not in SESSIONS:
            return jsonify({"error": "Session expired or file not found."}), 404

        session = SESSIONS[file_id]
        fmt = request.args.get("format", "png").lower()
        is_doc = session.get("is_document", False)
        timestamp = int(time.time())

        # If document download requested (e.g. DOCX or PDF)
        if is_doc and fmt in ["pdf", "docx"]:
            orig_path = session.get("filepath")
            orig_ext = session.get("ext", "pdf")
            sensitive_texts = [d.get("raw_text") for d in session.get("detections", []) if not d.get("keep_visible")]

            if fmt == "docx" and orig_ext == "docx":
                out_path = os.path.join(Config.TEMP_DIR, f"sanitized_{file_id}.docx")
                document_service.sanitize_docx(orig_path, out_path, sensitive_texts)
                return send_file(out_path, as_attachment=True, download_name=f"privacylens-sanitized-{timestamp}.docx")
            else:
                out_path = os.path.join(Config.TEMP_DIR, f"sanitized_{file_id}.pdf")
                document_service.sanitize_pdf(orig_path, out_path, sensitive_texts)
                return send_file(out_path, as_attachment=True, download_name=f"privacylens-sanitized-{timestamp}.pdf")

        # Standard image export
        protected_cv = session.get("protected_cv")
        if protected_cv is None:
            return jsonify({"error": "No protected content available."}), 400

        if fmt not in ["png", "jpg", "jpeg"]:
            fmt = "png"

        image_bytes = image_processor.cv2_to_bytes(protected_cv, format=fmt)
        download_filename = f"privacylens-protected-{timestamp}.{fmt}"
        
        response = make_response(image_bytes)
        response.headers.set('Content-Type', f'image/{fmt}')
        response.headers.set('Content-Disposition', 'attachment', filename=download_filename)
        return response

    except Exception as e:
        return jsonify({"error": f"Download failed: {str(e)}"}), 500

# ================= STEGANOGRAPHY LAB API =================

@app.route("/api/stego/encode", methods=["POST"])
def stego_encode():
    """
    Steganography Lab: Embeds a secret message into a PNG image.
    Supports optional authenticated AES-256-GCM encryption with password.
    """
    try:
        file = None
        if 'image' in request.files:
            file = request.files['image']
        elif 'file' in request.files:
            file = request.files['file']

        if not file or file.filename == '':
            return jsonify({"error": "Please provide a carrier image (PNG recommended)."}), 400

        message = request.form.get("message", "").strip()
        if not message:
            return jsonify({"error": "Secret message cannot be empty."}), 400

        password = request.form.get("password", "").strip() or None

        pil_img = Image.open(file.stream)
        stego_img = stego_service.encode(pil_img, message, password=password)

        stego_id = str(uuid.uuid4())
        out_filename = f"stego_{stego_id}.png"
        out_path = os.path.join(Config.TEMP_DIR, out_filename)
        stego_img.save(out_path, format="PNG")

        base64_data = stego_service.pil_to_base64(stego_img)

        # Store in session for download
        SESSIONS[stego_id] = {
            "filepath": out_path,
            "ext": "png",
            "protected_cv": cv2.cvtColor(np.array(stego_img), cv2.COLOR_RGB2BGR),
            "timestamp": time.time()
        }

        return jsonify({
            "success": True,
            "stego_id": stego_id,
            "encrypted": bool(password),
            "stego_image": base64_data,
            "message_length": len(message),
            "carrier_dimensions": [pil_img.width, pil_img.height]
        })

    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Steganography encoding error: {str(e)}"}), 500

@app.route("/api/stego/decode", methods=["POST"])
def stego_decode():
    """
    Steganography Lab: Extracts a secret message from a stego PNG image.
    If encrypted, requires the correct AES-256 password.
    """
    try:
        file = None
        if 'image' in request.files:
            file = request.files['image']
        elif 'file' in request.files:
            file = request.files['file']

        if not file or file.filename == '':
            return jsonify({"error": "Please provide an image to inspect for hidden data."}), 400

        password = request.form.get("password", "").strip() or None

        pil_img = Image.open(file.stream)
        result = stego_service.decode(pil_img, password=password)

        return jsonify({
            "success": True,
            **result
        })

    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Steganography decoding error: {str(e)}"}), 500

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
                "description": "Contains Aadhaar number, PAN card, account balance, IFSC, and customer name.",
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
                "title": "Customer Support Chat & Academic Score",
                "description": "Contains customer phone number, home address, email, and marks/percentage score.",
                "category": "Personal Information",
                "type": "chat"
            }
        ]
    })

# Serve production frontend if built in frontend/dist
DIST_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend", "dist")

@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_frontend(path):
    if path and not path.startswith("api/"):
        file_path = os.path.join(DIST_DIR, path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return send_file(file_path)
    
    # Fallback to SPA index.html
    index_path = os.path.join(DIST_DIR, "index.html")
    if os.path.exists(index_path):
        return send_file(index_path)
        
    return jsonify({
        "status": "online",
        "service": "Privacy Lens AI Engine API",
        "version": "2.0.0"
    })

if __name__ == "__main__":
    port = Config.PORT
    print(f"[*] Privacy Lens AI Backend starting on http://127.0.0.1:{port}")
    app.run(host="0.0.0.0", port=port, debug=Config.DEBUG)
