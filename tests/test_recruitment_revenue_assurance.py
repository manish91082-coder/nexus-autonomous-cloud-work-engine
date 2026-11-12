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
        for field in ("placementId", "clientId", "recruiterId", "invoiceRef", "invoiceDate", "dueDate", "guaranteePaymentRule", "fee", "share", "guaranteeDays"):
            self.assertIn('id="'+field+'"', self.source)

    def test_cash_commission_guarantee_and_ageing_controls_exist(self):
        for field in ('id="receiptAmount"', 'id="receiptDate"', 'id="commissionAmount"',
                      'id="eventType"', 'id="ageRows"', 'id="clientRows"',
                      'id="recruiterRows"', 'id="eventRows"'):
            self.assertIn(field, self.source)
        for token in ("CLIENT_RECEIPT", "COMMISSION_PAID", "CLAIM_OPENED",
                      "REPLACEMENT_COMPLETED", "Receivable ageing", "Client concentration",
                      "Payment-linked guarantee review", "Contractual payment due date"):
            self.assertIn(token, self.source)

    def test_legacy_migration_does_not_resurrect_cleared_records(self):
        self.assertIn("const hasV2=localStorage.getItem(KEY)!==null", self.script)
        self.assertIn('localStorage.removeItem("recruitment_revenue_assurance_v1")', self.script)
        self.assertIn('localStorage.removeItem(KEY)', self.script)

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
assert.equal(ageDays({placedDate:'2026-11-01', dueDate:'2026-11-10'}, '2026-11-12'), 2);
assert.equal(ageDays({placedDate:'2026-11-01', dueDate:'2026-11-20'}, '2026-11-12'), -8);
assert.equal(ageBucket(-1), 'NOT_DUE');
assert.equal(ageBucket(0), '0-30');
assert.equal(ageBucket(30), '0-30');
assert.equal(ageBucket(31), '31-60');
assert.equal(ageBucket(60), '31-60');
assert.equal(ageBucket(61), '61-90');
assert.equal(ageBucket(90), '61-90');
assert.equal(ageBucket(91), '90+');
const latePaid = {fee: 1000, share: 10, dueDate:'2026-11-05', guaranteePaymentRule:'ON_TIME_PAYMENT_REQUIRED', receipts:[{amount:500,date:'2026-11-06'}]};
assert.equal(paymentRisk(latePaid, '2026-11-12'), 'PAID_LATE');
const overdueOpen = {fee:1000, share:10, dueDate:'2026-11-05', guaranteePaymentRule:'ON_TIME_PAYMENT_REQUIRED', receipts:[]};
assert.equal(paymentRisk(overdueOpen, '2026-11-12'), 'OVERDUE_OPEN');
const notDue = {fee:1000, share:10, dueDate:'2026-11-20', guaranteePaymentRule:'ON_TIME_PAYMENT_REQUIRED', receipts:[]};
assert.equal(paymentRisk(notDue, '2026-11-12'), 'CURRENT');
assert.equal(paymentRisk({fee:1000,share:10,guaranteePaymentRule:'ON_TIME_PAYMENT_REQUIRED',receipts:[]}, '2026-11-12'), 'DUE_DATE_MISSING');
assert.equal(paymentRisk({fee:1000,share:10,guaranteePaymentRule:'NOT_REVIEWED',receipts:[]}, '2026-11-12'), 'REVIEW_REQUIRED');
assert.equal(paymentRisk({fee:1000,share:10,guaranteePaymentRule:'PAYMENT_INDEPENDENT',receipts:[]}, '2026-11-12'), 'NOT_LINKED');
assert.equal(paymentRisk({fee:1000,share:10,guaranteePaymentRule:'CUSTOM_REVIEW',receipts:[]}, '2026-11-12'), 'MANUAL_REVIEW');
const concentration = clientConcentration([
  {fee: 10000, clientId: 'C1', receipts: [{amount: 2500}]},
  {fee: 5000, clientId: 'C1', receipts: [{amount: 1000}]},
  {fee: 3000, clientId: 'C2', receipts: [{amount: 3000}]}
]);
assert.deepEqual(concentration.C1, {amount: 11500, count: 2});
assert.equal(concentration.C2, undefined);
console.log('formula assertions: 22 passed');
"""
        with tempfile.NamedTemporaryFile("w", suffix=".js", encoding="utf-8") as handle:
            handle.write(harness)
            handle.flush()
            result = subprocess.run([node, handle.name], text=True, capture_output=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("12 passed", result.stdout)

    def test_guarantee_date_math(self):
        node = shutil.which("node")
        self.assertIsNotNone(node, "Node.js is required in the GitHub runner")
        start = self.script.index("function endDate")
        end = self.script.index("function daysLeft", start)
        function = self.script[start:end]
        harness = function + r"""
const assert = require('node:assert/strict');
assert.equal(endDate({placedDate:'2026-01-31', guaranteeDays:30}).toISOString().slice(0,10), '2026-03-02');
assert.equal(endDate({placedDate:'2026-02-01', guaranteeDays:0}).toISOString().slice(0,10), '2026-02-01');
console.log('guarantee date assertions: 2 passed');
"""
        with tempfile.NamedTemporaryFile("w", suffix=".js", encoding="utf-8") as handle:
            handle.write(harness)
            handle.flush()
            result = subprocess.run([node, handle.name], text=True, capture_output=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("2 passed", result.stdout)

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
