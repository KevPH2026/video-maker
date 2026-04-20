#!/usr/bin/env node
/**
 * web2.video Render Server
 * Custom Playwright + ffmpeg rendering pipeline.
 * 
 * Run: node scripts/render-server.mjs
 * Default port: 3456
 * 
 * POST /render { html, outputFilename?, width?, height?, fps?, duration? }
 */

import { readFileSync, existsSync, mkdirSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { execSync } from 'child_process';
import { chromium } from 'playwright';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const PUBLIC_DIR = join(PROJECT_ROOT, 'public');
const RENDERS_DIR = join(PUBLIC_DIR, 'renders');
const TEMP_DIR = join(RENDERS_DIR, 'temp');

mkdirSync(RENDERS_DIR, { recursive: true });
mkdirSync(TEMP_DIR, { recursive: true });

const PORT = parseInt(process.env.RENDER_PORT || '3456');
const CHROME = process.env.CHROME_PATH; // Unset on Linux = auto-detect Playwright's Chromium

// Load local GSAP once at startup
let GSAP_CODE = '';
try {
  GSAP_CODE = readFileSync(join(PUBLIC_DIR, 'js', 'gsap.min.js'), 'utf8');
  console.log(`✅ GSAP loaded locally (${(GSAP_CODE.length / 1024).toFixed(0)}KB)`);
} catch {
  console.warn('⚠️  Local GSAP not found, will use CDN');
}

// Inject local GSAP into HTML (replace CDN version with local)
function prepareHtml(html) {
  if (!GSAP_CODE) return html;
  let prepared = html
    .replace(/<script[^>]*gsap.*?<\/script>/gi, '')
    .replace(/<script[^>]*\/js\/gsap.*?<\/script>/gi, '');
  prepared = prepared.replace(/<body/i, `<body><script>${GSAP_CODE}</script>`);
  return prepared;
}

// Start a local HTTP server for the HTML
function startHtmlServer(html) {
  return new Promise((resolve) => {
    const s = createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
    });
    s.listen(0, '127.0.0.1', () => {
      resolve({ server: s, port: s.address().port });
    });
  });
}

// Render video using Playwright + ffmpeg
async function renderVideo(html, outputPath, opts = {}) {
  const { width = 1920, height = 1080, fps = 30, duration = 10 } = opts;
  const { server: htmlServer, port } = await startHtmlServer(html);
  
  const launchOpts = {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  };
  if (CHROME) launchOpts.executablePath = CHROME;

  const browser = await chromium.launch(launchOpts);

  const context = await browser.newContext({
    viewport: { width, height },
    recordVideo: { dir: TEMP_DIR, duration: duration + 6, size: { width, height } },
  });

  if (GSAP_CODE) {
    await context.addInitScript(GSAP_CODE);
  }

  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') pageErrors.push(m.text().slice(0, 80)); });

  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  // Try to play any GSAP timeline
  const tlStatus = await page.evaluate(() => {
    try {
      const tl = window.__timelines && (window.__timelines.video || Object.values(window.__timelines)[0]);
      if (tl && typeof tl.play === 'function') { tl.play(); return 'playing'; }
    } catch {}
    return 'none';
  });
  console.log(`  🎬 Timeline: ${tlStatus}`);

  // Wait for animation to complete
  const waitMs = (duration + 3) * 1000;
  console.log(`  ⏳ Waiting ${(waitMs / 1000).toFixed(0)}s...`);
  await page.waitForTimeout(waitMs);

  // Capture video — get path BEFORE closing context
  const video = await page.video();
  
  // Close context and wait for video buffer to flush
  const closeCtx = context.close();
  await new Promise(r => setTimeout(r, 5000)); // 5s flush
  await closeCtx;
  
  let webmPath;
  try { webmPath = await video.path(); } catch { webmPath = null; }

  await browser.close();
  htmlServer.close();

  if (!webmPath || !existsSync(webmPath) || readFileSync(webmPath).length < 1000) {
    const sz = webmPath && existsSync(webmPath) ? readFileSync(webmPath).length : 0;
    throw new Error(`Video capture failed (webm=${webmPath}, size=${sz})`);
  }

  // Convert WebM → MP4 with ffmpeg
  console.log(`  🎞️  Converting → MP4...`);
  try {
    execSync(`ffmpeg -y -i "${webmPath}" -c:v libx264 -pix_fmt yuv420p -crf 23 "${outputPath}" 2>/dev/null`);
  } catch (err) {
    throw new Error(`ffmpeg failed: ${err.message}`);
  }

  try { unlinkSync(webmPath); } catch {}
  const mp4Size = readFileSync(outputPath).length;
  console.log(`  ✅ Done: ${(mp4Size / 1024 / 1024).toFixed(2)}MB MP4`);
  return { fileSize: mp4Size, errors: pageErrors };
}

// HTTP Server
const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

  // Health
  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', uptime: process.uptime() }));
    return;
  }

  // Serve rendered videos
  if (url.pathname.startsWith('/renders/')) {
    const filename = url.pathname.replace('/renders/', '');
    const filePath = join(RENDERS_DIR, filename);
    if (existsSync(filePath)) {
      res.writeHead(200, {
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="${filename}"`,
      });
      const { createReadStream } = await import('fs');
      createReadStream(filePath).pipe(res);
      return;
    }
  }

  // Render endpoint
  if (url.pathname === '/render' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      const startTime = Date.now();
      try {
        const { html, outputFilename, width = 1920, height = 1080, fps = 30, duration = 10 } = JSON.parse(body);
        if (!html) throw new Error('html is required');

        const filename = outputFilename || `video-${Date.now()}.mp4`;
        const outputPath = join(RENDERS_DIR, filename);
        const preparedHtml = prepareHtml(html);

        console.log(`\n🎬 Render: ${filename} | ${width}x${height} | ${duration}s | ${(html.length / 1024).toFixed(0)}KB HTML`);
        const { fileSize, errors } = await renderVideo(preparedHtml, outputPath, { width, height, fps, duration });
        if (errors.length) console.log(`  ⚠️  ${errors.slice(0, 2).join(' | ')}`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          videoUrl: `/renders/${filename}`,
          fileSize,
          durationMs: Date.now() - startTime,
        }));
      } catch (err) {
        console.error(`❌ ${err.message}`);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🎬 web2.video Render Server`);
  console.log(`📁 Renders: ${RENDERS_DIR}`);
  console.log(`🌐 http://localhost:${PORT}`);
  console.log(`❤️  Health: http://localhost:${PORT}/health\n`);
});
