#!/usr/bin/env node
/**
 * web2.video Render Server
 * Uses @hyperframes/producer as the rendering engine.
 * 
 * Run: node scripts/render-server.mjs
 * Default port: 3456
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import os from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const PUBLIC_DIR = join(PROJECT_ROOT, 'public');
const RENDERS_DIR = join(PUBLIC_DIR, 'renders');
const GSAP_LOCAL = join(PUBLIC_DIR, 'js', 'gsap.min.js');

// Ensure render directory exists
if (!existsSync(RENDERS_DIR)) mkdirSync(RENDERS_DIR, { recursive: true });

const PORT = parseInt(process.env.RENDER_PORT || '3456');
const HF_PORT = PORT + 1; // HyperFrames producer server runs on PORT+1

// Load local GSAP content once at startup
let GSAP_CODE = '';
try {
  GSAP_CODE = readFileSync(GSAP_LOCAL, 'utf8');
  console.log(`✅ GSAP loaded locally (${(GSAP_CODE.length / 1024).toFixed(0)}KB)`);
} catch {
  console.warn('⚠️  Local GSAP not found, will use CDN');
}

// Import HyperFrames producer
let hfModule;
try {
  hfModule = await import('@hyperframes/producer');
  console.log('✅ @hyperframes/producer loaded');
} catch (err) {
  console.error('❌ Failed to load @hyperframes/producer:', err.message);
  process.exit(1);
}

const { startServer: hfStartServer } = hfModule;

// Inject local GSAP into HTML before rendering
function prepareHtml(html) {
  if (!GSAP_CODE) return html;
  // Replace CDN GSAP with local version
  let prepared = html.replace(
    /<script[^>]*gsap.*?<\/script>/gi,
    `<script>${GSAP_CODE}<\/script>`
  );
  // If no GSAP found, inject at the start of body
  if (!prepared.includes(GSAP_CODE.slice(0, 50))) {
    prepared = prepared.replace(/<body>/i, `<body>\n<script>${GSAP_CODE}<\/script>`);
  }
  return prepared;
}

// Start HyperFrames producer server
let hfServer;
let hfReady = false;
let renderQueue = [];

async function initHfServer() {
  try {
    hfServer = await hfStartServer({ port: HF_PORT });
    hfReady = true;
    console.log(`✅ HyperFrames producer server on port ${HF_PORT}`);
    
    // Process any queued renders
    if (renderQueue.length > 0) {
      console.log(`📋 Processing ${renderQueue.length} queued renders...`);
      renderQueue.forEach(req => handleRender(req.req, req.res).catch(console.error));
      renderQueue = [];
    }
  } catch (err) {
    console.error('❌ HyperFrames server error:', err.message);
    process.exit(1);
  }
}

// Simple HTTP server to proxy to HyperFrames producer
const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Health check
  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: hfReady ? 'ok' : 'starting', 
      uptime: process.uptime(),
      queue: renderQueue.length
    }));
    return;
  }

  // Serve rendered videos (from producer's output directory)
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

  // Serve static assets (GSAP, etc)
  if (url.pathname.startsWith('/js/')) {
    const filePath = join(PUBLIC_DIR, url.pathname);
    if (existsSync(filePath)) {
      res.writeHead(200, { 'Content-Type': 'application/javascript' });
      createReadStream(filePath).pipe(res);
      return;
    }
  }

  // Render endpoint
  if (url.pathname === '/render' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { html, outputFilename } = JSON.parse(body);
        if (!html) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'html is required' }));
          return;
        }

        const filename = outputFilename || `video-${Date.now()}.mp4`;
        const outputPath = join(RENDERS_DIR, filename);
        
        // Prepare HTML with local GSAP
        const preparedHtml = prepareHtml(html);

        console.log(`[Render] Starting render: ${filename} (${(html.length / 1024).toFixed(0)}KB HTML)`);

        // Proxy to HyperFrames producer server
        const hfResp = await fetch(`http://localhost:${HF_PORT}/render`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            html: preparedHtml,
            outputPath,
            width: 1920,
            height: 1080,
            fps: 30,
            duration: 22,
            quality: 'high',
          }),
          signal: AbortSignal.timeout(180000), // 3 min timeout
        });

        const result = await hfResp.json();
        
        if (result.success) {
          console.log(`[Render] ✅ Done: /renders/${filename} (${(result.fileSize / 1024 / 1024).toFixed(1)}MB)`);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            videoUrl: `/renders/${filename}`,
            fileSize: result.fileSize,
            durationMs: result.durationMs,
          }));
        } else {
          console.error(`[Render] ❌ Error: ${result.error}`);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: result.error }));
        }
      } catch (err) {
        console.error('[Render] Exception:', err.message);
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
  initHfServer();
});
