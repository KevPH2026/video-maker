import { chromium } from 'playwright';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { createServer } from 'http';

const PROJECT_ROOT = '/private/tmp/video-maker';
const PUBLIC_DIR = join(PROJECT_ROOT, 'public');
const GSAP_PATH = join(PUBLIC_DIR, 'js/gsap.min.js');
const gsapCode = readFileSync(GSAP_PATH, 'utf8');

// Read original HTML - don't strip GSAP, keep it as-is from server
let html = readFileSync(join(PUBLIC_DIR, 'demos/power-station.html'), 'utf8');

// Create HTTP server
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css' };
const server = createServer((req, res) => {
  let urlPath = req.url.split('?')[0];
  let filePath = join(PUBLIC_DIR, urlPath);
  if (!filePath.startsWith(PUBLIC_DIR)) { res.writeHead(403); res.end('403'); return; }
  const ext = '.' + (urlPath.split('.').pop() || '');
  try {
    const content = readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(content);
  } catch {
    res.writeHead(404); res.end('404: ' + urlPath);
  }
});

await new Promise(r => server.listen(9877, r));
console.log('Server on http://localhost:9877');

// Inject GSAP via addInitScript BEFORE page loads
const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-gl=swiftshader'],
});

const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  recordVideo: { duration: 6, size: { width: 1920, height: 1080 } },
});

// Inject GSAP into ALL pages before they load
await context.addInitScript(gsapCode);

const page = await context.newPage();
const errors = [];
page.on('pageerror', e => errors.push('PGERR: ' + e.message));
page.on('console', m => {
  if (m.type() === 'error') errors.push('CONERR: ' + m.text());
  if (m.type() === 'log') console.log('LOG:', m.text());
});

console.log('Navigating...');
await page.goto('http://localhost:9877/demos/power-station.html', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3000);

const info = await page.evaluate(() => ({
  gsap: typeof gsap,
  tlKeys: window.__timelines ? Object.keys(window.__timelines) : 'NO_TIMELINES_OBJ',
  gsapTl: typeof gsap?.timeline,
}));
console.log('Info:', info);
console.log('Errors:', errors.slice(0, 5));

// Try to play
const played = await page.evaluate(() => {
  if (window.__timelines && window.__timelines.video) {
    window.__timelines.video.play();
    return 'playing';
  }
  // Try to create timeline from GSAP
  if (typeof gsap !== 'undefined') {
    const tl = gsap.timeline();
    tl.to('body', { background: '#f00' });
    window.__timelines = { video: tl };
    tl.play();
    return 'created and playing test tl';
  }
  return 'failed';
});
console.log('Play result:', played);

await page.waitForTimeout(5000);

const video = await page.video();
await context.close();
await new Promise(r => setTimeout(r, 4000));
await browser.close();
server.close();

const webm = await video.path();
console.log('WebM:', webm, existsSync(webm) ? Math.round(readFileSync(webm).length / 1024) + 'KB' : 'NOT FOUND');
