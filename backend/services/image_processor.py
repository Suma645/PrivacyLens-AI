import cv2
import numpy as np
from PIL import Image, ImageOps
import io
import base64

class ImageProcessor:
    def __init__(self):
        pass

    def apply_gaussian_blur(self, image_np, x, y, w, h, intensity=51):
        """
        Applies multi-pass Gaussian blur to region so text cannot be deblurred or reconstructed.
        """
        img_h, img_w = image_np.shape[:2]
        x1 = max(0, x)
        y1 = max(0, y)
        x2 = min(img_w, x + w)
        y2 = min(img_h, y + h)

        if x2 <= x1 or y2 <= y1:
            return image_np

        roi = image_np[y1:y2, x1:x2]
        # Kernel must be odd
        ksize = intensity if intensity % 2 == 1 else intensity + 1
        
        # Two-pass heavy Gaussian blur for irreversible redaction
        blurred = cv2.GaussianBlur(roi, (ksize, ksize), 30)
        blurred = cv2.GaussianBlur(blurred, (ksize, ksize), 30)
        image_np[y1:y2, x1:x2] = blurred
        return image_np

    def apply_pixelation(self, image_np, x, y, w, h, block_size=16):
        """
        Applies heavy mosaic pixelation to region.
        Downsamples to tiny grid, then upsamples using INTER_NEAREST.
        """
        img_h, img_w = image_np.shape[:2]
        x1 = max(0, x)
        y1 = max(0, y)
        x2 = min(img_w, x + w)
        y2 = min(img_h, y + h)

        if x2 <= x1 or y2 <= y1:
            return image_np

        roi = image_np[y1:y2, x1:x2]
        roi_h, roi_w = roi.shape[:2]

        # Calculate small target dimensions
        small_w = max(1, roi_w // block_size)
        small_h = max(1, roi_h // block_size)

        # Downscale and upscale back
        small = cv2.resize(roi, (small_w, small_h), interpolation=cv2.INTER_LINEAR)
        pixelated = cv2.resize(small, (roi_w, roi_h), interpolation=cv2.INTER_NEAREST)

        image_np[y1:y2, x1:x2] = pixelated
        return image_np

    def apply_solid_blackout(self, image_np, x, y, w, h, color=(15, 23, 42)):
        """
        Applies solid opaque fill (Dark Navy/Black) completely wiping original pixel values.
        """
        img_h, img_w = image_np.shape[:2]
        x1 = max(0, x)
        y1 = max(0, y)
        x2 = min(img_w, x + w)
        y2 = min(img_h, y + h)

        if x2 <= x1 or y2 <= y1:
            return image_np

        # Completely replace region with solid color
        image_np[y1:y2, x1:x2] = color

        # Add subtle cyber protection border around redaction box
        cv2.rectangle(image_np, (x1, y1), (x2, y2), (59, 130, 246), 1)
        return image_np

    def redact_image(self, original_cv_image, redaction_specs):
        """
        Applies redactions to a copy of the original image based on redaction_specs.
        redaction_specs: list of dicts:
          { 'x': int, 'y': int, 'width': int, 'height': int, 'style': 'blur' | 'pixelate' | 'blackout' }
        """
        if original_cv_image is None:
            return None

        # Work on a clean copy - NEVER alter the original
        protected = original_cv_image.copy()

        for spec in redaction_specs:
            x = int(spec.get("x", 0))
            y = int(spec.get("y", 0))
            w = int(spec.get("width", 0))
            h = int(spec.get("height", 0))
            style = spec.get("style", "blur").lower()

            if style == "blur":
                protected = self.apply_gaussian_blur(protected, x, y, w, h, intensity=51)
            elif style == "pixelate":
                protected = self.apply_pixelation(protected, x, y, w, h, block_size=16)
            elif style == "blackout":
                protected = self.apply_solid_blackout(protected, x, y, w, h, color=(10, 15, 25))
            else:
                protected = self.apply_gaussian_blur(protected, x, y, w, h)

        return protected

    def cv2_to_base64(self, cv_image, format="PNG"):
        """Converts OpenCV image matrix to data URI base64 string without EXIF."""
        # Convert BGR to RGB
        rgb_image = cv2.cvtColor(cv_image, cv2.COLOR_BGR2RGB)
        pil_img = Image.fromarray(rgb_image)
        
        # Save to buffer without metadata
        buf = io.BytesIO()
        ext = "PNG" if format.upper() == "PNG" else "JPEG"
        pil_img.save(buf, format=ext, quality=95)
        buf.seek(0)
        encoded = base64.b64encode(buf.getvalue()).decode("utf-8")
        mime = "image/png" if ext == "PNG" else "image/jpeg"
        return f"data:{mime};base64,{encoded}"

    def cv2_to_bytes(self, cv_image, format="PNG"):
        """Converts OpenCV image to pure bytes for download."""
        rgb_image = cv2.cvtColor(cv_image, cv2.COLOR_BGR2RGB)
        pil_img = Image.fromarray(rgb_image)
        buf = io.BytesIO()
        ext = "PNG" if format.upper() == "PNG" else "JPEG"
        pil_img.save(buf, format=ext, quality=95)
        return buf.getvalue()
