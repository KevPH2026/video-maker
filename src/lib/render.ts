// Renders structured JSON (from AI) to HyperFrames HTML template
export function renderJsonToHtml(json: any, fallbackData?: {
  name?: string;
  tagline?: string;
  features?: string;
  price?: string;
  market?: string;
}): string {
  const title = json.scene1_title || fallbackData?.name || '产品名称';
  const subtitle = json.scene1_subtitle || fallbackData?.tagline || '';
  
  const s1Stats = (json.scene1_stats && json.scene1_stats.length > 0
    ? json.scene1_stats
    : [
        fallbackData?.price ? `价格 ${fallbackData.price}` : '高品质产品',
        fallbackData?.market || '全球市场',
        '创新科技',
      ]
  ).map((s: string) => {
    const match = s.match(/^([0-9a-zA-Z$%°米㎡㎡万一台次个]+(?:[\u4e00-\u9fa5]|[a-zA-Z])*)\s*[-–—:]?\s*(.*)$/);
    const num = match ? match[1] : s;
    const label = match && match[2] ? match[2] : '';
    return `<div style="text-align:center"><div style="font-size:56px;font-weight:900;color:#f59e0b;line-height:1">${num}</div>${label ? `<div style="font-size:14px;color:#64748b;margin-top:8px;letter-spacing:2px">${label}</div>` : ''}</div>`;
  }).join('');

  const features = (json.scene2_features && json.scene2_features.length > 0
    ? json.scene2_features
    : [
        { icon: '🌐', title: '全球覆盖', desc: fallbackData?.market || '面向全球市场' },
        { icon: '⚡', title: '高效便捷', desc: fallbackData?.features || '卓越品质' },
        { icon: '🎯', title: '精准定位', desc: fallbackData?.price ? `价格: ${fallbackData.price}` : '性价比高' },
      ]
  );

  const featureCards = features.map((f: any) =>
    `<div style="background:rgba(255,255,255,0.04);border:1px solid rgba(245,158,11,0.15);border-radius:20px;padding:36px;text-align:center">
      <div style="width:60px;height:60px;background:linear-gradient(135deg,#f59e0b,#d97706);border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:28px;margin:0 auto 20px">${f.icon}</div>
      <div style="font-size:22px;font-weight:700;color:#fff;margin-bottom:12px">${f.title}</div>
      <div style="font-size:14px;color:#64748b;line-height:1.6">${f.desc}</div>
    </div>`
  ).join('');

  const stats = (json.scene3_stats && json.scene3_stats.length > 0
    ? json.scene3_stats
    : [
        { value: fallbackData?.price || '$399', label: '价格' },
        { value: fallbackData?.market || '全球', label: '目标市场' },
        { value: '99%', label: '好评率' },
      ]
  );

  const statNums = stats.map((s: any) =>
    `<div style="text-align:center">
      <div style="font-size:88px;font-weight:900;color:#f59e0b;line-height:1">${s.value}</div>
      <div style="font-size:16px;color:#64748b;margin-top:12px;letter-spacing:2px">${s.label}</div>
    </div>`
  ).join('');

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;overflow:hidden;background:#0a0a14;font-family:system-ui,-apple-system,sans-serif}
.s{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:80px;opacity:0}
.s1{background:radial-gradient(ellipse at 50% 40%,#1a1525 0%,#0a0a14 100%)}
.s2{background:linear-gradient(180deg,#0d0d15 0%,#12121a 100%)}
.s3{background:#0a0a10}
.s4{background:linear-gradient(135deg,#1a1525 0%,#0a0a14 100%)}
.glow{position:absolute;width:500px;height:500px;background:radial-gradient(circle,rgba(245,158,11,0.2) 0%,transparent 70%);filter:blur(60px);pointer-events:none}
.t1{font-size:120px;font-weight:900;color:#fff;letter-spacing:8px;text-align:center;line-height:1.1}
.t1 span{color:#f59e0b}
.t2{font-size:28px;color:#94a3b8;letter-spacing:6px;margin-top:24px;text-align:center}
.s3row{display:flex;gap:80px}
.c1{font-size:72px;font-weight:900;color:#fff;text-align:center;line-height:1.1}
.c1 span{background:linear-gradient(135deg,#f59e0b,#fbbf24);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.c2{display:inline-block;margin-top:40px;padding:16px 40px;background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);border-radius:12px;font-size:24px;color:#e2e8f0;letter-spacing:2px}
</style>
</head>
<body>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<div id="comp" data-composition-id="comp" data-width="1920" data-height="1080" data-start="0" data-duration="22">
<div class="s s1"><div class="glow" style="top:-100px;left:-100px;opacity:0.4"></div><div class="glow" style="bottom:-100px;right:-100px;opacity:0.25;background:radial-gradient(circle,rgba(99,102,241,0.3) 0%,transparent 70%)"></div><div class="t1">${title}</div><div class="t2">${subtitle}</div><div style="display:flex;gap:80px;margin-top:60px">${s1Stats}</div></div>
<div class="s s2"><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:24px;max-width:1200px">${featureCards}</div></div>
<div class="s s3"><div class="s3row">${statNums}</div></div>
<div class="s s4"><div class="c1">${json.scene4_title || title}<br><span>${json.scene4_highlight || (fallbackData?.price ? `¥${fallbackData.price}` : '立即体验')}</span></div><div class="c2">${json.scene4_url || (fallbackData?.market ? `www.${fallbackData.market.toLowerCase().replace(/[^a-z]/g,'')}.com` : 'www.example.com')}</div></div>
</div>
<script>
window.__timelines=window.__timelines||{};
const tl=gsap.timeline({paused:false});
tl.to('.glow',{scale:1.15,opacity:0.55,duration:3.5,ease:'sine.inOut',yoyo:true,repeat:5},0);
tl.to('.s1',{opacity:1,duration:0.5,ease:'power2.out'},0.3);
tl.from('.t1',{scale:0.8,opacity:0,duration:1,ease:'elastic.out(1,0.5)'},0.6);
tl.from('.t2',{y:30,opacity:0,duration:0.8,ease:'power3.out'},1.1);
tl.from('.s1 > div:last-child > div',{y:40,opacity:0,stagger:0.2,duration:0.7,ease:'power3.out'},1.5);
tl.to('.s1',{opacity:0,filter:'blur(10px)',duration:0.35,ease:'power2.in'},4.8);
tl.from('.s2',{opacity:0,filter:'blur(10px)',duration:0.35,ease:'power2.out'},5.1);
tl.to('.s2',{opacity:1,duration:0.3},5.3);
tl.from('.s2 > div > div',{y:80,opacity:0,stagger:0.2,duration:0.85,ease:'back.out(1.1)'},5.5);
tl.to('.s2',{x:'-100%',opacity:0,duration:0.4,ease:'power4.in'},10.0);
tl.from('.s3',{x:'100%',opacity:0,duration:0.4,ease:'power4.out'},10.05);
tl.to('.s3',{opacity:1,duration:0.3},10.5);
tl.from('.s3 > div > div',{y:40,opacity:0,stagger:0.2,duration:0.8,ease:'back.out(1.3)'},10.8);
tl.to('.s3',{scale:1.1,opacity:0,duration:0.4,ease:'power4.in'},15.5);
tl.from('.s4',{scale:0.85,opacity:0,duration:0.5,ease:'power3.out'},15.55);
tl.to('.s4',{opacity:1,duration:0.3},16.0);
tl.from('.c1',{y:60,opacity:0,duration:1,ease:'power3.out'},16.3);
tl.from('.c2',{scale:0.8,opacity:0,duration:0.8,ease:'back.out(1.4)'},17.1);
tl.to('.s4',{opacity:0,duration:1.5,ease:'power2.in'},21.0);
window.__timelines["comp"]=tl;
</script>
</body>
</html>`;
}

// Wraps HTML in preview-friendly iframe with GSAP and message bridge
export function buildPreviewHtml(html: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>*{margin:0;padding:0;box-sizing:border-box}html,body{width:100%;height:100%;overflow:hidden;background:#0a0a14}</style>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
</head>
<body>${html}
<script>
window.__timelines = window.__timelines || {};
const tl = gsap.timeline({ paused: false });
window.__timelines["comp"] = tl;
window.parent.postMessage('ready', '*');
</script>
</body>
</html>`;
}
