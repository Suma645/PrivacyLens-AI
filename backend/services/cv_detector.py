import cv2
import numpy as np
from PIL import Image, ExifTags
import uuid

class CVDetector:
    def __init__(self):
        # Load Haar Cascade for Face Detection
        try:
            cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
            self.face_cascade = cv2.CascadeClassifier(cascade_path)
        except Exception:
            self.face_cascade = None
            
        # QR Code detector
        try:
            self.qr_detector = cv2.QRCodeDetector()
        except Exception:
            self.qr_detector = None

    def detect_faces(self, image_np):
        """
        Detects faces in screenshot using OpenCV Haar cascades.
        Returns list of detection dictionaries.
        """
        detections = []
        if self.face_cascade is None or image_np is None:
            return detections

        try:
            gray = cv2.cvtColor(image_np, cv2.COLOR_BGR2GRAY)
            # Equalize histogram for screenshot lighting robustness
            gray = cv2.equalizeHist(gray)
            faces = self.face_cascade.detectMultiScale(
                gray,
                scaleFactor=1.1,
                minNeighbors=5,
                minSize=(30, 30)
            )

            for idx, (x, y, w, h) in enumerate(faces):
                # Add slight padding around detected face
                pad_x = int(w * 0.1)
                pad_y = int(h * 0.1)
                img_h, img_w = image_np.shape[:2]
                
                fx = max(0, x - pad_x)
                fy = max(0, y - pad_y)
                fw = min(img_w - fx, w + 2 * pad_x)
                fh = min(img_h - fy, h + 2 * pad_y)

                detections.append({
                    "id": f"face_{uuid.uuid4().hex[:8]}",
                    "category": "Personal Information",
                    "type": "Face / Avatar",
                    "extracted_text": "[Facial Identity / Photo]",
                    "risk_severity": "High",
                    "confidence": 0.92,
                    "bounding_box": {
                        "x": int(fx),
                        "y": int(fy),
                        "width": int(fw),
                        "height": int(fh)
                    },
                    "recommended_action": "Blur",
                    "explanation": "Biometric face or avatar detected. Sharing biometric faces allows reverse-image identity matching and impersonation.",
                    "keep_visible": False,
                    "protection_style": "blur"
                })
        except Exception as e:
            print(f"Face detection error: {e}")

        return detections

    def detect_qr_codes(self, image_np):
        """
        Detects QR codes in screenshot.
        QR codes frequently contain auth tokens, 2FA setup secrets, or payment credentials.
        """
        detections = []
        if self.qr_detector is None or image_np is None:
            return detections

        try:
            # OpenCV QRCodeDetector
            retval, decoded_info, points, _ = self.qr_detector.detectAndDecodeMulti(image_np)
            if retval and points is not None:
                for idx, (info, pts) in enumerate(zip(decoded_info, points)):
                    pts = pts.astype(int)
                    x_min = int(np.min(pts[:, 0]))
                    y_min = int(np.min(pts[:, 1]))
                    x_max = int(np.max(pts[:, 0]))
                    y_max = int(np.max(pts[:, 1]))

                    w = max(10, x_max - x_min)
                    h = max(10, y_max - y_min)

                    preview_val = info[:30] + "..." if len(info) > 30 else (info if info else "[QR Data Encoded]")
                    severity = "Critical" if any(k in info.lower() for k in ["token", "auth", "otp", "secret", "upi", "pay", "login"]) else "High"

                    detections.append({
                        "id": f"qr_{uuid.uuid4().hex[:8]}",
                        "category": "Authentication Information" if severity == "Critical" else "Confidential Information",
                        "type": "QR Code / Barcode",
                        "extracted_text": preview_val,
                        "risk_severity": severity,
                        "confidence": 0.98,
                        "bounding_box": {
                            "x": x_min,
                            "y": y_min,
                            "width": w,
                            "height": h
                        },
                        "recommended_action": "Solid Blackout",
                        "explanation": "QR code detected. QR codes in screenshots can be scanned to hijack sessions, access 2FA secrets, or trigger unintended payments.",
                        "keep_visible": False,
                        "protection_style": "blackout"
                    })
        except Exception as e:
            print(f"QR detection error: {e}")

        return detections

    def extract_exif_metadata(self, pil_image):
        """
        Extracts sensitive EXIF metadata such as GPS coordinates, camera model, and timestamp.
        """
        metadata = {
            "has_gps": False,
            "gps_info": None,
            "device_model": None,
            "software": None,
            "date_time": None,
            "warnings": []
        }

        try:
            exif_data = pil_image.getexif()
            if not exif_data:
                return metadata

            for tag_id, value in exif_data.items():
                tag_name = ExifTags.TAGS.get(tag_id, tag_id)
                if tag_name == "Model":
                    metadata["device_model"] = str(value)
                    metadata["warnings"].append(f"Device model exposed: {value}")
                elif tag_name == "Software":
                    metadata["software"] = str(value)
                elif tag_name == "DateTime":
                    metadata["date_time"] = str(value)

            # Check GPS Info
            gps_info = exif_data.get_ifd(ExifTags.IFD.GPSInfo) if hasattr(ExifTags, 'IFD') else None
            if gps_info:
                metadata["has_gps"] = True
                metadata["warnings"].append("Precise GPS location coordinates found in screenshot EXIF metadata!")
                metadata["gps_info"] = "Latitude/Longitude Embedded in EXIF"

        except Exception as e:
            print(f"EXIF parsing error: {e}")

        return metadata
