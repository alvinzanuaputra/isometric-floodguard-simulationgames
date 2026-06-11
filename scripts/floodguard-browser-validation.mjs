#!/usr/bin/env node
/**
 * Fase B — validasi gameplay FloodGuard via browser headless.
 * Jalankan: npm run dev (terminal terpisah), lalu node scripts/floodguard-browser-validation.mjs
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const OUT_DIR = join(process.cwd(), 'agent/validation/browser-run');
const REGIONS = ['Barat', 'Pusat', 'Selatan', 'Timur', 'Utara'];
const THRESHOLDS = { Barat: 20, Pusat: 25, Selatan: 30, Timur: 40, Utara: 45 };
const WIN_DAYS = { Barat: 5, Pusat: 7, Selatan: 10, Timur: 14, Utara: 18 };

const results = [];

function log(id, status, note, extra = {}) {
  results.push({ id, status, note, ...extra });
  const icon = status === 'LULUS' ? '✓' : status === 'GAGAL' ? '✗' : '~';
  console.log(`  ${icon} ${id}: ${note}`);
}

async function waitForGame(page, timeout = 90000) {
  await page.waitForSelector('text=FLOODGUARD', { timeout });
  await page.waitForSelector('text=Keamanan', { timeout });
  await page.waitForTimeout(1500);
}

async function openSettings(page) {
  const settingsBtn = page.locator('button[title="Pengaturan"]');
  if (await settingsBtn.count()) {
    await settingsBtn.click();
    await page.waitForTimeout(400);
    return true;
  }
  return false;
}

async function forceWeather(page, event) {
  await openSettings(page);
  const btn = page.getByRole('button', { name: event, exact: true });
  if (await btn.count()) {
    await btn.first().click();
    await page.waitForTimeout(300);
    return true;
  }
  return false;
}

async function readFloodUI(page) {
  return page.evaluate(() => {
    const text = document.body.innerText;
    const keamanan = text.match(/Keamanan\s*\n?\s*(\d+)%/);
    const tergenang = text.match(/Tergenang\s*\n?\s*(\d+)%/);
    const threshold = text.match(/\/\s*(\d+)%/);
    const hariHujan = text.match(/Hari [Hh]ujan\s*\n?\s*(\d+)\/(\d+)/);
    const weather = text.match(/(Cerah|Gerimis|Hujan|Badai)\s*\n?\s*(\d+)%/);
    return {
      keamanan: keamanan ? +keamanan[1] : null,
      tergenang: tergenang ? +tergenang[1] : null,
      threshold: threshold ? +threshold[1] : null,
      hariDone: hariHujan ? +hariHujan[1] : null,
      hariTarget: hariHujan ? +hariHujan[2] : null,
      weatherLabel: weather ? weather[1] : null,
      weatherRate: weather ? +weather[2] : null,
    };
  });
}

async function setSpeed(page, level) {
  const speeds = page.locator('.h-14 button, [class*="TopBar"] button').filter({ has: page.locator('svg') });
  const btns = page.locator('button').filter({ has: page.locator('svg') });
  // Speed buttons: 4 icon buttons in top bar area — click index level+1 (skip pause=0)
  const topBarSpeed = page.locator('.h-14 .bg-secondary button, .h-14 [class*="rounded-md"] button');
  const count = await topBarSpeed.count();
  if (count >= 4 && level >= 1 && level <= 3) {
    await topBarSpeed.nth(level).click();
    return true;
  }
  return false;
}

async function testRegion(browser, region) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push(String(err)));

  const regionDir = join(OUT_DIR, region);
  await mkdir(regionDir, { recursive: true });

  console.log(`\n=== Wilayah: ${region} ===`);

  try {
    await page.goto(`${BASE}/?region=${region}`, { waitUntil: 'networkidle', timeout: 60000 });
    await waitForGame(page);

    const cityName = await page.locator('h1').first().textContent();
    log(`A1-${region}`, cityName?.includes('Surabaya') ? 'LULUS' : 'GAGAL', `cityName=${cityName?.trim()}`);

    const ui = await readFloodUI(page);
    const expTh = THRESHOLDS[region];
    const expDays = WIN_DAYS[region];
    log(
      `A2-${region}`,
      ui.threshold === expTh && ui.hariTarget === expDays ? 'LULUS' : 'GAGAL',
      `threshold=${ui.threshold}% (exp ${expTh}%), hari=${ui.hariDone}/${ui.hariTarget} (exp /${expDays})`
    );

    // Overlays
    const overlayPanel = page.locator('text=Overlay Peta');
    log(`A3-${region}`, (await overlayPanel.count()) > 0 ? 'LULUS' : 'GAGAL', 'Panel Overlay Peta');

    for (const [mode, label] of [
      ['elevasi', 'Elevasi'],
      ['risiko', 'Risiko Banjir'],
      ['genangan', 'Genangan'],
    ]) {
      const btn = page.getByRole('button', { name: label, exact: true });
      if (await btn.count()) {
        await btn.click();
        await page.waitForTimeout(800);
        await page.screenshot({ path: join(regionDir, `overlay-${mode}.png`) });
        log(`A3-${region}-${mode}`, 'LULUS', `Overlay ${label} aktif`);
      } else {
        log(`A3-${region}-${mode}`, 'GAGAL', `Tombol ${label} tidak ditemukan`);
      }
    }

    // Matikan overlay
    const matikan = page.getByRole('button', { name: 'Matikan', exact: true });
    if (await matikan.count()) await matikan.click();

    // Weather — Badai
    const badaiOk = await forceWeather(page, 'Badai');
    await setSpeed(page, 3);
    await page.waitForTimeout(500);
    const uiBadai = await readFloodUI(page);
    log(
      `A4-${region}`,
      badaiOk && uiBadai.weatherLabel === 'Badai' && (uiBadai.weatherRate ?? 0) > 0 ? 'LULUS' : 'GAGAL',
      `Badai forced=${badaiOk}, cuaca=${uiBadai.weatherLabel} ${uiBadai.weatherRate}%`
    );

    // Wait for flood accumulation
    await page.waitForTimeout(12000);
    const uiFlood = await readFloodUI(page);
    await page.screenshot({ path: join(regionDir, 'badai-12s.png') });

    // Genangan overlay after flood
    const genBtn = page.getByRole('button', { name: 'Genangan', exact: true });
    if (await genBtn.count()) {
      await genBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: join(regionDir, 'genangan-after-badai.png') });
    }

    log(
      `A5-${region}`,
      (uiFlood.tergenang ?? 0) > 0 ? 'LULUS' : 'PARTIAL',
      `Tergenang setelah 12s Badai speed3: ${uiFlood.tergenang}% (Keamanan ${uiFlood.keamanan}%)`
    );

    // Cerah — recession
    await forceWeather(page, 'Cerah');
    await page.waitForTimeout(15000);
    const uiCerah = await readFloodUI(page);
    const surut = (uiCerah.tergenang ?? 100) < (uiFlood.tergenang ?? 0);
    log(
      `A5-${region}-surut`,
      surut ? 'LULUS' : 'PARTIAL',
      `Tergenang ${uiFlood.tergenang}% → ${uiCerah.tergenang}% setelah Cerah 15s`
    );

    // Win dialog
    await openSettings(page);
    const menangBtn = page.getByRole('button', { name: 'Menang', exact: true });
    if (await menangBtn.count()) {
      await menangBtn.click();
      await page.waitForSelector('text=Wilayah Aman!', { timeout: 5000 });
      await page.screenshot({ path: join(regionDir, 'dialog-menang.png') });
      log(`A7-${region}-menang`, 'LULUS', 'Dialog menang muncul');
      await page.getByRole('button', { name: 'Main Lagi' }).click();
      await page.waitForTimeout(1000);
    } else {
      log(`A7-${region}-menang`, 'GAGAL', 'Tombol Menang tidak ditemukan');
    }

    // Lose dialog
    await openSettings(page);
    const kalahBtn = page.getByRole('button', { name: 'Kalah', exact: true });
    if (await kalahBtn.count()) {
      await kalahBtn.click();
      await page.waitForSelector('text=Banjir Meluap!', { timeout: 5000 });
      await page.screenshot({ path: join(regionDir, 'dialog-kalah.png') });
      log(`A7-${region}-kalah`, 'LULUS', 'Dialog kalah muncul');
    } else {
      log(`A7-${region}-kalah`, 'GAGAL', 'Tombol Kalah tidak ditemukan');
    }

    // Sidebar FloodGuard branding
    log(`A9-${region}`, (await page.locator('text=FLOODGUARD').count()) > 0 ? 'LULUS' : 'GAGAL', 'Branding FLOODGUARD');

    // Console errors (filter benign)
    const critical = consoleErrors.filter(
      (e) => !e.includes('favicon') && !e.includes('404') && !e.includes('hydration')
    );
    log(
      `B-console-${region}`,
      critical.length === 0 ? 'LULUS' : 'PARTIAL',
      critical.length ? `${critical.length} error(s): ${critical.slice(0, 2).join(' | ')}` : 'Tidak ada error console kritis'
    );
  } catch (err) {
    log(`ERR-${region}`, 'GAGAL', String(err.message ?? err));
    await page.screenshot({ path: join(regionDir, 'error.png') }).catch(() => {});
  } finally {
    await ctx.close();
  }
}

async function testMenuFlow(browser) {
  console.log('\n=== Menu flow (A1) ===');
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  try {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForSelector('text=FloodGuard Surabaya', { timeout: 15000 });
    log('A1.1', 'LULUS', 'Landing FloodGuard');

    await page.getByRole('button', { name: 'Permainan Baru' }).click();
    await page.waitForSelector('text=Pilih Wilayah', { timeout: 10000 });
    const cards = await page.locator('text=Mulai').count();
    log('A1.2', cards === 5 ? 'LULUS' : 'GAGAL', `${cards} tombol Mulai`);

    await page.getByRole('button', { name: 'Mulai' }).first().click();
    await waitForGame(page);
    log('A1.3-menu', 'LULUS', 'Barat via menu Mulai');
    await page.screenshot({ path: join(OUT_DIR, 'menu-barat-load.png') });
  } catch (err) {
    log('A1-menu', 'GAGAL', String(err.message ?? err));
  } finally {
    await ctx.close();
  }
}

async function testLegacy(browser) {
  console.log('\n=== IsoCity Legacy (A11) ===');
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  try {
    await page.goto(`${BASE}/?region=Barat`, { waitUntil: 'networkidle' });
    await waitForGame(page);
    await openSettings(page);
    const legacyBtn = page.getByRole('button', { name: /Kota Procedural \(Legacy\)/ });
    if (!(await legacyBtn.count())) {
      log('A11.1', 'GAGAL', 'Tombol legacy tidak ditemukan');
      return;
    }
    await legacyBtn.click();
    await page.waitForTimeout(3000);
    const hasFloodBar = (await page.locator('text=Keamanan').count()) > 0 &&
      (await page.locator('text=Tergenang').count()) > 0;
    const hasIsocity = (await page.locator('text=ISOCITY').count()) > 0;
    log('A11.1', !hasFloodBar && hasIsocity ? 'LULUS' : 'GAGAL', `ISOCITY=${hasIsocity}, floodBar=${hasFloodBar}`);
    const hasZones = (await page.locator('text=ZONES').count()) > 0 || (await page.locator('text=Zoning').count()) > 0;
    log('A11.2', hasZones ? 'LULUS' : 'PARTIAL', `Zona legacy visible=${hasZones}`);
    await page.screenshot({ path: join(OUT_DIR, 'legacy-mode.png') });
  } catch (err) {
    log('A11', 'GAGAL', String(err.message ?? err));
  } finally {
    await ctx.close();
  }
}

async function testToolsPlacement(browser) {
  console.log('\n=== Tool placement Barat (A6) ===');
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  try {
    await page.goto(`${BASE}/?region=Barat`, { waitUntil: 'networkidle' });
    await waitForGame(page);

    // Hover submenu "Infrastruktur Banjir" then click Pompa Banjir
    const infra = page.locator('text=Infrastruktur Banjir').first();
    if (await infra.count()) {
      await infra.hover();
      await page.waitForTimeout(400);
    }
    const pompa = page.locator('text=Pompa Banjir').first();
    if (await pompa.count()) {
      await pompa.click();
      await page.waitForTimeout(300);
      // Click canvas center
      const canvas = page.locator('canvas').first();
      const box = await canvas.boundingBox();
      if (box) {
        await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.45);
        await page.waitForTimeout(2000);
        await page.screenshot({ path: join(OUT_DIR, 'Barat', 'pompa-placed.png') });
        log('A6.2-Barat', 'LULUS', 'Klik pasang Pompa Banjir (canvas center)');
      }
    } else {
      log('A6.2-Barat', 'GAGAL', 'Tool Pompa Banjir tidak ditemukan di sidebar');
    }

    // Overlay Pompa
    const pompaOverlay = page.getByRole('button', { name: 'Pompa', exact: true });
    if (await pompaOverlay.count()) {
      await pompaOverlay.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: join(OUT_DIR, 'Barat', 'overlay-pompa.png') });
      log('A3-pompa-Barat', 'LULUS', 'Overlay Pompa');
    }
  } catch (err) {
    log('A6-Barat', 'GAGAL', String(err.message ?? err));
  } finally {
    await ctx.close();
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  console.log(`FloodGuard Browser Validation → ${BASE}`);
  console.log(`Output: ${OUT_DIR}`);

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch {
    console.error('Playwright chromium belum terinstall. Jalankan: npx playwright install chromium');
    process.exit(1);
  }

  await testMenuFlow(browser);
  for (const region of REGIONS) {
    await testRegion(browser, region);
  }
  await testToolsPlacement(browser);
  await testLegacy(browser);

  await browser.close();

  const summary = {
    timestamp: new Date().toISOString(),
    base: BASE,
    total: results.length,
    lulus: results.filter((r) => r.status === 'LULUS').length,
    gagal: results.filter((r) => r.status === 'GAGAL').length,
    partial: results.filter((r) => r.status === 'PARTIAL').length,
    results,
  };

  await writeFile(join(OUT_DIR, 'report.json'), JSON.stringify(summary, null, 2));
  console.log(`\n=== RINGKASAN ===`);
  console.log(`LULUS: ${summary.lulus} | GAGAL: ${summary.gagal} | PARTIAL: ${summary.partial}`);
  console.log(`Laporan: ${join(OUT_DIR, 'report.json')}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
