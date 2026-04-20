import { chromium } from 'playwright';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import http from 'http';
import { execSync } from 'child_process';

const PUB = '/private/tmp/video-maker/public';
const DEMOS = join(PUB, 'demos');
const THUMBS = join(PUB, 'demos', 'thumbs');
const GSAP = readFileSync(join(PUB, 'js/gsap.min.js'), 'utf8');
mkdirSync(THUMBS, { recursive: true });

function patch(html) {
  html = html.replace(/<script[^>]*gsap.*?<\/script>/gi, '').replace(/<script[^>]*\/js\/gsap.*?<\/script>/gi, '');
  html = html.replace(/<body/i, '<body><script>' + GSAP + '</script>');
  return html;
}

const HTMLS = {};
for (const slug of ['smart-watch', 'power-station', 'air-purifier']) {
  const hp = join(DEMOS, slug + '.html');
  if (existsSync(hp)) HTMLS[slug] = patch(readFileSync(hp, 'utf8'));
}

const srv = http.createServer((req, res) => {
  const u = req.url.split('?')[0];
  // Strip trailing slash
  const path = u.replace(/\/$/, '');

  if (path === '' || path === '/index.html') {
    res.writeHead(200, {'Content-Type':'text/html'});
    res.end(HTMLS['smart-watch'] || '<html><body>not found</body></html>');
    return;
  }

  // Check if it's a demo HTML request
  for (const slug of Object.keys(HTMLS)) {
    if (path === '/' + slug || path === '/' + slug + '.html') {
      res.writeHead(200, {'Content-Type':'text/html; charset=utf-8'});
      res.end(HTMLS[slug]);
      return;
    }
  }

  // Serve static files from PUB
  const fp = join(PUB, path);
  if (fp.startsWith(PUB) && existsSync(fp)) {
    try {
      const data = readFileSync(fp);
      const ct = path.endsWith('.js') ? 'application/javascript' : path.endsWith('.css') ? 'text/css' : 'application/octet-stream';
      res.writeHead(200, {'Content-Type':ct});
      res.end(data);
    } catch {
      res.writeHead(500); res.end('500');
    }
  } else {
    res.writeHead(404); res.end('404: ' + path);
  }
});

await new Promise(r => srv.listen(0, r));
const port = srv.address().port;
console.log('Server on', port);

const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

for (const slug of Object.keys(HTMLS)) {
  console.log('Capturing', slug + '...');
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  await context.addInitScript(GSAP);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  await page.goto(`http://localhost:${port}/${slug}`, { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 2000));

  const info = await page.evaluate(() => ({
    tl: window.__timelines ? Object.keys(window.__timelines) : [],
    txt: document.body.innerText.slice(0, 30).replace(/\n/g, '|'),
  }));
  console.log(' ', slug, 'tl:', info.tl.join(',') || 'none', '|', info.txt, errors[0] ? 'ERR:' + errors[0].slice(0, 60) : '');

  // Play animation then capture
  await page.evaluate(() => {
    try {
      const tl = window.__timelines && (window.__timelines.video || Object.values(window.__timelines)[0]);
      if (tl && typeof tl.play === 'function') tl.play();
    } catch {}
  });
  await new Promise(r => setTimeout(r, 1500));

  const outPath = join(THUMBS, slug + '.jpg');
  await page.screenshot({ path: outPath, type: 'jpeg', quality: 85, fullPage: false });
  console.log('  Saved:', Math.round(readFileSync(outPath).length / 1024) + 'KB →', outPath);

  await context.close().catch(() => {});
}

await browser.close();
srv.close();
console.log('Done!');
