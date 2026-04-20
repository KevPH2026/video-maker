/**
 * Generate thumbnail + video for demo HTML files.
 * Key fix: inject GSAP via addInitScript so it's guaranteed to be available.
 */
import { chromium } from 'playwright';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const PUBLIC_DIR = join(PROJECT_ROOT, 'public');
const DEMOS_DIR = join(PUBLIC_DIR, 'demos');
const RENDERS_DIR = join(PUBLIC_DIR, 'renders');
const GSAP_PATH = join(PUBLIC_DIR, 'js/gsap.min.js');

mkdirSync(RENDERS_DIR, { recursive: true });

const gsapCode = readFileSync(GSAP_PATH, 'utf8');

function prepareHtml(html) {
  // Remove existing broken GSAP refs
  html = html.replace(/<script[^>]*gsap.*?<\/script>/gi, '');
  html = html.replace(/<script[^>]*\/js\/gsap.*?<\/script>/gi, '');
  // Inject inline GSAP at start of body
  html = html.replace(/<body/i, '<body>\n<script>' + gsapCode + '</script>');
  return html;
}

async function generateVideo(slug, duration = 10) {
  const htmlPath = join(DEMOS_DIR, `${slug}.html`);
  const mp4Path = join(RENDERS_DIR, `demo-${slug}.mp4`);
  if (!existsSync(htmlPath)) { console.error(`Not found: ${htmlPath}`); return; }

  const originalHtml = readFileSync(htmlPath, 'utf8');
  const html = prepareHtml(originalHtml);

  // Start local server
  const server = createServer((req, res) => {
    let urlPath = req.url.split('?')[0];
    if (urlPath === '/' || urlPath.endsWith('.html')) {
      res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(html);
    } else {
      const file = join(PUBLIC_DIR, urlPath);
      try { res.writeHead(200, { 'Content-Type': 'application/octet-stream' }); res.end(readFileSync(file)); }
      catch { res.writeHead(404); res.end('404'); }
    }
  });

  await new Promise(r => server.listen(0, r));
  const port = server.address().port;
  console.log(`\n=== ${slug} (${duration}s) ===`);
  console.log(`Server: http://localhost:${port}`);

  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-gl=swiftshader'],
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { duration: duration + 5, size: { width: 1920, height: 1080 } },
  });

  // CRITICAL: inject GSAP before any page script runs
  await context.addInitScript(gsapCode);

  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('CON: ' + m.text()); });

  await page.goto(`http://localhost:${port}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  const gsapInfo = await page.evaluate(() => ({
    gsap: typeof gsap,
    tl: window.__timelines ? Object.keys(window.__timelines) : [],
    bodyText: document.body ? document.body.innerText.slice(0, 40).replace(/\n/g, '|') : '',
  }));
  console.log(`GSAP:${gsapInfo.gsap}, Timeline:${gsapInfo.tl.join(',') || 'none'}, Text:"${gsapInfo.bodyText}"`);
  if (errors.length) console.log('Errors:', errors.slice(0, 3));

  // Play animation
  await page.evaluate(() => {
    try {
      if (window.__timelines) {
        const tl = window.__timelines.video || Object.values(window.__timelines)[0];
        if (tl && typeof tl.play === 'function') { tl.play(); console.log('Timeline played'); }
      }
    } catch (e) { console.warn('Play err:', e.message); }
  });

  await page.waitForTimeout((duration + 2) * 1000);

  const video = await page.video();
  await context.close();
  await new Promise(r => setTimeout(r, 4000));
  await browser.close();
  server.close();

  const webm = await video.path();
  const webmExists = existsSync(webm);
  console.log(`WebM: ${webmExists ? Math.round(readFileSync(webm).length / 1024) + 'KB' : 'MISSING'}`);

  if (webmExists) {
    try {
      execSync(`ffmpeg -y -i "${webm}" -c:v libx264 -pix_fmt yuv420p -crf 23 "${mp4Path}" 2>&1 | tail -2`);
      const mb = (readFileSync(mp4Path).length / 1e6).toFixed(2);
      console.log(`✅ ${mp4Path} (${mb}MB)`);
    } catch (e) { console.error('ffmpeg failed:', e.message); }
    try { fs.unlinkSync(webm); } catch {}
  }
}

// Clean up broken HTML files first
for (const slug of ['power-station', 'air-purifier', 'smart-watch']) {
  const path = join(DEMOS_DIR, `${slug}.html`);
  if (!existsSync(path)) continue;
  let html = readFileSync(path, 'utf8');
  // Ensure GSAP CDN is present
  if (!html.includes('cdnjs.cloudflare.com/ajax/libs/gsap') && !html.includes('/js/gsap')) {
    // Add CDN GSAP before first script
    const gsapTag = '<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"><\/script>';
    html = html.replace(/<body/i, gsapTag + '\n<body');
    // Remove broken/inline GSAP refs
    html = html.replace(/<script>([^]*?)<\/script>/, (m) => {
      if (m.includes('gsap') && !m.includes('gsap.min.js')) return ''; // remove inline gsap replacements
      return m;
    });
    // Actually simpler: just add GSAP CDN
    if (!html.includes('gsap.min.js')) {
      html = '<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"><\/script>\n' + html;
    }
    readFileSync; // just reference to ensure fs is imported
    require('fs').writeFileSync(path, html);
  }
}

const fs = require('fs');
for (const slug of ['power-station', 'air-purifier', 'smart-watch']) {
  await generateVideo(slug, 8);
}

console.log('\nAll done!');
