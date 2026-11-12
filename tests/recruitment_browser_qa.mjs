import assert from "node:assert/strict";
import { chromium, firefox } from "playwright";

const base = process.env.BASE_URL || "http://127.0.0.1:8765/";
const browsers = [["chromium", chromium], ["firefox", firefox]];

for (const [name, engine] of browsers) {
  const browser = await engine.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1365, height: 900 }, acceptDownloads: true });
  const page = await context.newPage();
  const externalRequests = [];
  const pageErrors = [];
  page.on("request", req => {
    if (!req.url().startsWith(base)) externalRequests.push(req.url());
  });
  page.on("pageerror", err => pageErrors.push(err.message));

  await page.goto(base, { waitUntil: "load" });
  assert.match(await page.title(), /Revenue Assurance Desk/);

  const unlabeled = await page.locator("input:not([type=hidden]), select, textarea").evaluateAll(nodes =>
    nodes.filter(el => {
      const id = el.id;
      return !id || (!document.querySelector('label[for="' + CSS.escape(id) + '"]') &&
        !el.getAttribute("aria-label") && !el.getAttribute("aria-labelledby"));
    }).map(el => el.outerHTML.slice(0, 160))
  );
  assert.deepEqual(unlabeled, [], name + " has unlabeled form controls");

  await page.locator('nav button[data-tab="add"]').click();
  await page.locator("#placementId").fill("PL-QA-001");
  await page.locator("#clientId").fill("CLIENT-QA");
  await page.locator("#recruiterId").fill("REC-QA");
  await page.locator("#placedDate").fill("2026-11-01");
  await page.locator("#invoiceRef").fill("INV-QA-001");
  await page.locator("#invoiceDate").fill("2026-10-30");
  await page.locator("#dueDate").fill("2026-11-03");
  await page.locator("#guaranteePaymentRule").selectOption("ON_TIME_PAYMENT_REQUIRED");
  await page.locator("#fee").fill("10000");
  await page.locator("#received").fill("1000");
  await page.locator("#share").fill("10");
  await page.locator("#guaranteeDays").fill("30");
  await page.locator("#addPlacement").click();
  await page.waitForFunction(() => document.querySelector("#booked").textContent.includes("10,000"));
  assert.match(await page.locator("#collected").textContent(), /1,000/);

  await page.locator('nav button[data-tab="cash"]').click();
  await page.locator("#receiptPlacement").selectOption("PL-QA-001");
  await page.locator("#receiptDate").fill("2026-11-05");
  await page.locator("#receiptAmount").fill("2000");
  await page.locator("#receiptRef").fill("QA-REF-01");
  await page.locator("#addReceipt").click();
  await page.waitForFunction(() => document.querySelector("#collected").textContent.includes("3,000"));
  assert.match(await page.locator("#paymentRiskCount").textContent(), /1/);

  await page.locator("#commissionRecruiter").fill("REC-QA");
  await page.locator("#commissionDate").fill("2026-11-06");
  await page.locator("#commissionAmount").fill("100");
  await page.locator("#addCommission").click();
  await page.locator("#eventPlacement").selectOption("PL-QA-001");
  await page.locator("#eventDate").fill("2026-11-07");
  await page.locator("#eventType").selectOption("CLAIM_OPENED");
  await page.locator("#eventNote").fill("QA claim event");
  await page.locator("#addEvent").click();

  await page.locator('nav button[data-tab="analysis"]').click();
  assert.match(await page.locator("#ageRows").innerText(), /7,000/);
  assert.match(await page.locator("#ageRows").innerText(), /2026-11-03/);
  assert.match(await page.locator("#riskRows").innerText(), /Paid late/);
  const recruiterSummary = await page.locator("#recruiterRows").innerText();
  assert.match(recruiterSummary, /REC-QA/);
  assert.match(recruiterSummary, /200/);
  assert.match(await page.locator("#clientRows").innerText(), /CLIENT-QA/);

  await page.locator('nav button[data-tab="ledger"]').click();
  page.once("dialog", async dialog => {
    assert.match(dialog.message(), /Deletion is blocked/);
    await dialog.accept();
  });
  await page.locator('button[data-delete="0"]').click();
  assert.equal(await page.locator("#ledgerRows tr").count(), 1);

  await page.reload({ waitUntil: "load" });
  assert.match(await page.locator("#booked").textContent(), /10,000/);

  await page.locator('nav button[data-tab="backup"]').click();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.locator("#exportJson").click()
  ]);
  const backupPath = await download.path();
  assert.ok(backupPath, "backup download path exists");

  page.once("dialog", async dialog => {
    assert.match(dialog.message(), /delete all locally saved records/i);
    await dialog.accept();
  });
  await page.locator("#clearData").click();
  assert.match(await page.locator("#booked").textContent(), /₹0/);
  await page.locator("#importJson").setInputFiles(backupPath);
  await page.waitForFunction(() => document.querySelector("#booked").textContent.includes("10,000"));
  assert.equal(await page.locator("#ledgerRows tr").count(), 1);

  await page.locator('nav button[data-tab="dashboard"]').focus();
  await page.keyboard.press("Tab");
  assert.equal(await page.evaluate(() => document.activeElement.dataset.tab), "add");

  await page.setViewportSize({ width: 390, height: 844 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  assert.equal(overflow, false, name + " has horizontal page overflow on mobile");
  assert.deepEqual(externalRequests, [], name + " made external network requests");
  assert.deepEqual(pageErrors, [], name + " raised page errors");

  console.log(name + ": interaction, persistence, backup/restore, accessibility labels, keyboard navigation, mobile overflow and offline checks passed");
  await browser.close();
}

console.log("BROWSER_QA_PASS chromium+firefox");
