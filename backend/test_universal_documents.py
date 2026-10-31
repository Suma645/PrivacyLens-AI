import os
import sys
import unittest
import pypdf
import docx
import openpyxl
from pptx import Presentation

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from services.document_service import DocumentService
from services.sensitive_detector import SensitiveDetector, mask_sensitive_value
from services.risk_scorer import RiskScorer

class TestUniversalDocuments(unittest.TestCase):
    def setUp(self):
        self.doc_service = DocumentService()
        self.detector = SensitiveDetector()
        self.scorer = RiskScorer()
        self.temp_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "test_temp")
        os.makedirs(self.temp_dir, exist_ok=True)

    def test_priority_and_masking(self):
        """Verify 3-tier priority categorization and data masking."""
        text = """
        Confidential Employee Record
        Aadhaar Number: 8876 5432 1088
        PAN Card: ABCDE1234F
        Bank Account Number: 987654321012
        Bank IFSC: SBIN0001420
        Card Number: 4532 1122 3344 1092
        UPI ID: rahul.sharma@okhdfcbank
        Contact Email: rahul.sharma@example.com
        Mobile Phone: +91 98765 43210
        Academic Total Marks: 94.5% (CGPA: 9.20)
        """

        findings = self.detector.scan_text(text, location="Page 1")
        self.assertGreater(len(findings), 5)

        # Check Critical items (Aadhaar, PAN, Bank, IFSC, Cards)
        critical_types = [f["type"] for f in findings if f["priority"] == "critical"]
        self.assertTrue(any("Aadhaar" in t for t in critical_types))
        self.assertTrue(any("PAN" in t for t in critical_types))
        self.assertTrue(any("Bank Account" in t for t in critical_types))
        self.assertTrue(any("IFSC" in t for t in critical_types))

        for f in findings:
            if f["priority"] == "critical":
                # Critical MUST be automatically protected
                self.assertFalse(f["keep_visible"], f"Critical item {f['type']} must not be kept visible by default")
                self.assertEqual(f["protection_style"], "blackout")
            elif f["priority"] == "normal":
                # Normal MUST be kept visible for user review
                self.assertTrue(f["keep_visible"], f"Normal item {f['type']} must be kept visible by default")

        # Risk score must be calculated and must never be 0
        score_res = self.scorer.calculate_score(findings)
        self.assertGreaterEqual(score_res["score"], 50)
        self.assertIn("Critical", score_res["classification"])

    def test_docx_processing_and_sanitization(self):
        """Verify DOCX text extraction, structure preservation, and permanent redaction."""
        test_path = os.path.join(self.temp_dir, "test_input.docx")
        out_path = os.path.join(self.temp_dir, "test_sanitized.docx")

        doc = docx.Document()
        doc.add_heading("Confidential Student Record", 0)
        doc.add_paragraph("Student Aadhaar: 8876 5432 1088")
        doc.add_paragraph("Income Tax PAN: ABCDE1234F")
        doc.add_paragraph("Official Contact: student@university.edu")
        table = doc.add_table(rows=2, cols=2)
        table.rows[0].cells[0].text = "Account Details"
        table.rows[0].cells[1].text = "Bank A/C 987654321012"
        table.rows[1].cells[0].text = "Semester Results"
        table.rows[1].cells[1].text = "Total Marks: 92.4% CGPA: 9.1"
        doc.save(test_path)

        # 1. Extraction test
        data = self.doc_service.extract_document_text_and_preview(test_path, "test_input.docx")
        self.assertIn("8876 5432 1088", data["text"])
        self.assertIn("ABCDE1234F", data["text"])

        # 2. Sanitization test (Permanent Redaction of Critical items)
        sensitive_items = [
            {"text": "8876 5432 1088", "keep_visible": False},
            {"text": "ABCDE1234F", "keep_visible": False},
            {"text": "987654321012", "keep_visible": False},
            {"text": "student@university.edu", "keep_visible": True} # Kept visible
        ]

        self.doc_service.sanitize_document(test_path, out_path, sensitive_items)

        # 3. Verify original is 100% untouched
        with open(test_path, "rb") as f:
            orig_content = f.read()
        self.assertGreater(len(orig_content), 100)

        # 4. Verify sanitized file does NOT contain critical values
        sanitized_doc = docx.Document(out_path)
        sanitized_text = " ".join([p.text for p in sanitized_doc.paragraphs] + [c.text for t in sanitized_doc.tables for r in t.rows for c in r.cells])
        self.assertNotIn("8876 5432 1088", sanitized_text)
        self.assertNotIn("ABCDE1234F", sanitized_text)
        self.assertNotIn("987654321012", sanitized_text)
        # Verify kept visible item is still there
        self.assertIn("student@university.edu", sanitized_text)

    def test_xlsx_processing_and_sanitization(self):
        """Verify XLSX worksheets processing and permanent cell wiping."""
        test_path = os.path.join(self.temp_dir, "test_input.xlsx")
        out_path = os.path.join(self.temp_dir, "test_sanitized.xlsx")

        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Financials"
        ws.append(["Name", "Aadhaar", "PAN", "Bank Account", "Email"])
        ws.append(["Alice", "8876 5432 1088", "ABCDE1234F", "A/C 987654321012", "alice@example.com"])
        wb.save(test_path)

        data = self.doc_service.extract_document_text_and_preview(test_path, "test_input.xlsx")
        self.assertEqual(data["sheets_count"], 1)
        self.assertIn("8876 5432 1088", data["text"])

        sensitive_items = [
            {"text": "8876 5432 1088", "keep_visible": False},
            {"text": "ABCDE1234F", "keep_visible": False},
            {"text": "987654321012", "keep_visible": False}
        ]
        self.doc_service.sanitize_document(test_path, out_path, sensitive_items)

        wb_out = openpyxl.load_workbook(out_path)
        ws_out = wb_out["Financials"]
        out_row = [str(cell.value) for cell in ws_out[2]]
        wb_out.close()

        out_row_str = " ".join(out_row)
        self.assertNotIn("8876 5432 1088", out_row_str)
        self.assertNotIn("ABCDE1234F", out_row_str)
        self.assertIn("alice@example.com", out_row_str)

    def test_pptx_processing_and_sanitization(self):
        """Verify PPTX slide parsing and redaction."""
        test_path = os.path.join(self.temp_dir, "test_input.pptx")
        out_path = os.path.join(self.temp_dir, "test_sanitized.pptx")

        prs = Presentation()
        blank_slide_layout = prs.slide_layouts[6]
        slide = prs.slides.add_slide(blank_slide_layout)
        txBox = slide.shapes.add_textbox(100, 100, 400, 200)
        tf = txBox.text_frame
        p = tf.add_paragraph()
        p.text = "Customer PAN: ABCDE1234F | Aadhaar: 8876 5432 1088"
        prs.save(test_path)

        data = self.doc_service.extract_document_text_and_preview(test_path, "test_input.pptx")
        self.assertEqual(data["slides_count"], 1)

        sensitive_items = [
            {"text": "ABCDE1234F", "keep_visible": False},
            {"text": "8876 5432 1088", "keep_visible": False}
        ]
        self.doc_service.sanitize_document(test_path, out_path, sensitive_items)

        prs_out = Presentation(out_path)
        out_text = " ".join([shape.text_frame.text for s in prs_out.slides for shape in s.shapes if shape.has_text_frame])
        self.assertNotIn("ABCDE1234F", out_text)
        self.assertNotIn("8876 5432 1088", out_text)

    def test_txt_processing_and_sanitization(self):
        """Verify plain text and RTF sanitization."""
        test_path = os.path.join(self.temp_dir, "test_input.txt")
        out_path = os.path.join(self.temp_dir, "test_sanitized.txt")

        content = "Confidential Report:\nAadhaar: 8876 5432 1088\nUPI: payee@okhdfcbank\n"
        with open(test_path, "w", encoding="utf-8") as f:
            f.write(content)

        sensitive_items = [
            {"text": "8876 5432 1088", "keep_visible": False},
            {"text": "payee@okhdfcbank", "keep_visible": False}
        ]
        self.doc_service.sanitize_document(test_path, out_path, sensitive_items)

        with open(out_path, "r", encoding="utf-8") as f:
            sanitized_txt = f.read()

        self.assertNotIn("8876 5432 1088", sanitized_txt)
        self.assertNotIn("payee@okhdfcbank", sanitized_txt)
        self.assertIn("████", sanitized_txt)

    def tearDown(self):
        import shutil
        if os.path.exists(self.temp_dir):
            shutil.rmtree(self.temp_dir, ignore_errors=True)

if __name__ == "__main__":
    unittest.main()
