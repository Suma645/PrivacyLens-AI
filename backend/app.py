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
from services.sensitive_detector import SensitiveDetector, mask_sensitive_value
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
        "service": "PrivacyLens-AI Universal Document Privacy Scanner & Protection Engine",
        "version": "2.0.0",
        "opencv_version": cv2.__version__,
        "ocr_available": ocr_service.is_engine_ready(),
        "ai_service_connected": ai_service.is_ai_connected(),
        "ai_provider": ai_service.get_provider_name(),
        "supported_documents": list(DocumentService.SUPPORTED_EXTENSIONS),
        "steganography_supported": True
    })

@app.route("/api/analyze", methods=["POST"])
def analyze_screenshot():
    """
    Universal Document & Screenshot Privacy Scanner:
    - Multi-format support: PDF, DOC, DOCX, TXT, RTF, XLS, XLSX, PPT, PPTX, ODT, ODS, ODP, PNG, JPG, WEBP
    - Automatic critical detection: Aadhaar, PAN, Bank Account, IFSC, Cards (Solid Blackout by default)
    - Manual user control: Email, Phone, Student marks/grades, Names, Addresses (Kept visible by default)
    - Bounding box alignment & location mapping (Page / Sheet / Slide)
    - Confidentiality risk score calculation (0-100)
    - Generates live protected preview
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
            return jsonify({"error": "Unsupported file format. Please upload PDF, DOCX, XLSX, PPTX, TXT, RTF, or PNG/JPG/WEBP images."}), 400

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

        # Validate file safety & magic bytes
        is_safe, msg = document_service.validate_file_safety(filepath, file.filename)
        if not is_safe:
            os.remove(filepath)
            return jsonify({"error": f"Security check failed: {msg}"}), 400

        is_doc = document_service.is_document(file.filename)
        doc_meta = {}

        if is_doc:
            # 1. Process Universal Document (PDF, DOCX, XLSX, PPTX, TXT, RTF, etc.)
            doc_data = document_service.extract_document_text_and_preview(filepath, file.filename)
            pil_img = doc_data['preview_pil']
            cv_img = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
            doc_text = doc_data.get('text', '')
            pages_details = doc_data.get('pages_details', [])
            doc_meta = {
                "pages_count": doc_data.get('pages_count', 1),
                "sheets_count": doc_data.get('sheets_count', 0),
                "slides_count": doc_data.get('slides_count', 0),
                "is_document": True,
                "file_type": doc_data.get('file_type', ext)
            }
            exif_findings = {"has_exif": False, "sanitized": True}
            face_detections = []
            qr_detections = []

            # OCR scan on the document page preview
            ocr_blocks = ocr_service.extract_text_and_boxes(pil_img, cv_img, client_tokens, filename=file.filename)

            # Detect sensitive patterns per page/sheet/slide for precise location mapping
            direct_text_dets = []
            if pages_details:
                for p_info in pages_details:
                    p_text = p_info.get("text", "")
                    p_loc = p_info.get("location", "Page 1")
                    p_dets = sensitive_detector.scan_text(p_text, location=p_loc)
                    direct_text_dets.extend(p_dets)
            else:
                direct_text_dets = sensitive_detector.scan_text(doc_text, location="Page 1")

            block_dets = sensitive_detector.scan_ocr_blocks(ocr_blocks, location="Page 1 Preview")

            # Merge and align detections
            combined_raw = direct_text_dets + block_dets
            text_detections = []
            seen_texts = set()
            for d in combined_raw:
                k = f"{d['category']}_{d.get('raw_text', d['extracted_text'])}"
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
            text_detections = sensitive_detector.scan_ocr_blocks(ocr_blocks, location="Image / Screenshot")

        img_width, img_height = pil_img.size

        # Modular AI Contextual Enhancement
        all_raw_text = " ".join([b.get("text", "") for b in ocr_blocks])
        combined_detections = face_detections + qr_detections + text_detections
        enhanced_detections = ai_service.enhance_detections(all_raw_text, combined_detections, ocr_blocks=ocr_blocks)

        # Classify Priority & Deduplicate according to user requirements:
        # CRITICAL – Red: Aadhaar, PAN, Bank account, IFSC, Cards, SSN
        # HIGH – Orange: UPI ID, UTR, Passwords, OTPs, API keys
        # NORMAL – Yellow: Email, Phone, Marks & Grades, Names, Addresses
        final_detections = []
        seen_keys = set()
        for det in enhanced_detections:
            cat = det.get('category', '')
            typ = det.get('type', '')
            text_val = det.get('raw_text', det.get('extracted_text', ''))

            # Enforce 3-tier rules
            if any(h in typ.lower() for h in ['aadhaar', 'pan card', 'pan number', 'bank account', 'ifsc', 'card', 'social security', 'ssn', 'passport']):
                det['priority'] = 'critical'
                det['risk_severity'] = 'Critical'
                det['keep_visible'] = False
                det['protection_style'] = 'blackout'
                det['recommended_action'] = 'Solid Blackout'
                det['warning'] = 'CRITICAL PII: Automatically protected with solid blackout to prevent identity/financial theft.'
            elif any(hi in typ.lower() for hi in ['upi id', 'virtual payment', 'utr', 'transaction', 'password', 'otp', 'api key', 'secret']):
                det['priority'] = 'high'
                det['risk_severity'] = 'High'
                det['keep_visible'] = False
                det['protection_style'] = 'blur'
                det['recommended_action'] = 'Gaussian Blur'
            elif any(o in typ.lower() for o in ['email', 'phone', 'marks', 'percentage', 'score', 'name', 'address', 'birth']):
                det['priority'] = 'normal'
                det['risk_severity'] = 'Normal'
                det['keep_visible'] = True  # Kept visible by default per user requirement for user review!
                det['protection_style'] = 'blur'
                det['recommended_action'] = 'Blur'

            if 'masked_value' not in det:
                det['masked_value'] = mask_sensitive_value(typ, text_val)

            box = det.get('bounding_box', {})
            key = f"{cat}_{text_val}_{box.get('x', 0)}_{box.get('y', 0)}"
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
                "style": d.get("protection_style", "blackout" if d.get("priority") == "critical" else "blur")
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

        # Calculate counts
        critical_count = sum(1 for d in final_detections if d.get('priority') == 'critical')
        high_count = sum(1 for d in final_detections if d.get('priority') == 'high')
        normal_count = sum(1 for d in final_detections if d.get('priority') == 'normal')
        auto_protected_count = sum(1 for d in final_detections if not d.get('keep_visible', False))
        awaiting_decision_count = sum(1 for d in final_detections if d.get('keep_visible', False))

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
            "priority_summary": {
                "total": len(final_detections),
                "critical": critical_count,
                "high": high_count,
                "normal": normal_count,
                "auto_protected": auto_protected_count,
                "awaiting_decisions": awaiting_decision_count
            },
            "score_explanation": score_data["explanation"],
            "factor_reasons": score_data["factor_reasons"],
            "residual_risk": initial_residual,
            "original_image": original_preview,
            "protected_image": protected_preview
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Universal analysis failed: {str(e)}"}), 500

@app.route("/api/protect", methods=["POST"])
def apply_custom_protection():
    """
    Applies custom privacy modifications requested by the user:
    - User can toggle visibility of detections
    - Invert redaction selection or toggle keep_visible
    - Manual boxes supported
    - Real-time recalculation of residual confidentiality risk
    """
    try:
        data = request.get_json()
        if not data or "file_id" not in data:
            return jsonify({"error": "Missing file_id in request payload"}), 400

        file_id = data["file_id"]
        if file_id not in SESSIONS:
            return jsonify({"error": "Session expired or file not found."}), 404

        session = SESSIONS[file_id]
        original_cv = session["original_cv"]
        is_doc = session.get("is_document", False)
        detections = data.get("detections", session.get("detections", []))
        manual_boxes = data.get("manual_boxes", [])
        visible_boxes = data.get("visible_boxes", [])
        mode = data.get("mode", "spotlight")

        redaction_specs = []

        all_visible = list(visible_boxes)
        for det in detections:
            if det.get("keep_visible") is True:
                all_visible.append(det.get("bounding_box", {}))

        if mode == "spotlight" and len(all_visible) > 0 and not is_doc:
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
            for det in detections:
                if det.get("keep_visible") is True:
                    continue

                box = det.get("bounding_box", {})
                priority = det.get("priority", "normal")
                style = det.get("protection_style", "blackout" if priority == "critical" else "blur")

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
    - Supports PNG, JPG, PDF, DOCX, XLSX, PPTX, TXT, RTF, etc.
    - Permanently sanitizes original file content into separate protected copy
    - Strips all EXIF metadata and hidden layers
    """
    try:
        if file_id not in SESSIONS:
            return jsonify({"error": "Session expired or file not found."}), 404

        session = SESSIONS[file_id]
        fmt = request.args.get("format", "").lower()
        is_doc = session.get("is_document", False)
        timestamp = int(time.time())

        if is_doc:
            orig_path = session.get("filepath")
            orig_ext = session.get("ext", "pdf").lower()
            target_ext = fmt if fmt in ["pdf", "docx", "xlsx", "pptx", "txt", "rtf", "odt", "ods", "odp"] else orig_ext
            
            # Extract sensitive items that were NOT marked keep_visible
            sensitive_items = [
                {
                    "text": d.get("raw_text") or d.get("extracted_text") or d.get("text", ""),
                    "keep_visible": d.get("keep_visible", False)
                }
                for d in session.get("detections", [])
            ]
            
            out_filename = f"privacylens-protected-{timestamp}.{target_ext}"
            out_path = os.path.join(Config.TEMP_DIR, f"sanitized_{file_id}.{target_ext}")
            
            document_service.sanitize_document(orig_path, out_path, sensitive_items)
            return send_file(out_path, as_attachment=True, download_name=out_filename)

        # Standard image export
        protected_cv = session.get("protected_cv")
        if protected_cv is None:
            return jsonify({"error": "No protected content available."}), 400

        target_fmt = fmt if fmt in ["png", "jpg", "jpeg", "webp"] else "png"
        image_bytes = image_processor.cv2_to_bytes(protected_cv, format=target_fmt)
        download_filename = f"privacylens-protected-{timestamp}.{target_fmt}"
        
        response = make_response(image_bytes)
        response.headers.set('Content-Type', f'image/{target_fmt}')
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
