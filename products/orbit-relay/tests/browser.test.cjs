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


test("CrazyGames published viewport matrix: board, overflow and touch actions remain usable", async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, hasTouch: true });
  const viewports = [
    [907, 510], [1216, 684], [1077, 606], [821, 462],
    [1366, 768], [1920, 1080], [1536, 864], [1280, 720],
    [800, 450], [1080, 607]
  ];
  try {
    for (const [width, height] of viewports) {
      await page.setViewportSize({ width, height });
      await page.goto(html);
      await page.getByRole("button", { name: /Start relay/i }).click();
      const metrics = await page.evaluate(() => {
        const board = document.querySelector("#board").getBoundingClientRect();
        const tile = document.querySelector("#board .tile:not(.empty)").getBoundingClientRect();
        return {
          viewport: document.documentElement.clientWidth,
          page: document.documentElement.scrollWidth,
          boardLeft: board.left,
          boardRight: board.right,
          tileWidth: tile.width,
          tileHeight: tile.height,
          actionWidths: [...document.querySelectorAll(".actions button")].map(b => b.getBoundingClientRect().width)
        };
      });
      assert.ok(metrics.page <= metrics.viewport, width + "x" + height + " horizontal overflow: " + JSON.stringify(metrics));
      assert.ok(metrics.boardLeft >= 0 && metrics.boardRight <= width, width + "x" + height + " board outside viewport: " + JSON.stringify(metrics));
      assert.ok(metrics.tileWidth >= 32 && metrics.tileHeight >= 32, width + "x" + height + " tile too small: " + JSON.stringify(metrics));
      assert.ok(metrics.actionWidths.every(w => w >= 44), width + "x" + height + " action control too narrow: " + JSON.stringify(metrics));
      const tile = page.locator("#board .tile:not(.empty)").first();
      await tile.scrollIntoViewIfNeeded();
      await tile.tap();
      await page.locator("#hintBtn").scrollIntoViewIfNeeded();
      await page.getByRole("button", { name: /Use hint/i }).tap();
      await page.locator("#pauseBtn").scrollIntoViewIfNeeded();
      await page.getByRole("button", { name: "Pause" }).tap();
      assert.equal(await page.locator("#pauseBtn").textContent(), "Resume", width + "x" + height + " pause failed");
      await page.getByRole("button", { name: "Resume" }).tap();
    }
  } finally {
    await browser.close();
  }
});
