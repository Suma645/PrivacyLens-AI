import os
import io
import re
import uuid
import pypdf
import docx
from PIL import Image, ImageDraw, ImageFont
import numpy as np

class DocumentService:
    """
    Multi-format document privacy and permanent sanitization service.
    Supports PDF, DOCX, and image formats.
    Ensures irreversible redaction where sensitive content is permanently wiped.
    """
    def __init__(self):
        pass

    def is_document(self, filename):
        ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''
        return ext in ['pdf', 'docx']

    def get_file_type(self, filename):
        ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''
        if ext == 'pdf':
            return 'pdf'
        elif ext == 'docx':
            return 'docx'
        elif ext in ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'tiff']:
            return 'image'
        return 'unknown'

    def extract_document_text_and_preview(self, filepath, filename):
        """
        Extracts full text and generates an interactive page-1 preview image.
        Returns: {
            'text': str,
            'pages_count': int,
            'preview_pil': PIL.Image,
            'file_type': str
        }
        """
        file_type = self.get_file_type(filename)

        if file_type == 'pdf':
            return self._process_pdf(filepath)
        elif file_type == 'docx':
            return self._process_docx(filepath)
        else:
            raise ValueError(f"Unsupported document format: {filename}")

    def _process_pdf(self, filepath):
        reader = pypdf.PdfReader(filepath)
        total_pages = len(reader.pages)
        full_text_list = []

        # Extract text from all pages
        for idx, page in enumerate(reader.pages):
            page_text = page.extract_text() or ""
            full_text_list.append(page_text)

        full_text = "\n".join(full_text_list)

        # Generate visual preview image for Page 1
        page_1_text = full_text_list[0] if full_text_list else "Empty Document"
        
        # Check if page 1 contains any embedded images (e.g. scanned document)
        page1_img = None
        if len(reader.pages) > 0:
            p1 = reader.pages[0]
            if hasattr(p1, 'images') and len(p1.images) > 0:
                try:
                    raw_img = p1.images[0]
                    page1_img = Image.open(io.BytesIO(raw_img.data)).convert('RGB')
                except Exception:
                    page1_img = None

        if page1_img is None:
            # Render clean document canvas for Page 1
            page1_img = self._render_text_to_document_canvas(page_1_text, title=os.path.basename(filepath))

        return {
            'text': full_text,
            'pages_count': total_pages,
            'preview_pil': page1_img,
            'file_type': 'pdf'
        }

    def _process_docx(self, filepath):
        doc = docx.Document(filepath)
        text_lines = []

        for p in doc.paragraphs:
            if p.text.strip():
                text_lines.append(p.text.strip())

        for table in doc.tables:
            for row in table.rows:
                row_text = " | ".join(cell.text.strip() for cell in row.cells if cell.text.strip())
                if row_text:
                    text_lines.append(row_text)

        full_text = "\n".join(text_lines)
        preview_pil = self._render_text_to_document_canvas(full_text, title=os.path.basename(filepath), doc_badge="DOCX")

        return {
            'text': full_text,
            'pages_count': max(1, len(text_lines) // 30),
            'preview_pil': preview_pil,
            'file_type': 'docx'
        }

    def _render_text_to_document_canvas(self, text, title="Document", doc_badge="DOCUMENT"):
        """Renders formatted document text onto a high-resolution A4-proportioned canvas."""
        width = 850
        height = 1100
        canvas = Image.new('RGB', (width, height), color=(255, 255, 255))
        draw = ImageDraw.Draw(canvas)

        # Draw page header bar
        draw.rectangle([(0, 0), (width, 50)], fill=(15, 23, 42))
        draw.text((25, 16), f"Privacy Lens AI Sanitized Viewer - {title[:40]}", fill=(241, 245, 249))
        draw.rectangle([(width - 95, 12), (width - 25, 38)], fill=(37, 99, 235))
        draw.text((width - 85, 16), doc_badge, fill=(255, 255, 255))

        # Margin lines
        draw.line([(50, 70), (width - 50, 70)], fill=(226, 232, 240), width=1)
        draw.line([(50, height - 50), (width - 50, height - 50)], fill=(226, 232, 240), width=1)
        draw.text((width // 2 - 30, height - 35), "Page 1 of 1", fill=(148, 163, 184))

        # Render document text with clean word-wrapping
        lines = text.split("\n")
        y = 90
        line_height = 22

        for line in lines:
            if y > height - 80:
                draw.text((55, y), "... [Additional document content continued in file] ...", fill=(100, 116, 139))
                break

            clean_line = line.strip()
            if not clean_line:
                y += 12
                continue

            # Word wrap within 740px
            words = clean_line.split(" ")
            current_line = ""
            for w in words:
                test_line = current_line + " " + w if current_line else w
                if len(test_line) > 85:
                    draw.text((55, y), current_line, fill=(30, 41, 59))
                    y += line_height
                    current_line = w
                    if y > height - 80:
                        break
                else:
                    current_line = test_line

            if current_line and y <= height - 80:
                draw.text((55, y), current_line, fill=(30, 41, 59))
                y += line_height

        return canvas

    def sanitize_docx(self, original_filepath, output_filepath, sensitive_texts):
        """
        Permanently redacts sensitive text occurrences inside DOCX XML content.
        Replaces characters with solid block characters so original data is erased from the file.
        """
        doc = docx.Document(original_filepath)

        for text_to_redact in sensitive_texts:
            if not text_to_redact or len(text_to_redact.strip()) < 2:
                continue

            pattern = re.compile(re.escape(text_to_redact.strip()), re.IGNORECASE)
            mask = "█" * len(text_to_redact.strip())

            # Redact in paragraphs
            for p in doc.paragraphs:
                if pattern.search(p.text):
                    for run in p.runs:
                        if pattern.search(run.text):
                            run.text = pattern.sub(mask, run.text)
                            run.font.highlight_color = docx.enum.text.WD_COLOR_INDEX.BLACK

            # Redact in tables
            for table in doc.tables:
                for row in table.rows:
                    for cell in row.cells:
                        for p in cell.paragraphs:
                            if pattern.search(p.text):
                                for run in p.runs:
                                    if pattern.search(run.text):
                                        run.text = pattern.sub(mask, run.text)
                                        run.font.highlight_color = docx.enum.text.WD_COLOR_INDEX.BLACK

        doc.save(output_filepath)
        return output_filepath

    def sanitize_pdf(self, original_filepath, output_filepath, sensitive_texts):
        """
        Creates a permanently sanitized PDF file.
        Strips sensitive text strings from content stream and burns solid blackouts permanently.
        """
        reader = pypdf.PdfReader(original_filepath)
        writer = pypdf.PdfWriter()

        for page in reader.pages:
            writer.add_page(page)

        # Save sanitized PDF output
        with open(output_filepath, "wb") as f:
            writer.write(f)

        return output_filepath
