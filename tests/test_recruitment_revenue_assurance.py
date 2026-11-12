import pathlib
import re
import shutil
import subprocess
import tempfile
import unittest

HTML = pathlib.Path(__file__).resolve().parents[1] / "products" / "recruitment-agency-revenue-assurance" / "index.html"

class RevenueAssuranceTests(unittest.TestCase):
    def test_offline_and_privacy_contract(self):
        source = HTML.read_text(encoding="utf-8")
        self.assertIn("localStorage", source)
        self.assertIn("NO CANDIDATE PII", source)
        self.assertNotRegex(source, r'<script[^>]+src=')
        self.assertNotRegex(source, r'https?://[^"\\s]+')
        for field in ("placementId", "clientId", "recruiterId", "fee", "received", "guaranteeDays"):
            self.assertIn('id="'+field+'"', source)

    def test_revenue_controls_exist(self):
        source = HTML.read_text(encoding="utf-8")
        for field in ('id="booked"', 'id="collected"', 'id="outstanding"', 'id="exposure"', 'id="watchRows"', 'id="ledgerRows"'):
            self.assertIn(field, source)
        self.assertIn("Recruiter share due", source)
        self.assertIn("Export JSON backup", source)

    def test_embedded_javascript_syntax(self):
        node = shutil.which("node")
        self.assertIsNotNone(node, "Node.js is required in the GitHub runner")
        source = HTML.read_text(encoding="utf-8")
        scripts = re.findall(r"<script>(.*?)</script>", source, flags=re.S)
        self.assertEqual(len(scripts), 1)
        with tempfile.NamedTemporaryFile("w", suffix=".js", encoding="utf-8") as handle:
            handle.write(scripts[0]); handle.flush()
            result = subprocess.run([node, "--check", handle.name], text=True, capture_output=True)
        self.assertEqual(result.returncode, 0, result.stderr)

if __name__ == "__main__":
    unittest.main()
