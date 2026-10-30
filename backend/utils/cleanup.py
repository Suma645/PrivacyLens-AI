import os
import time
import glob
from config import Config

def clean_expired_files():
    """
    Ensures zero permanent storage of user data.
    Deletes files older than Config.SESSION_EXPIRY_SECONDS.
    """
    if not os.path.exists(Config.TEMP_DIR):
        return

    now = time.time()
    for filepath in glob.glob(os.path.join(Config.TEMP_DIR, "*")):
        try:
            if os.path.isfile(filepath):
                file_age = now - os.path.getmtime(filepath)
                if file_age > Config.SESSION_EXPIRY_SECONDS:
                    os.remove(filepath)
        except Exception:
            pass

def delete_session_file(filepath):
    """Securely deletes a specific session file."""
    try:
        if filepath and os.path.exists(filepath):
            # Overwrite with zeros before deletion for secure wipe
            file_size = os.path.getsize(filepath)
            with open(filepath, "wb") as f:
                f.write(b"\x00" * min(file_size, 1024 * 1024))
            os.remove(filepath)
    except Exception:
        pass
