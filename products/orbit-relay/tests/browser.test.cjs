"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const html = pathToFileURL(path.resolve(__dirname, "../index.html")).href;

async function launch(viewport = { width: 1365, height: 900 }, accelerateTimer = false) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport, isMobile: viewport.width < 600, hasTouch: viewport.width < 600 });
  if (accelerateTimer) {
    await context.addInitScript(() => {
      const original = window.setInterval.bind(window);
      window.setInterval = (fn, delay, ...args) => original(fn, delay === 1000 ? 5 : delay, ...args);
    });
  }
  const page = await context.newPage();
  await page.goto(html);
  return { browser, page };
}

test("desktop: start, pause/resume, hint, restart and solve progression", async () => {
  const { browser, page } = await launch();
  try {
    await page.getByRole("button", { name: /Start relay/i }).click();
    await page.waitForSelector("#game", { state: "visible" });
    assert.equal(await page.locator("#board .tile").count(), 25);

    await page.getByRole("button", { name: "Pause" }).click();
    assert.equal(await page.locator("#pauseBtn").textContent(), "Resume");
    const pausedTime = await page.locator("#time").textContent();
    await page.waitForTimeout(1100);
    assert.equal(await page.locator("#time").textContent(), pausedTime);

    await page.getByRole("button", { name: "Resume" }).click();
    await page.getByRole("button", { name: /Use hint/i }).click();
    assert.match(await page.locator("#message").textContent(), /aligned|No hint needed/i);

    await page.getByRole("button", { name: "Restart level" }).click();
    assert.equal(await page.locator("#board .tile").count(), 25);

    for (let i = 0; i < 50; i++) {
      if (await page.locator("#overlay").evaluate(el => getComputedStyle(el).display !== "none")) break;
      await page.getByRole("button", { name: /Use hint/i }).click();
    }
    await page.waitForSelector("#overlay", { state: "visible" });
    assert.match(await page.locator("#modalTitle").textContent(), /Signal restored/i);
    assert.equal(await page.evaluate(() => document.activeElement.id), "modalBtn");
    await page.keyboard.press("Tab");
    assert.equal(await page.evaluate(() => document.activeElement.id), "modalBtn");
    await page.getByRole("button", { name: /Next level/i }).click();
    assert.equal(await page.evaluate(() => document.activeElement.classList.contains("tile")), true);
    assert.equal(await page.locator("#level").textContent(), "2");
    assert.equal(await page.locator("#board .tile").count(), 25);
  } finally {
    await browser.close();
  }
});

test("timer expiry shows failure and retry keeps the same level", async () => {
  const { browser, page } = await launch({ width: 1280, height: 800 }, true);
  try {
    await page.getByRole("button", { name: /Start relay/i }).click();
    await page.waitForSelector("#overlay", { state: "visible", timeout: 5000 });
    assert.match(await page.locator("#modalTitle").textContent(), /Signal lost/i);
    assert.equal(await page.evaluate(() => document.activeElement.id), "modalBtn");
    await page.getByRole("button", { name: /Retry level/i }).click();
    assert.equal(await page.evaluate(() => document.activeElement.classList.contains("tile")), true);
    assert.equal(await page.locator("#level").textContent(), "1");
    await page.waitForSelector("#overlay", { state: "hidden" });
  } finally {
    await browser.close();
  }
});

test("mobile viewport has no horizontal overflow and usable touch controls", async () => {
  const { browser, page } = await launch({ width: 390, height: 844 });
  try {
    await page.getByRole("button", { name: /Start relay/i }).click();
    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      page: document.documentElement.scrollWidth,
      board: document.querySelector("#board").getBoundingClientRect().width,
      buttons: [...document.querySelectorAll(".actions button")].map(b => ({
        width: b.getBoundingClientRect().width,
        height: b.getBoundingClientRect().height
      }))
    }));
    assert.ok(dimensions.page <= dimensions.viewport, JSON.stringify(dimensions));
    assert.ok(dimensions.board > 250, JSON.stringify(dimensions));
    assert.ok(dimensions.buttons.every(b => b.width >= 44 && b.height >= 40), JSON.stringify(dimensions));
  } finally {
    await browser.close();
  }
});
