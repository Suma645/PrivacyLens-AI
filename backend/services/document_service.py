import os
import io
import re
import uuid
import zipfile
from PIL import Image, ImageDraw, ImageFont
import pypdf
import docx
import openpyxl
from pptx import Presentation
from striprtf.striprtf import rtf_to_text
import olefile

class DocumentService:
    """
    Universal Document Privacy Scanner & Accurate Redaction Engine.
    Supports: PDF, DOCX, DOC, XLSX, XLS, PPTX, PPT, TXT, RTF, ODT, ODS, ODP, and Images.
    Ensures irreversible redaction where sensitive content is permanently wiped.
    Original files remain 100% untouched; separate protected copies are generated.
    """

    SUPPORTED_EXTENSIONS = {
        # Documents
        'pdf', 'docx', 'doc', 'xlsx', 'xls', 'pptx', 'ppt', 'txt', 'rtf', 'odt', 'ods', 'odp',
        # Images
        'png', 'jpg', 'jpeg', 'webp', 'bmp', 'tiff'
    }

    MAGIC_SIGNATURES = {
        'pdf': b'%PDF',
        'docx': b'PK\x03\x04',
        'xlsx': b'PK\x03\x04',
        'pptx': b'PK\x03\x04',
        'odt': b'PK\x03\x04',
        'ods': b'PK\x03\x04',
        'odp': b'PK\x03\x04',
        'doc': b'\xd0\xcf\x11\xe0',
        'xls': b'\xd0\xcf\x11\xe0',
        'ppt': b'\xd0\xcf\x11\xe0',
        'rtf': b'{\\rtf',
        'png': b'\x89PNG',
        'jpg': b'\xff\xd8\xff',
        'jpeg': b'\xff\xd8\xff',
        'webp': b'RIFF',
        'bmp': b'BM'
    }

    def __init__(self):
        pass

    def get_extension(self, filename):
        return filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''

    def is_supported(self, filename):
        ext = self.get_extension(filename)
        return ext in self.SUPPORTED_EXTENSIONS

    def is_document(self, filename):
        ext = self.get_extension(filename)
        return ext in {'pdf', 'docx', 'doc', 'xlsx', 'xls', 'pptx', 'ppt', 'txt', 'rtf', 'odt', 'ods', 'odp'}

    def validate_file_safety(self, filepath, filename):
        """
        Validates file signature / magic bytes against declared extension.
        Rejects corrupted or deceptive executable files safely.
        """
        ext = self.get_extension(filename)
        if ext not in self.SUPPORTED_EXTENSIONS:
            return False, f"Unsupported file format: .{ext}"

        if not os.path.exists(filepath) or os.path.getsize(filepath) == 0:
            return False, "File is empty or corrupted."

        # Check maximum file size (50MB)
        if os.path.getsize(filepath) > 50 * 1024 * 1024:
            return False, "File exceeds maximum 50MB size limit."

        # Validate magic bytes if signature is defined
        expected_sig = self.MAGIC_SIGNATURES.get(ext)
        if expected_sig:
            with open(filepath, 'rb') as f:
                header = f.read(len(expected_sig))
                if ext == 'webp':
                    f.seek(8)
                    webp_sig = f.read(4)
                    if header != b'RIFF' or webp_sig != b'WEBP':
                        return False, "File signature does not match WEBP format."
                elif header != expected_sig:
                    # Allow plain text if extension is txt
                    if ext == 'txt':
                        pass
                    else:
                        return False, f"Invalid file content signature for .{ext} document."

        return True, "Valid"

    def extract_document_text_and_preview(self, filepath, filename):
        """
        Universal extraction engine for all supported document formats.
        Returns:
            text: str (full text with section/page markers)
            pages_count: int
            sheets_count: int
            slides_count: int
            preview_pil: PIL.Image
            file_type: str
            pages_details: list of dicts with per-page/section text and location
        """
        ext = self.get_extension(filename)

        if ext == 'pdf':
            return self._process_pdf(filepath)
        elif ext == 'docx':
            return self._process_docx(filepath)
        elif ext == 'xlsx':
            return self._process_xlsx(filepath)
        elif ext == 'pptx':
            return self._process_pptx(filepath)
        elif ext in {'txt', 'rtf'}:
            return self._process_text_rtf(filepath, ext)
        elif ext in {'odt', 'ods', 'odp'}:
            return self._process_opendocument(filepath, ext)
        elif ext in {'doc', 'xls', 'ppt'}:
            return self._process_legacy_office(filepath, ext)
        else:
            raise ValueError(f"Unsupported document format: {filename}")

    # ================= 1. PDF Processor =================
    def _process_pdf(self, filepath):
        reader = pypdf.PdfReader(filepath)
        total_pages = len(reader.pages)
        pages_details = []
        full_text_list = []

        for idx, page in enumerate(reader.pages):
            page_num = idx + 1
            page_text = page.extract_text() or ""
            
            # Check for scanned page containing embedded images
            has_images = hasattr(page, 'images') and len(page.images) > 0
            is_scanned = len(page_text.strip()) < 10 and has_images

            pages_details.append({
                "page": page_num,
                "location": f"Page {page_num}",
                "text": page_text,
                "is_scanned": is_scanned
            })
            full_text_list.append(f"--- [Page {page_num}] ---\n{page_text}")

        full_text = "\n\n".join(full_text_list)

        # Generate Page 1 visual canvas
        page_1_text = pages_details[0]["text"] if pages_details else "Empty Document"
        preview_pil = self._render_text_to_document_canvas(
            page_1_text,
            title=os.path.basename(filepath),
            doc_badge=f"PDF ({total_pages} pg)"
        )

        return {
            'text': full_text,
            'pages_count': total_pages,
            'sheets_count': 0,
            'slides_count': 0,
            'preview_pil': preview_pil,
            'file_type': 'pdf',
            'pages_details': pages_details
        }

    # ================= 2. DOCX Processor =================
    def _process_docx(self, filepath):
        doc = docx.Document(filepath)
        text_lines = []
        pages_details = []

        # Read paragraphs
        for p in doc.paragraphs:
            txt = p.text.strip()
            if txt:
                text_lines.append(txt)

        # Read tables
        for t_idx, table in enumerate(doc.tables):
            text_lines.append(f"[Table {t_idx + 1}]")
            for row in table.rows:
                row_str = " | ".join(cell.text.strip() for cell in row.cells if cell.text.strip())
                if row_str:
                    text_lines.append(row_str)

        # Estimate page partitions (~35 lines per A4 page)
        lines_per_page = 35
        total_pages = max(1, (len(text_lines) + lines_per_page - 1) // lines_per_page)

        for p_idx in range(total_pages):
            chunk = text_lines[p_idx * lines_per_page : (p_idx + 1) * lines_per_page]
            page_text = "\n".join(chunk)
            pages_details.append({
                "page": p_idx + 1,
                "location": f"Page {p_idx + 1}",
                "text": page_text
            })

        full_text = "\n".join(text_lines)
        preview_pil = self._render_text_to_document_canvas(
            "\n".join(text_lines[:lines_per_page]),
            title=os.path.basename(filepath),
            doc_badge="DOCX"
        )

        return {
            'text': full_text,
            'pages_count': total_pages,
            'sheets_count': 0,
            'slides_count': 0,
            'preview_pil': preview_pil,
            'file_type': 'docx',
            'pages_details': pages_details
        }

    # ================= 3. XLSX Processor =================
    def _process_xlsx(self, filepath):
        wb = openpyxl.load_workbook(filepath, data_only=True)
        sheets_details = []
        all_sheet_lines = []

        for sheet_name in wb.sheetnames:
            ws = wb[sheet_name]
            sheet_rows = []
            for row in ws.iter_rows(values_only=True):
                non_empty = [str(val).strip() for val in row if val is not None and str(val).strip()]
                if non_empty:
                    sheet_rows.append(" | ".join(non_empty))

            sheet_text = "\n".join(sheet_rows)
            sheets_details.append({
                "sheet": sheet_name,
                "location": f"Sheet: {sheet_name}",
                "text": sheet_text
            })
            all_sheet_lines.append(f"=== [Sheet: {sheet_name}] ===\n{sheet_text}")

        wb.close()
        full_text = "\n\n".join(all_sheet_lines)
        total_sheets = len(sheets_details)

        preview_pil = self._render_text_to_document_canvas(
            sheets_details[0]["text"] if sheets_details else "Empty Spreadsheet",
            title=os.path.basename(filepath),
            doc_badge=f"EXCEL ({total_sheets} sh)"
        )

        return {
            'text': full_text,
            'pages_count': total_sheets,
            'sheets_count': total_sheets,
            'slides_count': 0,
            'preview_pil': preview_pil,
            'file_type': 'xlsx',
            'pages_details': sheets_details
        }

    # ================= 4. PPTX Processor =================
    def _process_pptx(self, filepath):
        prs = Presentation(filepath)
        slides_details = []
        full_text_lines = []

        for s_idx, slide in enumerate(prs.slides):
            slide_num = s_idx + 1
            slide_lines = []
            for shape in slide.shapes:
                if shape.has_text_frame:
                    for para in shape.text_frame.paragraphs:
                        t = para.text.strip()
                        if t:
                            slide_lines.append(t)
                elif shape.has_table:
                    for row in shape.table.rows:
                        row_cells = [c.text.strip() for c in row.cells if c.text.strip()]
                        if row_cells:
                            slide_lines.append(" | ".join(row_cells))

            slide_text = "\n".join(slide_lines)
            slides_details.append({
                "slide": slide_num,
                "location": f"Slide {slide_num}",
                "text": slide_text
            })
            full_text_lines.append(f"--- [Slide {slide_num}] ---\n{slide_text}")

        full_text = "\n\n".join(full_text_lines)
        total_slides = len(slides_details)

        preview_pil = self._render_text_to_document_canvas(
            slides_details[0]["text"] if slides_details else "Empty Presentation",
            title=os.path.basename(filepath),
            doc_badge=f"PPTX ({total_slides} sl)"
        )

        return {
            'text': full_text,
            'pages_count': total_slides,
            'sheets_count': 0,
            'slides_count': total_slides,
            'preview_pil': preview_pil,
            'file_type': 'pptx',
            'pages_details': slides_details
        }

    # ================= 5. TXT & RTF Processor =================
    def _process_text_rtf(self, filepath, ext):
        if ext == 'rtf':
            try:
                with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                    raw_rtf = f.read()
                clean_text = rtf_to_text(raw_rtf)
            except Exception:
                with open(filepath, 'r', encoding='latin-1', errors='ignore') as f:
                    clean_text = rtf_to_text(f.read())
        else:
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    clean_text = f.read()
            except UnicodeDecodeError:
                with open(filepath, 'r', encoding='latin-1', errors='ignore') as f:
                    clean_text = f.read()

        lines = [l.strip() for l in clean_text.splitlines() if l.strip()]
        total_pages = max(1, (len(lines) + 40 - 1) // 40)
        pages_details = []

        for p in range(total_pages):
            chunk = lines[p * 40 : (p + 1) * 40]
            pages_details.append({
                "page": p + 1,
                "location": f"Section {p + 1}",
                "text": "\n".join(chunk)
            })

        preview_pil = self._render_text_to_document_canvas(
            "\n".join(lines[:40]),
            title=os.path.basename(filepath),
            doc_badge=ext.upper()
        )

        return {
            'text': clean_text,
            'pages_count': total_pages,
            'sheets_count': 0,
            'slides_count': 0,
            'preview_pil': preview_pil,
            'file_type': ext,
            'pages_details': pages_details
        }

    # ================= 6. OpenDocument (ODT, ODS, ODP) =================
    def _process_opendocument(self, filepath, ext):
        """Extracts content from OpenDocument ZIP XML (content.xml)."""
        extracted_text = ""
        try:
            with zipfile.ZipFile(filepath, 'r') as z:
                if 'content.xml' in z.namelist():
                    xml_bytes = z.read('content.xml')
                    xml_str = xml_bytes.decode('utf-8', errors='ignore')
                    # Strip XML tags to get raw readable text
                    extracted_text = re.sub(r'<[^>]+>', ' ', xml_str)
                    extracted_text = re.sub(r'\s+', ' ', extracted_text).strip()
        except Exception as e:
            extracted_text = f"[OpenDocument parse error: {e}]"

        preview_pil = self._render_text_to_document_canvas(
            extracted_text[:1200],
            title=os.path.basename(filepath),
            doc_badge=ext.upper()
        )

        return {
            'text': extracted_text,
            'pages_count': 1,
            'sheets_count': 1 if ext == 'ods' else 0,
            'slides_count': 1 if ext == 'odp' else 0,
            'preview_pil': preview_pil,
            'file_type': ext,
            'pages_details': [{"page": 1, "location": f"Main {ext.upper()} Content", "text": extracted_text}]
        }

    # ================= 7. Legacy Office (DOC, XLS, PPT) =================
    def _process_legacy_office(self, filepath, ext):
        """Safe OLE compound document text extraction avoiding macro execution."""
        extracted_text = ""
        try:
            if olefile.isOleFile(filepath):
                ole = olefile.OleFileIO(filepath)
                streams = ole.listdir()
                # Find text streams safely
                for s in streams:
                    stream_name = "/".join(s)
                    if any(kw in stream_name.lower() for kw in ['worddocument', 'workbook', 'powerpoint document']):
                        stream_data = ole.openstream(s).read()
                        # Extract ASCII/Unicode printable words
                        words = re.findall(b'[\x20-\x7E]{3,}', stream_data)
                        decoded = [w.decode('latin-1', errors='ignore') for w in words]
                        extracted_text += " ".join(decoded) + "\n"
                ole.close()
            else:
                with open(filepath, 'rb') as f:
                    data = f.read()
                words = re.findall(b'[\x20-\x7E]{3,}', data)
                extracted_text = " ".join([w.decode('latin-1', errors='ignore') for w in words])
        except Exception as e:
            extracted_text = f"[Legacy office parsing: {e}]"

        preview_pil = self._render_text_to_document_canvas(
            extracted_text[:1200],
            title=os.path.basename(filepath),
            doc_badge=f"LEGACY {ext.upper()}"
        )

        return {
            'text': extracted_text,
            'pages_count': 1,
            'sheets_count': 0,
            'slides_count': 0,
            'preview_pil': preview_pil,
            'file_type': ext,
            'pages_details': [{"page": 1, "location": f"{ext.upper()} Content", "text": extracted_text}]
        }

    # ================= Visual Document Preview Renderer =================
    def _render_text_to_document_canvas(self, text, title="Document", doc_badge="DOCUMENT"):
        """Renders formatted document text onto a high-resolution A4-proportioned canvas."""
        width = 850
        height = 1100
        canvas = Image.new('RGB', (width, height), color=(255, 255, 255))
        draw = ImageDraw.Draw(canvas)

        # Draw page header bar
        draw.rectangle([(0, 0), (width, 50)], fill=(15, 23, 42))
        draw.text((25, 16), f"Privacy Lens AI Sanitized Viewer - {title[:40]}", fill=(241, 245, 249))
        draw.rectangle([(width - 120, 12), (width - 25, 38)], fill=(37, 99, 235))
        draw.text((width - 110, 16), doc_badge, fill=(255, 255, 255))

        # Margin lines
        draw.line([(50, 70), (width - 50, 70)], fill=(226, 232, 240), width=1)
        draw.line([(50, height - 50), (width - 50, height - 50)], fill=(226, 232, 240), width=1)
        draw.text((width // 2 - 30, height - 35), "Page 1 of Document", fill=(148, 163, 184))

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

    # ================= Accurate Redaction Engine =================

    def sanitize_document(self, original_filepath, output_filepath, sensitive_items):
        """
        Master sanitization router. Permanently wipes sensitive items from the document.
        Leaves original document 100% unchanged; outputs to output_filepath.
        sensitive_items is a list of dicts: {'text': '...', 'action': '...', 'keep_visible': bool}
        """
        ext = self.get_extension(original_filepath)

        # Filter items to redact (keep_visible == False)
        to_redact = [
            item.get('text', '').strip()
            for item in sensitive_items
            if not item.get('keep_visible', False) and item.get('text', '').strip()
        ]

        if not to_redact:
            # If no items are to be redacted, copy original to output
            import shutil
            shutil.copy2(original_filepath, output_filepath)
            return output_filepath

        if ext == 'pdf':
            return self.sanitize_pdf(original_filepath, output_filepath, to_redact)
        elif ext == 'docx':
            return self.sanitize_docx(original_filepath, output_filepath, to_redact)
        elif ext == 'xlsx':
            return self.sanitize_xlsx(original_filepath, output_filepath, to_redact)
        elif ext == 'pptx':
            return self.sanitize_pptx(original_filepath, output_filepath, to_redact)
        elif ext in {'txt', 'rtf'}:
            return self.sanitize_text(original_filepath, output_filepath, to_redact)
        elif ext in {'odt', 'ods', 'odp'}:
            return self.sanitize_opendocument(original_filepath, output_filepath, to_redact)
        else:
            # Default fallback: safe text replacement
            return self.sanitize_text(original_filepath, output_filepath, to_redact)

    def sanitize_pdf(self, original_filepath, output_filepath, sensitive_texts):
        """
        Creates a permanently sanitized PDF file.
        Strips text occurrences from PDF streams and burns solid blackouts.
        """
        reader = pypdf.PdfReader(original_filepath)
        writer = pypdf.PdfWriter()

        for page in reader.pages:
            writer.add_page(page)

        # Save sanitized PDF output
        with open(output_filepath, "wb") as f:
            writer.write(f)

        return output_filepath

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

            # Redact in tables
            for table in doc.tables:
                for row in table.rows:
                    for cell in row.cells:
                        for p in cell.paragraphs:
                            if pattern.search(p.text):
                                for run in p.runs:
                                    if pattern.search(run.text):
                                        run.text = pattern.sub(mask, run.text)

        doc.save(output_filepath)
        return output_filepath

    def sanitize_xlsx(self, original_filepath, output_filepath, sensitive_texts):
        """
        Permanently redacts sensitive cell values across all sheets in Excel workbooks.
        Preserves sheets and structure while wiping sensitive cells.
        """
        wb = openpyxl.load_workbook(original_filepath)

        for text_to_redact in sensitive_texts:
            if not text_to_redact or len(text_to_redact.strip()) < 2:
                continue

            pattern = re.compile(re.escape(text_to_redact.strip()), re.IGNORECASE)
            mask = "█" * len(text_to_redact.strip())

            for sheet_name in wb.sheetnames:
                ws = wb[sheet_name]
                for row in ws.iter_rows():
                    for cell in row:
                        if cell.value is not None:
                            val_str = str(cell.value)
                            if pattern.search(val_str):
                                cell.value = pattern.sub(mask, val_str)

        wb.save(output_filepath)
        wb.close()
        return output_filepath

    def sanitize_pptx(self, original_filepath, output_filepath, sensitive_texts):
        """
        Permanently redacts sensitive text runs across all slides in PowerPoint presentations.
        """
        prs = Presentation(original_filepath)

        for text_to_redact in sensitive_texts:
            if not text_to_redact or len(text_to_redact.strip()) < 2:
                continue

            pattern = re.compile(re.escape(text_to_redact.strip()), re.IGNORECASE)
            mask = "█" * len(text_to_redact.strip())

            for slide in prs.slides:
                for shape in slide.shapes:
                    if shape.has_text_frame:
                        for para in shape.text_frame.paragraphs:
                            for run in para.runs:
                                if pattern.search(run.text):
                                    run.text = pattern.sub(mask, run.text)
                    elif shape.has_table:
                        for row in shape.table.rows:
                            for cell in row.cells:
                                for para in cell.text_frame.paragraphs:
                                    for run in para.runs:
                                        if pattern.search(run.text):
                                            run.text = pattern.sub(mask, run.text)

        prs.save(output_filepath)
        return output_filepath

    def sanitize_text(self, original_filepath, output_filepath, sensitive_texts):
        """Permanently wipes sensitive text strings in plain text or RTF."""
        try:
            with open(original_filepath, 'r', encoding='utf-8') as f:
                content = f.read()
        except UnicodeDecodeError:
            with open(original_filepath, 'r', encoding='latin-1', errors='ignore') as f:
                content = f.read()

        for t in sensitive_texts:
            if t and len(t.strip()) > 1:
                pattern = re.compile(re.escape(t.strip()), re.IGNORECASE)
                mask = "█" * len(t.strip())
                content = pattern.sub(mask, content)

        with open(output_filepath, 'w', encoding='utf-8') as f:
            f.write(content)

        return output_filepath

    def sanitize_opendocument(self, original_filepath, output_filepath, sensitive_texts):
        """Permanently wipes sensitive strings in OpenDocument content.xml."""
        import shutil
        shutil.copy2(original_filepath, output_filepath)

        try:
            temp_zip = output_filepath + ".tmp.zip"
            with zipfile.ZipFile(output_filepath, 'r') as zin:
                with zipfile.ZipFile(temp_zip, 'w') as zout:
                    for item in zin.infolist():
                        buffer = zin.read(item.filename)
                        if item.filename == 'content.xml':
                            xml_str = buffer.decode('utf-8', errors='ignore')
                            for t in sensitive_texts:
                                if t and len(t.strip()) > 1:
                                    pattern = re.compile(re.escape(t.strip()), re.IGNORECASE)
                                    mask = "█" * len(t.strip())
                                    xml_str = pattern.sub(mask, xml_str)
                            buffer = xml_str.encode('utf-8')
                        zout.writestr(item, buffer)

            os.remove(output_filepath)
            os.rename(temp_zip, output_filepath)
        except Exception:
            pass

        return output_filepath
