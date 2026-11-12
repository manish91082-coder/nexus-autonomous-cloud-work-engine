import pathlib
import re
import unittest

HTML = pathlib.Path(__file__).resolve().parents[1] / "products" / "msme-ops-desk-lite" / "index.html"

class ProductSmokeTests(unittest.TestCase):
    def test_offline_and_privacy_contract(self):
        source = HTML.read_text(encoding="utf-8")
        self.assertIn('localStorage', source)
        self.assertIn('Export backup', source)
        self.assertIn('Restore backup', source)
        self.assertNotRegex(source, r'<script[^>]+src=')
        self.assertNotRegex(source, r'https?://[^"\s]+')

    def test_required_tools_exist(self):
        source = HTML.read_text(encoding="utf-8")
        for feature in ("Unit economics calculator", "Reorder planner", "Receivables register", "Daily sales log", "Export sales CSV"):
            self.assertIn(feature, source)
        self.assertIn('id="breakeven"', source)
        self.assertIn('id="rop"', source)
        self.assertIn('id="dueRows"', source)
        self.assertIn('id="saleRows"', source)

if __name__ == "__main__":
    unittest.main()
