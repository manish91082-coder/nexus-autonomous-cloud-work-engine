import pathlib
import re
import shutil
import subprocess
import tempfile
import unittest

HTML = pathlib.Path(__file__).resolve().parents[1] / "products" / "recruitment-agency-revenue-assurance" / "index.html"

class RevenueAssuranceTests(unittest.TestCase):
    def setUp(self):
        self.source = HTML.read_text(encoding="utf-8")
        scripts = re.findall(r"<script>(.*?)</script>", self.source, flags=re.S)
        self.assertEqual(len(scripts), 1)
        self.script = scripts[0]

    def test_offline_and_privacy_contract(self):
        self.assertIn("localStorage", self.source)
        self.assertIn("NO CANDIDATE PII", self.source)
        self.assertNotRegex(self.source, r'<script[^>]+src=')
        self.assertNotRegex(self.source, r'https?://[^"\\s]+')
        for field in ("placementId", "clientId", "recruiterId", "fee", "share", "guaranteeDays"):
            self.assertIn('id="'+field+'"', self.source)

    def test_cash_commission_guarantee_and_ageing_controls_exist(self):
        for field in ('id="receiptAmount"', 'id="receiptDate"', 'id="commissionAmount"',
                      'id="eventType"', 'id="ageRows"', 'id="clientRows"',
                      'id="recruiterRows"', 'id="eventRows"'):
            self.assertIn(field, self.source)
        for token in ("CLIENT_RECEIPT", "COMMISSION_PAID", "CLAIM_OPENED",
                      "REPLACEMENT_COMPLETED", "Receivable ageing", "Client concentration"):
            self.assertIn(token, self.source)

    def test_formula_level_business_logic(self):
        node = shutil.which("node")
        self.assertIsNotNone(node, "Node.js is required in the GitHub runner")
        start = self.script.index("function sumReceipts")
        end = self.script.index("function load()", start)
        formulas = self.script[start:end]
        harness = formulas + r"""
const assert = require('node:assert/strict');
const placement = {fee: 10000, share: 12.5, clientId: 'C1',
  receipts: [{amount: 2000}, {amount: 1500}]};
assert.equal(sumReceipts(placement), 3500);
assert.equal(outstanding(placement), 6500);
assert.equal(commissionEarned(placement), 437.5);
assert.equal(commissionBalance(commissionEarned(placement), 100), 337.5);
assert.equal(commissionBalance(commissionEarned(placement), 500), 0);
assert.equal(ageBucket(0), '0-30');
assert.equal(ageBucket(30), '0-30');
assert.equal(ageBucket(31), '31-60');
assert.equal(ageBucket(60), '31-60');
assert.equal(ageBucket(61), '61-90');
assert.equal(ageBucket(90), '61-90');
assert.equal(ageBucket(91), '90+');
const concentration = clientConcentration([
  {fee: 10000, clientId: 'C1', receipts: [{amount: 2500}]},
  {fee: 5000, clientId: 'C1', receipts: [{amount: 1000}]},
  {fee: 3000, clientId: 'C2', receipts: [{amount: 3000}]}
]);
assert.deepEqual(concentration.C1, {amount: 11500, count: 2});
assert.equal(concentration.C2, undefined);
console.log('formula assertions: 12 passed');
"""
        with tempfile.NamedTemporaryFile("w", suffix=".js", encoding="utf-8") as handle:
            handle.write(harness)
            handle.flush()
            result = subprocess.run([node, handle.name], text=True, capture_output=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("12 passed", result.stdout)

    def test_embedded_javascript_syntax(self):
        node = shutil.which("node")
        self.assertIsNotNone(node, "Node.js is required in the GitHub runner")
        with tempfile.NamedTemporaryFile("w", suffix=".js", encoding="utf-8") as handle:
            handle.write(self.script)
            handle.flush()
            result = subprocess.run([node, "--check", handle.name], text=True, capture_output=True)
        self.assertEqual(result.returncode, 0, result.stderr)

if __name__ == "__main__":
    unittest.main()
