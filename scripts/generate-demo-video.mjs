#!/usr/bin/env node
/**
 * Generate a demo video by inlining GSAP and loading via setContent.
 */
import { chromium } from 'playwright';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const DEMOS_DIR = join(PROJECT_ROOT, 'public', 'demos');
const RENDERS_DIR = join(PROJECT_ROOT, 'public', 'renders');
const GSAP_PATH = join(PROJECT_ROOT, 'public', 'js', 'gsap.min.js');

const slug = process.argv[2];
const duration = parseInt(process.argv[3] || '10');
if (!slug) { console.error('Usage: node generate-demo-video.mjs <slug> [duration]'); process.exit(1); }

const htmlPath = join(DEMOS_DIR, `${slug}.html`);
const mp4Path = join(RENDERS_DIR, `demo-${slug}.mp4`);
mkdirSync(RENDERS_DIR, { recursive: true });

if (!existsSync(htmlPath)) { console.error(`Not found: ${htmlPath}`); process.exit(1); }
if (!existsSync(GSAP_PATH)) { console.error(`GSAP not found: ${GSAP_PATH}`); process.exit(1); }

const gsapCode = readFileSync(GSAP_PATH, 'utf8');
let html = readFileSync(htmlPath, 'utf8');

// Inline GSAP
html = html.replace(/<script[^>]*gsap.*?<\/script>/gis, `<script>${gsapCode}</script>`);
if (!html.includes(gsapCode.slice(0, 50))) {
  html = html.replace('</body>', `<script>${gsapCode}</script></body>`);
}

console.log(`🎬 Recording ${slug} (${duration}s)...`);

const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--use-gl=swiftshader'],
});

const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  recordVideo: { duration: duration + 5, size: { width: 1920, height: 1080 } },
});

const page = await context.newPage();
await page.setContent(html, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1500);

// Check
const info = await page.evaluate(() => {
  const keys = window.__timelines ? Object.keys(window.__timelines) : [];
  return {
    gsap: typeof gsap !== 'undefined',
    tlKeys: keys,
    tl: keys.length > 0,
    text: document.body ? document.body.innerText.slice(0, 80).replace(/\n/g, ' ') : '',
  };
});
console.log(`   GSAP:${info.gsap} TL:${info.tl} Keys:${info.tlKeys.join(',')} Content:"${info.text.slice(0,50)}"`);

// Play animation - try all known keys
await page.evaluate(() => {
  try {
    const tl = window.__timelines;
    if (tl) {
      // Try video, comp, or any first key
      const key = tl.video || tl.comp || Object.keys(tl)[0];
      if (key && tl[key] && typeof tl[key].play === 'function') {
        tl[key].play();
      }
    }
    // Fallback: play any GSAP timeline
    try { if (typeof gsap !== 'undefined') gsap.globalTimeline.play(); } catch {}
  } catch (e) { console.warn('Play error:', e.message); }
});

await page.waitForTimeout((duration + 2) * 1000);

const video = await page.video();
await context.close();
// Wait for video to be flushed to disk
await new Promise(r => setTimeout(r, 3000));

let webm;
try {
  webm = await video.path();
} catch(e) {
  console.error('Cannot get video path:', e.message);
  await browser.close();
  process.exit(1);
}
await browser.close();
console.log('   WebM path:', webm, 'exists:', existsSync(webm));

if (existsSync(webm)) {
  try {
    execSync(`ffmpeg -y -i "${webm}" -c:v libx264 -pix_fmt yuv420p -crf 23 -movflags +faststart "${mp4Path}" 2>&1 | grep -E "frame=|error|Error" | tail -5`);
    const mb = (existsSync(mp4Path) ? (readFileSync(mp4Path).length / 1e6).toFixed(2) : '?');
    console.log(`\n✅ ${mp4Path} (${mb}MB)`);
  } catch (e) {
    console.error('ffmpeg error:', e.message);
  }
  try { require('fs').unlinkSync(webm); } catch {}
} else {
  console.error('❌ No video recorded');
}
