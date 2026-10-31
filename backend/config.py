import os

class Config:
    # App Settings
    PORT = int(os.environ.get("PORT", 5000))
    DEBUG = os.environ.get("FLASK_ENV") == "development"
    SECRET_KEY = os.environ.get("SECRET_KEY", "privacylens-ai-cybersecurity-secret-key-2026")
    
    # Upload Settings
    MAX_CONTENT_LENGTH = 50 * 1024 * 1024  # 50 MB max
    ALLOWED_EXTENSIONS = {
        # Images
        "png", "jpg", "jpeg", "webp", "bmp", "tiff",
        # Documents
        "pdf", "doc", "docx", "txt", "rtf", "xls", "xlsx", "ppt", "pptx", "odt", "ods", "odp"
    }
    TEMP_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "temp_uploads")
    SESSION_EXPIRY_SECONDS = 3600  # 1 hour auto cleanup
    
    # OCR Settings
    TESSERACT_CMD = os.environ.get("TESSERACT_CMD", r"C:\Program Files\Tesseract-OCR\tesseract.exe")
    
    # Risk Scoring Weights
    SEVERITY_WEIGHTS = {
        "Critical": 35,
        "High": 20,
        "Medium": 10,
        "Low": 5
    }
    
    CATEGORY_BASE_WEIGHTS = {
        "Authentication Information": 30,
        "Financial Information": 25,
        "Identity Information": 20,
        "Personal Information": 15,
        "Confidential Information": 15
    }
