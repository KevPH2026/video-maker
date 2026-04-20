import { chromium } from 'playwright';
import { readFileSync, existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import http from 'http';
import { execSync } from 'child_process';

const PUB = '/private/tmp/video-maker/public';
const DEMOS = join(PUB, 'demos');
const REND = join(PUB, 'renders');
const GSAP = readFileSync(join(PUB, 'js/gsap.min.js'), 'utf8');

function patch(html) {
  // Remove existing GSAP refs
  html = html.replace(/<script[^>]*gsap[^>]*>.*?<\/script>/gi, '');
  html = html.replace(/<script[^>]*\/js\/gsap[^>]*>.*?<\/script>/gi, '');
  // Add GSAP before body
  html = html.replace(/<body/i, '<body><script>' + GSAP + '</script>');
  return html;
}

const slug = process.argv[2] || 'smart-watch';
const dur = parseInt(process.argv[3] || '8');
const mp4 = join(REND, 'demo-' + slug + '.mp4');

const htmlPath = join(DEMOS, slug + '.html');
if (!existsSync(htmlPath)) { console.error('Not found:', htmlPath); process.exit(1); }
const html = patch(readFileSync(htmlPath, 'utf8'));

const srv = http.createServer((req, res) => {
  const u = req.url.split('?')[0];
  if (u === '/' || u.endsWith('.html')) { res.writeHead(200, {'Content-Type':'text/html; charset=utf-8'}); res.end(html); return; }
  const fp = join(PUB, u);
  try { const d = readFileSync(fp); const ct = u.endsWith('.js') ? 'application/javascript' : 'application/octet-stream'; res.writeHead(200, {'Content-Type':ct}); res.end(d); }
  catch { res.writeHead(404); res.end('404 ' + u); }
});
await new Promise(r => srv.listen(0, r));
const port = srv.address().port;
console.log('Server on', port, '| slug:', slug, '| dur:', dur + 's');

const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const ctx = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  recordVideo: { duration: dur + 8, size: { width: 1920, height: 1080 } },
});

// Inject GSAP before any page script
await ctx.addInitScript(GSAP);

const page = await ctx.newPage();
const allLogs = [];
page.on('pageerror', e => allLogs.push('PGERR: ' + e.message));
page.on('console', m => allLogs.push(m.type().toUpperCase() + ': ' + m.text().slice(0, 150)));
page.on('crash', () => allLogs.push('BROWSER CRASHED!'));

await page.goto('http://localhost:' + port + '/', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 2000));

const info = await page.evaluate(() => ({
  gsap: typeof gsap,
  tl: window.__timelines ? Object.keys(window.__timelines) : [],
  txt: document.readyState,
  title: document.title,
}));
console.log('Page state:', JSON.stringify(info));
console.log('Logs:', allLogs.slice(0, 10));

// Play timeline if exists
if (info.tl.length > 0) {
  console.log('Playing timeline...');
  await page.evaluate(() => {
    const tl = window.__timelines.video || Object.values(window.__timelines)[0];
    if (tl) { tl.play(); console.log('Timeline played OK'); }
  });
} else {
  console.log('No timeline to play');
}

// Wait for recording
console.log('Recording for', dur + 3, 'seconds...');
await new Promise(r => setTimeout(r, (dur + 3) * 1000));

console.log('Closing context...');
const video = await page.video();
const closePromise = ctx.close().then(() => console.log('Context closed OK'));
// Wait for video flush
await new Promise(r => setTimeout(r, 5000));
await closePromise;
srv.close();
// Don't await browser.close() - it's hanging. Let the OS clean up.

let webm;
try { webm = await video.path(); } catch(e) { console.log('video.path err:', e.message); webm = null; }
console.log('WebM:', webm);
console.log('Exists:', webm && webm !== 'ERROR' ? existsSync(webm) : 'N/A');
if (webm && webm !== 'ERROR' && existsSync(webm)) {
  console.log('Size:', Math.round(readFileSync(webm).length / 1024) + 'KB');
  try {
    execSync(`ffmpeg -y -i "${webm}" -c:v libx264 -pix_fmt yuv420p -crf 23 "${mp4}" 2>/dev/null`);
    const mb = (readFileSync(mp4).length / 1e6).toFixed(2);
    console.log('SAVED:', mp4, mb + 'MB');
  } catch(e) { console.log('ffmpeg error'); }
  try { unlinkSync(webm); } catch {}
} else {
  console.log('❌ No video recorded');
  console.log('Final logs:', allLogs.slice(0, 5));
}
