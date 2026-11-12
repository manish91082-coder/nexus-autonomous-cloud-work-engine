import pathlib
import re
import shutil
import subprocess
import tempfile
import unittest

HTML = pathlib.Path(__file__).resolve().parents[1] / "products" / "msme-ops-desk-lite" / "index.html"

class ProductSmokeTests(unittest.TestCase):
    def test_offline_and_privacy_contract(self):
        source = HTML.read_text(encoding="utf-8")
        self.assertIn('localStorage', source)
        self.assertIn('Export backup', source)
        self.assertIn('Restore backup', source)
        self.assertNotRegex(source, r'<script[^>]+src=')
        self.assertNotRegex(source, r'https?://[^"\\s]+')

    def test_required_tools_exist(self):
        source = HTML.read_text(encoding="utf-8")
        for feature in ("Unit economics calculator", "Reorder planner", "Receivables register", "Daily sales log", "Export sales CSV"):
            self.assertIn(feature, source)
        for element_id in ('id="breakeven"', 'id="rop"', 'id="dueRows"', 'id="saleRows"'):
            self.assertIn(element_id, source)

    def test_embedded_javascript_syntax(self):
        node = shutil.which("node")
        self.assertIsNotNone(node, "Node.js is required in the GitHub runner for JavaScript syntax validation")
        source = HTML.read_text(encoding="utf-8")
        scripts = re.findall(r"<script>(.*?)</script>", source, flags=re.S)
        self.assertEqual(len(scripts), 1)
        with tempfile.NamedTemporaryFile("w", suffix=".js", encoding="utf-8") as handle:
            handle.write(scripts[0])
            handle.flush()
            result = subprocess.run([node, "--check", handle.name], text=True, capture_output=True)
        self.assertEqual(result.returncode, 0, result.stderr)

if __name__ == "__main__":
    unittest.main()
