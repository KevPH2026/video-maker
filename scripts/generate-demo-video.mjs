#!/usr/bin/env node
/**
 * Generate a video by having the browser play the animation and recording it in real-time.
 * Uses Playwright's built-in video recording.
 */

import { chromium } from 'playwright';
import { execSync } from 'child_process';
import { existsSync, mkdirSync, readFileSync, unlinkSync, statSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const RENDERS_DIR = join(PROJECT_ROOT, 'public', 'renders');
const TEMP_DIR = join(PROJECT_ROOT, 'public', 'renders', 'temp');

const htmlFile = process.argv[2];
const outputFile = process.argv[3];
const duration = parseInt(process.argv[4] || '22');

if (!htmlFile || !outputFile) {
  console.error('Usage: node generate-demo-video.mjs <html-file> <output-mp4> [duration]');
  process.exit(1);
}

const htmlPath = join(PROJECT_ROOT, 'public', 'demos', htmlFile);
const mp4Path = join(RENDERS_DIR, outputFile);
mkdirSync(RENDERS_DIR, { recursive: true });
mkdirSync(TEMP_DIR, { recursive: true });

if (!existsSync(htmlPath)) {
  console.error(`HTML not found: ${htmlPath}`);
  process.exit(1);
}

console.log(`🎬 Generating: ${htmlFile} -> ${outputFile} (${duration}s)`);

const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--use-gl=swiftshader'],
});

const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  recordVideo: { dir: TEMP_DIR, duration: duration + 5, size: { width: 1920, height: 1080 } },
});

const page = await context.newPage();

// Inject auto-play script into the HTML
const htmlContent = readFileSync(htmlPath, 'utf8');
const htmlWithAutoplay = htmlContent.replace('</body>', `
<script>
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      try {
        if (window.__tl && typeof window.__tl.play === 'function') window.__tl.play();
        if (window.__timelines) {
          Object.values(window.__timelines).forEach(t => {
            if (t && typeof t.play === 'function') t.play();
          });
        }
      } catch(e) {}
    }, 300);
  });
</script>
</body>`);

await page.setContent(htmlWithAutoplay, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(300);

console.log(`   Playing animation for ${duration}s...`);
await page.waitForTimeout((duration + 2) * 1000);

// Get video path before closing
const video = await page.video();
await context.close();
const webmPath = await video.path();

console.log(`   WebM: ${webmPath}`);

if (existsSync(webmPath)) {
  // Convert webm to mp4 with ffmpeg
  try {
    execSync(`ffmpeg -y -i "${webmPath}" -c:v libx264 -pix_fmt yuv420p -crf 23 -movflags +faststart "${mp4Path}" 2>&1 | tail -3`);
    const size = (statSync(mp4Path).size / 1024 / 1024).toFixed(2);
    console.log(`\n✅ ${mp4Path} (${size}MB)`);
  } catch (e) {
    console.error('ffmpeg failed:', e.message);
    // Fallback: copy as webm
    execSync(`cp "${webmPath}" "${mp4Path.replace('.mp4', '.webm')}"`);
  }
  
  // Cleanup webm
  try { unlinkSync(webmPath); } catch {}
} else {
  console.error('❌ No video recorded!');
}

await browser.close();
