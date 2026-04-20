'use client';

import { useState, useRef, useCallback, useEffect, use as useReact } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { renderJsonToHtml, buildPreviewHtml } from '@/lib/render';

const CN = {
  nav: { how: '工作原理', features: '功能', demo: '演示', pricing: '定价', tryFree: '免费试用' },
  hero: { badge: 'AI驱动 · HyperFrames引擎', title1: '输入任意链接', title2: '生成专业视频', subtitle: '粘贴任意网页URL，AI提取内容并生成精美的GSAP动画视频，30秒内完成。', placeholder: 'https://yoursite.com', btn: '开始体验 →', generating: '生成中...', hint: '无需信用卡 · 免费试用 · HD导出' },
  how: { badge: '简单流程', title1: '三步完成', title2: '零门槛', steps: [{ n: '01', t: '粘贴URL', d: '输入任意网页链接 — 产品页、文章、落地页均可。' }, { n: '02', t: 'AI分析', d: 'HyperFrames引擎自动提取关键内容、场景和视觉层级。' }, { n: '03', t: '视频就绪', d: '下载精美HD视频，带电影级转场效果，可分享到任意平台。' }] },
  features: { badge: 'HyperFrames引擎', title1: '极速', title2: '高质量', items: [{ i: '⚡', t: '30秒导出', d: '从URL到HD视频仅需30秒。无需等待。' }, { i: '🎬', t: 'AI场景分析', d: '自动识别关键内容、数据和视觉层级。' }, { i: '📐', t: '多格式', d: '支持16:9、9:16、1:1、4:5任意比例。' }, { i: '🖥️', t: 'HTML5播放器', d: '内置视频播放器，支持自定义品牌。' }, { i: '🔧', t: '无需代码', d: '粘贴URL，点击生成，零技术门槛。' }, { i: '💎', t: 'HD质量', d: '1080p全高清导出，电影级转场。' }] },
  demo: { badge: '实时演示', title1: '立即体验', title2: '', input: 'INPUT', output: 'OUTPUT', empty: '在上方输入URL...', generating: '视频将在这里显示...', placeholder: '填写左侧信息并点击生成', cta: '去制作完整视频 →' },
  pricing: { badge: '简单定价', title: { f: '免费', w: '自定义', p: '付费' }, subtitle: '免费版每天每IP生成3个视频。付费版 — 填你想要的数量和你能接受的价格。', free: { name: '免费版', price: '$0', desc: '零成本试用，体验完整功能', features: ['每天3个视频/IP', '720p分辨率', '基础模板', '社区支持'], cta: '免费开始' }, ess: { tag: '最灵活', name: '付费基础版', old: '$29', features: ['自定义视频数量', '1080p HD导出', '全部模板', '自定义品牌', '优先支持'], cta: '提交报价' }, pro: { tag: '最强大', name: '付费专业版', old: '$99', features: ['更多视频数量', '4K超高清导出', '团队协作', 'API接口', '专属支持', '定制模板'], cta: '提交报价' } },
  footer: { cta1: '准备', cta2: '引爆传播？', cta3: '加入成千上万的创作者，把网页变成病毒视频。无需信用卡。', btn: '免费开始创作 →' },
};

const EN = {
  nav: { how: 'How', features: 'Features', demo: 'Demo', pricing: 'Pricing', tryFree: 'Try Free' },
  hero: { badge: 'AI-Powered · HyperFrames Engine', title1: 'PASTE ANY URL.', title2: 'GET A VIDEO.', subtitle: 'Paste any webpage URL. Our AI extracts the content, generates a cinematic video with HyperFrames engine, and delivers stunning HD video — in under 30 seconds.', placeholder: 'https://yoursite.com', btn: 'Generate Now →', generating: 'Generating...', hint: 'No credit card required · Free tier available · HD export' },
  how: { badge: 'Simple Process', title1: 'THREE STEPS.', title2: 'Zero Complexity.', steps: [{ n: '01', t: 'Paste URL', d: 'Enter any webpage URL — product page, article, landing page — anything.' }, { n: '02', t: 'AI Analyzes', d: 'Our HyperFrames engine extracts key content, scenes, and visual hierarchy.' }, { n: '03', t: 'Video Ready', d: 'Download stunning HD video with cinematic transitions. Share anywhere.' }] },
  features: { badge: 'HyperFrames Engine', title1: 'Built for', title2: 'Speed & Quality', items: [{ i: '⚡', t: '30-Second Export', d: 'From URL to HD video in under 30 seconds. No waiting, no queue.' }, { i: '🎬', t: 'AI Scene Analysis', d: 'Automatically identifies key content, stats, and visual hierarchy.' }, { i: '📐', t: 'Multi-Format', d: 'Export in 16:9, 9:16, 1:1, and 4:5. Perfect for any platform.' }, { i: '🖥️', t: 'HTML5 Player', d: 'Built-in video player with custom branding. Embed anywhere.' }, { i: '🔧', t: 'No Code Required', d: 'Paste URL, click generate. No technical skills needed.' }, { i: '💎', t: 'HD Quality', d: 'Crystal clear 1080p exports with cinematic transitions.' }] },
  demo: { badge: 'Live Preview', title1: 'TRY IT', title2: 'Right Now', input: 'INPUT', output: 'OUTPUT', empty: 'Enter a URL above...', generating: 'Generating...', placeholder: 'Fill in the left side and click generate', cta: 'Go to Full Video Maker →' },
  pricing: { badge: 'Simple Pricing', title: { f: 'Free', w: 'Set Your Own', p: 'Pro' }, subtitle: 'Free tier: 3 videos/day/IP. Paid — tell us how many you need and what you\'d pay.', free: { name: 'Free', price: '$0', desc: 'Try it out. No commitment.', features: ['3 videos / day / IP', '720p resolution', 'Basic templates', 'Community support'], cta: 'Get Started Free' }, ess: { tag: 'MOST FLEXIBLE', name: 'Paid Essentials', old: '$29', features: ['Custom video quantity', '1080p HD export', 'All templates', 'Custom branding', 'Priority support'], cta: 'Submit Quote' }, pro: { tag: 'MOST POWERFUL', name: 'Paid Pro', old: '$99', features: ['Higher volume', '4K export', 'Team collaboration', 'API access', 'Dedicated support', 'Custom templates'], cta: 'Submit Quote' } },
  footer: { cta1: 'Ready to', cta2: 'Go Viral?', cta3: 'Join thousands of creators turning webpages into viral videos. No credit card required.', btn: 'Start Creating Free →' },
};

type Lang = typeof CN;

export default function LocalePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = useReact(params);
  const t: Lang = locale === 'en' ? EN : CN;
  const [inputValue, setInputValue] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState('');
  const [resultHtml, setResultHtml] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const previewRef = useRef<HTMLIFrameElement>(null);
  const previewWinRef = useRef<Window | null>(null);
  const isEN = locale === 'en';

  const handleGenerate = useCallback(async () => {
    if (!inputValue.trim() || isGenerating) return;
    setIsGenerating(true);
    setGenerationStep(isEN ? 'Analyzing product info...' : '正在分析产品信息...');
    setResultHtml('');
    setShowPreview(false);

    try {
      setGenerationStep(isEN ? 'Generating video content...' : '正在生成视频内容...');
      // Call SiliconFlow directly from client to avoid serverless timeout
      const API_KEY = 'sk-bzuzrniblkmsprdphgfhigqqokinomxcsfnwpexejboplbld';
      const prompt = `You are an expert HyperFrames HTML video composition generator.

OUTPUT: Return ONLY a complete HTML file, no markdown, no explanation. Start with <!DOCTYPE html>.

RULES:
- Total duration: 22 seconds, 1920x1080 landscape
- 4 scenes: Scene 1 (Hero) → Scene 2 (Features) → Scene 3 (Stats) → Scene 4 (CTA)
- Root element: <div id="comp" data-composition-id="video" data-width="1920" data-height="1080" data-start="0" data-duration="22">
- GSAP timeline with window.__timelines["video"] = tl (paused: true)
- Animations ONLY via gsap.from() — NO gsap.to() exit animations except final scene fade
- Scene transitions: use CSS blur crossfade on scene containers
- Ambient animations (glow, grid, etc): finite repeat Math.floor(22/cycleDuration)-1
- CSS: body { margin:0; overflow:hidden; font-family: system-ui }
- Use system fonts (no Google Fonts imports)
- Dark background (#0a0a14), amber accent (#f59e0b or similar), white text
- The HTML must be renderable in a browser and look like a professional video composition

Generate a professional video composition for: ${inputValue}

Make the content specific to this product/service. Include real text, numbers, and details.
Colors: dark background with warm amber/gold accent.`;

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 30000);
      let response;
      try {
        response = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'deepseek-ai/DeepSeek-V3',
            messages: [{ role: 'user', content: prompt }],
            stream: false,
            max_tokens: 4000,
          }),
          signal: controller.signal as any,
        });
      } finally {
        clearTimeout(timer);
      }
      if (!response.ok) throw new Error(isEN ? 'Generation failed' : '生成失败');
      const data = await response.json();
      let raw = data.choices?.[0]?.message?.content || '';
      // Unescape HTML entities if present
      raw = raw.replace(/\\u([0-9a-f]{4})/gi, (_m: any, hex: string) => String.fromCharCode(parseInt(hex, 16)));
      // Strip markdown code fences (handle various formats)
      let html = raw.replace(/^```[a-z]*\s*/i, '').replace(/\s*```\s*$/i, '').trim();
      // Validate HTML presence
      if (!html.includes('<html') && !html.includes('<!DOCTYPE')) {
        console.error('Invalid HTML returned, raw first 500:', raw.slice(0, 500));
        throw new Error(isEN ? 'Failed to generate video content, please retry' : '视频内容生成失败，请重试');
      }
      setGenerationStep(isEN ? 'Rendering preview...' : '正在渲染预览...');
      setResultHtml(html);
      setShowPreview(true);

      if (previewWinRef.current) previewWinRef.current.close();
      const win = window.open('', '_blank', 'width=1920,height=1080') as any;
      if (win) {
        win.document.write(buildPreviewHtml(html));
        win.document.close();
        previewWinRef.current = win;
      }
    } catch (error: any) {
      console.error(error);
      alert(error.message || (isEN ? 'Generation failed' : '生成失败'));
    } finally {
      setIsGenerating(false);
      setGenerationStep('');
    }
  }, [inputValue, isGenerating, isEN]);

  return (
    <>
      <Head>
        <title>{isEN ? 'web2.video — Turn Any Webpage Into Video' : 'web2.video — 输入任意链接，生成专业视频'}</title>
        <meta name="description" content={isEN ? 'AI-powered webpage to video conversion. Paste any URL and get a stunning video in seconds.' : 'AI驱动的网页转视频工具，输入任意链接即可生成精美视频。'} />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </Head>

      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #000; color: #fff; font-family: 'Inter', sans-serif; overflow-x: hidden; }
        .glitch-text { position: relative; animation: glitch 3s infinite; }
        @keyframes glitch { 0%, 90%, 100% { transform: translate(0); } 92% { transform: translate(-2px, 1px); } 94% { transform: translate(2px, -1px); } 96% { transform: translate(-1px, 2px); } 98% { transform: translate(1px, -2px); } }
        .neon-text { text-shadow: 0 0 10px #ff0080, 0 0 20px #ff0080, 0 0 40px #ff0080, 0 0 80px #ff0080; }
        .cyan-text { text-shadow: 0 0 10px #00ffff, 0 0 20px #00ffff, 0 0 40px #00ffff; }
        .gradient-btn { background: linear-gradient(135deg, #ff0080, #00ffff); border: none; padding: 16px 40px; border-radius: 50px; color: #fff; font-size: 16px; font-weight: 700; cursor: pointer; transition: all 0.3s; box-shadow: 0 0 30px rgba(255,0,128,0.4); text-decoration: none; display: inline-block; }
        .gradient-btn:hover { transform: scale(1.05); box-shadow: 0 0 50px rgba(255,0,128,0.6); }
        .gradient-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        .glass-card { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; backdrop-filter: blur(10px); }
        .grid-bg { background-image: linear-gradient(rgba(255,0,128,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,0,128,0.03) 1px, transparent 1px); background-size: 60px 60px; }
        .pay-input { width: 100%; padding: 12px 16px; font-size: 20px; font-weight: 700; background: rgba(255,255,255,0.08); border: 2px solid rgba(0,255,255,0.3); border-radius: 12px; color: #00ffff; outline: none; text-align: center; font-family: 'Inter', sans-serif; box-sizing: border-box; }
        .pay-input:focus { border-color: #00ffff; box-shadow: 0 0 20px rgba(0,255,255,0.2); }
        .submit-price-btn { width: 100%; margin-top: 12px; padding: 12px; background: linear-gradient(135deg, #00ffff, #0080ff); border: none; border-radius: 12px; color: #000; font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.3s; }
        .submit-price-btn:hover { transform: scale(1.02); box-shadow: 0 0 30px rgba(0,255,255,0.4); }
        .lang-switch { display: flex; gap: 4px; }
        .lang-btn { padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer; border: 1px solid rgba(255,255,255,0.15); background: transparent; color: #888; transition: all 0.2s; text-decoration: none; }
        .lang-btn.active { background: linear-gradient(135deg, #ff0080, #00ffff); color: #fff; border-color: transparent; }
        .lang-btn:hover:not(.active) { color: #fff; border-color: rgba(255,255,255,0.3); }
        @keyframes loading { 0% { width: 0%; } 50% { width: 100%; } 100% { width: 0%; } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @media (max-width: 768px) { section, nav { padding: 60px 20px !important; } nav { padding: 16px 20px !important; } h2 { font-size: 32px !important; } }
      `}</style>

      {/* NAV */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 60px', position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, backdropFilter: 'blur(20px)', background: 'rgba(0,0,0,0.5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 24, fontWeight: 900 }} className="neon-text">web2</span>
          <span style={{ fontSize: 24, fontWeight: 300 }}>.video</span>
        </div>
        <div style={{ display: 'flex', gap: 32, fontSize: 14, fontWeight: 500, alignItems: 'center' }}>
          <a href="#how" style={{ color: '#aaa', textDecoration: 'none' }}>{t.nav.how}</a>
          <a href="#features" style={{ color: '#aaa', textDecoration: 'none' }}>{t.nav.features}</a>
          <a href="#demo" style={{ color: '#aaa', textDecoration: 'none' }}>{t.nav.demo}</a>
          <a href="#pricing" style={{ color: '#aaa', textDecoration: 'none' }}>{t.nav.pricing}</a>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div className="lang-switch">
            <a href="/" className={`lang-btn ${!isEN ? 'active' : ''}`}>CN</a>
            <a href="/en" className={`lang-btn ${isEN ? 'active' : ''}`}>EN</a>
          </div>
          <a href="/generate" className="gradient-btn" style={{ fontSize: 13, padding: '10px 24px' }}>{t.nav.tryFree}</a>
        </div>
      </nav>

      {/* HERO */}
      <section className="grid-bg" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '120px 40px 80px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #000 0%, transparent 40%, rgba(255,0,128,0.15) 60%, rgba(0,255,255,0.1) 80%, #000 100%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '-20%', right: '-10%', width: '80%', height: '140%', background: 'radial-gradient(ellipse at center, rgba(255,0,128,0.2) 0%, transparent 60%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-20%', left: '-10%', width: '80%', height: '140%', background: 'radial-gradient(ellipse at center, rgba(0,255,255,0.15) 0%, transparent 60%)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 2, maxWidth: 900 }}>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 4, color: '#ff0080', marginBottom: 24, textTransform: 'uppercase' }}>{t.hero.badge}</div>
          <h1 className="glitch-text" style={{ fontSize: 'clamp(40px, 8vw, 88px)', fontWeight: 900, lineHeight: 1.1, marginBottom: 24, letterSpacing: -2 }}>
            <span className="neon-text">{t.hero.title1}</span><br />
            <span className="cyan-text">{t.hero.title2}</span>
          </h1>
          <p style={{ fontSize: 18, color: '#aaa', marginBottom: 48, maxWidth: 560, margin: '0 auto 48px', lineHeight: 1.6 }}>{t.hero.subtitle}</p>

          <div style={{ display: 'flex', gap: 0, maxWidth: 600, margin: '0 auto', flexWrap: 'wrap', justifyContent: 'center' }}>
            <input type="text" value={inputValue} onChange={e => setInputValue(e.target.value)} placeholder={t.hero.placeholder}
              style={{ flex: 1, minWidth: 280, padding: '16px 24px', fontSize: 15, background: 'rgba(255,255,255,0.07)', border: '2px solid rgba(255,0,128,0.3)', borderRadius: '50px 0 0 50px', color: '#fff', outline: 'none', fontFamily: 'Inter', boxSizing: 'border-box' }}
              onKeyDown={e => e.key === 'Enter' && handleGenerate()} />
            <button className="gradient-btn" onClick={handleGenerate} disabled={isGenerating || !inputValue.trim()}
              style={{ borderRadius: '0 50px 50px 0', opacity: (!inputValue.trim() || isGenerating) ? 0.5 : 1 }}>
              {isGenerating ? t.hero.generating : t.hero.btn}
            </button>
          </div>

          {isGenerating && (
            <div style={{ marginTop: 24, color: '#00ffff', fontSize: 14 }}>
              <div>{generationStep}</div>
              <div style={{ width: '60%', margin: '12px auto', height: 2, background: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
                <div style={{ height: '100%', background: 'linear-gradient(90deg, #ff0080, #00ffff)', borderRadius: 2, animation: 'loading 1.5s ease-in-out infinite', width: '60%' }} />
              </div>
            </div>
          )}

          <div style={{ marginTop: 24, fontSize: 12, color: '#555' }}>{t.hero.hint}</div>
        </div>
      </section>

      {/* HOW */}
      <section id="how" style={{ padding: '120px 40px', background: 'linear-gradient(180deg, #000, #0a0010)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 4, color: '#ff0080', textTransform: 'uppercase', marginBottom: 16, textAlign: 'center' }}>{t.how.badge}</div>
          <h2 style={{ fontSize: 48, fontWeight: 900, textAlign: 'center', marginBottom: 80, letterSpacing: -1 }}>
            <span className="neon-text">{t.how.title1}</span><br /><span style={{ color: '#fff', fontWeight: 300 }}>{t.how.title2}</span>
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {t.how.steps.map((step, i) => (
              <div key={i} className="glass-card" style={{ padding: 32, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${['#ff0080','#bf00ff','#00ffff'][i]}, transparent)` }} />
                <div style={{ fontSize: 64, fontWeight: 900, color: ['#ff0080','#bf00ff','#00ffff'][i], opacity: 0.3, position: 'absolute', top: -10, right: 16 }}>{step.n}</div>
                <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12, color: ['#ff0080','#bf00ff','#00ffff'][i] }}>{step.t}</h3>
                <p style={{ fontSize: 14, color: '#888', lineHeight: 1.6 }}>{step.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" style={{ padding: '120px 40px', background: '#000' }} className="grid-bg">
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 4, color: '#00ffff', textTransform: 'uppercase', marginBottom: 16, textAlign: 'center' }}>{t.features.badge}</div>
          <h2 style={{ fontSize: 48, fontWeight: 900, textAlign: 'center', marginBottom: 64, letterSpacing: -1 }}>
            <span className="cyan-text">{t.features.title1}</span> <span className="neon-text">{t.features.title2}</span>
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {t.features.items.map((f, i) => (
              <div key={i} className="glass-card" style={{ padding: 24, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 28, flexShrink: 0 }}>{f.i}</span>
                <div>
                  <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{f.t}</h4>
                  <p style={{ fontSize: 13, color: '#888', lineHeight: 1.5 }}>{f.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DEMO */}
      <section id="demo" style={{ padding: '120px 40px', background: 'linear-gradient(180deg, #000, #0a0015)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 4, color: '#bf00ff', textTransform: 'uppercase', marginBottom: 16, textAlign: 'center' }}>{t.demo.badge}</div>
          <h2 style={{ fontSize: 48, fontWeight: 900, textAlign: 'center', marginBottom: 16 }}>
            <span className="neon-text">{t.demo.title1}</span>{"title2" in t.demo && t.demo.title2 ? <><br /><span style={{ fontWeight: 300 }}>{String((t.demo as any).title2)}</span></> : null}
          </h2>
          <p style={{ textAlign: 'center', color: '#888', marginBottom: 64, maxWidth: 480, margin: '0 auto 64px' }}>{isEN ? 'Enter any URL above and watch the AI transform it into a video in real-time.' : '在上方输入任意URL，观看AI实时将网页转化为视频。'}</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div className="glass-card" style={{ padding: 32 }}>
              <div style={{ fontSize: 12, color: '#ff0080', fontWeight: 700, marginBottom: 16 }}>{t.demo.input}</div>
              <div style={{ background: 'rgba(0,0,0,0.5)', borderRadius: 12, padding: 16, minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,0,128,0.2)' }}>
                {inputValue ? (
                  <div style={{ fontSize: 13, color: '#00ffff', wordBreak: 'break-all', textAlign: 'left', width: '100%', fontFamily: 'monospace' }}>{inputValue}</div>
                ) : (
                  <div style={{ color: '#444', fontSize: 14 }}>{t.demo.empty}</div>
                )}
              </div>
            </div>
            <div className="glass-card" style={{ padding: 32 }}>
              <div style={{ fontSize: 12, color: '#00ffff', fontWeight: 700, marginBottom: 16 }}>{t.demo.output}</div>
              <div style={{ background: 'rgba(0,0,0,0.5)', borderRadius: 12, padding: 16, minHeight: 200, border: '1px solid rgba(0,255,255,0.2)' }}>
                {showPreview && resultHtml ? (
                  <iframe ref={previewRef} style={{ width: '100%', height: 200, border: 'none', borderRadius: 8 }}
                    sandbox="allow-scripts allow-same-origin" title="Video Preview"
                    srcDoc={buildPreviewHtml(resultHtml)} />
                ) : isGenerating ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 168 }}>
                    <div style={{ fontSize: 32, marginBottom: 8, animation: 'pulse 1s infinite' }}>⚡</div>
                    <div style={{ fontSize: 12, color: '#00ffff' }}>{generationStep || t.demo.generating}</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 168, color: '#444', fontSize: 14 }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>▶</div>
                    {t.demo.generating}
                  </div>
                )}
              </div>
            </div>
          </div>

          {showPreview && (
            <div style={{ textAlign: 'center', marginTop: 24 }}>
              <a href="/generate" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 32px', background: 'linear-gradient(135deg, #ff0080, #00ffff)', borderRadius: 50, color: '#fff', fontWeight: 700, fontSize: 14, textDecoration: 'none', boxShadow: '0 0 30px rgba(255,0,128,0.3)' }}>
                {t.demo.cta}
              </a>
            </div>
          )}

          {/* Example outputs - click to pre-fill */}
          {!showPreview && !isGenerating && (
            <div style={{ marginTop: 56 }}>
              <p style={{ textAlign: 'center', color: '#666', fontSize: 13, marginBottom: 24 }}>{isEN ? 'Or try these examples →' : '试试这些示例产品 →'}</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                {[
                  { name: isEN ? 'Smart Watch Pro X' : '智能手表 Pro X', desc: isEN ? 'Fitness tracker for athletes, $399' : '运动GPS心率表，¥2999', color: '#ff6b35', bg: '#1a0a00' },
                  { name: isEN ? 'Portable Power Station' : '便携储能电源', desc: isEN ? '1000Wh solar generator, $599' : '1000Wh太阳能储能，¥4599', color: '#00d4aa', bg: '#001a10' },
                  { name: isEN ? 'Air Purifier Mini' : '空气净化器 Mini', desc: isEN ? 'HEPA filter for small rooms, $129' : 'HEPA静音净化，¥999', color: '#bf5af2', bg: '#0d001a' },
                ].map((ex, i) => (
                  <a key={i} href={`/generate?name=${encodeURIComponent(ex.name)}&tagline=${encodeURIComponent(ex.desc)}`}
                    style={{ display: 'block', padding: '20px 24px', borderRadius: 16, background: ex.bg, border: `1px solid ${ex.color}33`, textDecoration: 'none' }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 6 }}>{ex.name}</div>
                    <div style={{ fontSize: 12, color: ex.color }}>{ex.desc}</div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" style={{ padding: '120px 40px', background: '#000' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 4, color: '#ff0080', textTransform: 'uppercase', marginBottom: 16, textAlign: 'center' }}>{t.pricing.badge}</div>
          <h2 style={{ fontSize: 48, fontWeight: 900, textAlign: 'center', marginBottom: 16, letterSpacing: -1 }}>
            <span className="cyan-text">{t.pricing.title.f}</span> <span style={{ fontWeight: 300 }}>{isEN ? 'Free.' : '免费。'}</span><br />
            <span style={{ fontWeight: 300 }}>{t.pricing.title.w}.</span>
          </h2>
          <p style={{ textAlign: 'center', color: '#888', marginBottom: 64, maxWidth: 520, margin: '0 auto 64px', fontSize: 14 }}>{t.pricing.subtitle}</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, alignItems: 'start' }}>
            {/* Free */}
            <div className="glass-card" style={{ padding: 32, border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#888', marginBottom: 8, letterSpacing: 2 }}>{t.pricing.free.name.toUpperCase()}</div>
              <div style={{ fontSize: 40, fontWeight: 900, marginBottom: 4 }}><span style={{ color: '#888' }}>{t.pricing.free.price}</span></div>
              <p style={{ fontSize: 13, color: '#888', marginBottom: 24, lineHeight: 1.4 }}>{t.pricing.free.desc}</p>
              <ul style={{ listStyle: 'none', marginBottom: 32 }}>
                {t.pricing.free.features.map((f, j) => (
                  <li key={j} style={{ fontSize: 13, color: '#ccc', marginBottom: 10, paddingLeft: 20, position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 0, color: '#888' }}>✓</span> {f}
                  </li>
                ))}
              </ul>
              <a href="/generate" style={{ display: 'block', width: '100%', padding: '14px', textAlign: 'center', background: 'rgba(255,255,255,0.08)', border: '2px solid rgba(255,255,255,0.2)', borderRadius: 12, color: '#fff', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
                {t.pricing.free.cta}
              </a>
            </div>

            {/* Essentials */}
            <div className="glass-card" style={{ padding: 32, border: '2px solid #ff0080', position: 'relative', background: 'rgba(255,0,128,0.03)' }}>
              <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg, #ff0080, #00ffff)', padding: '4px 16px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{t.pricing.ess.tag}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#ff0080', marginBottom: 8, letterSpacing: 2 }}>{t.pricing.ess.name.toUpperCase()}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 14, color: '#888', textDecoration: 'line-through' }}>{t.pricing.ess.old}</span>
                <span style={{ fontSize: 14, color: '#ff0080', fontWeight: 600 }}>{t.pricing.title.w}</span>
              </div>
              <ul style={{ listStyle: 'none', marginBottom: 24 }}>
                {t.pricing.ess.features.map((f, j) => (
                  <li key={j} style={{ fontSize: 13, color: '#ccc', marginBottom: 10, paddingLeft: 20, position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 0, color: '#ff0080' }}>✓</span> {f}
                  </li>
                ))}
              </ul>
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 12, color: '#888', marginBottom: 6, fontWeight: 600 }}>{isEN ? 'Number of videos you want' : '想要多少个视频'}</div>
                <input type="number" placeholder={isEN ? 'e.g. 100' : '例如：100'} className="pay-input" min="1" id="qty-ess" style={{ borderColor: 'rgba(255,0,128,0.3)' }} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: '#888', marginBottom: 6, fontWeight: 600 }}>{isEN ? 'Price you accept (¥)' : '你能接受的价格（元）'}</div>
                <input type="number" placeholder={isEN ? 'e.g. 299' : '例如：299'} className="pay-input" min="1" id="pay-ess" style={{ borderColor: 'rgba(255,0,128,0.3)' }} />
              </div>
              <button className="submit-price-btn" style={{ background: 'linear-gradient(135deg, #ff0080, #00ffff)' }}
                onClick={() => {
                  const qtyEl = document.getElementById('qty-ess') as HTMLInputElement;
                  const priceEl = document.getElementById('pay-ess') as HTMLInputElement;
                  const qty = qtyEl?.value;
                  const price = priceEl?.value;
                  if (!qty || Number(qty) <= 0) { alert(isEN ? 'Please enter number of videos' : '请输入视频数量'); return; }
                  if (!price || Number(price) <= 0) { alert(isEN ? 'Please enter your price' : '请输入你能接受的价格'); return; }
                  fetch('/api/price-submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan: 'essentials', qty: Number(qty), price: Number(price) }) })
                    .then(r => r.json()).then(d => { if (d.ok) alert(isEN ? `Thanks! ${qty} videos at ¥${price} — we recorded it!` : `谢谢！${qty}个视频，¥${price}，已记录！`); else alert(d.error || (isEN ? 'Submit failed' : '提交失败')); })
                    .catch(() => alert(isEN ? 'Submit failed' : '提交失败'));
                }}>
                {t.pricing.ess.cta}
              </button>
            </div>

            {/* Pro */}
            <div className="glass-card" style={{ padding: 32, border: '1px solid rgba(0,255,255,0.3)', position: 'relative', background: 'rgba(0,255,255,0.03)' }}>
              <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg, #00ffff, #0080ff)', padding: '4px 16px', borderRadius: 20, fontSize: 11, fontWeight: 700, color: '#000' }}>{t.pricing.pro.tag}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#00ffff', marginBottom: 8, letterSpacing: 2 }}>{t.pricing.pro.name.toUpperCase()}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 14, color: '#888', textDecoration: 'line-through' }}>{t.pricing.pro.old}</span>
                <span style={{ fontSize: 14, color: '#00ffff', fontWeight: 600 }}>{t.pricing.title.w}</span>
              </div>
              <ul style={{ listStyle: 'none', marginBottom: 24 }}>
                {t.pricing.pro.features.map((f, j) => (
                  <li key={j} style={{ fontSize: 13, color: '#ccc', marginBottom: 10, paddingLeft: 20, position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 0, color: '#00ffff' }}>✓</span> {f}
                  </li>
                ))}
              </ul>
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 12, color: '#888', marginBottom: 6, fontWeight: 600 }}>{isEN ? 'Number of videos you want' : '想要多少个视频'}</div>
                <input type="number" placeholder={isEN ? 'e.g. 500' : '例如：500'} className="pay-input" min="1" id="qty-pro" />
              </div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: '#888', marginBottom: 6, fontWeight: 600 }}>{isEN ? 'Price you accept (¥)' : '你能接受的价格（元）'}</div>
                <input type="number" placeholder={isEN ? 'e.g. 999' : '例如：999'} className="pay-input" min="1" id="pay-pro" />
              </div>
              <button className="submit-price-btn"
                onClick={() => {
                  const qtyEl = document.getElementById('qty-pro') as HTMLInputElement;
                  const priceEl = document.getElementById('pay-pro') as HTMLInputElement;
                  const qty = qtyEl?.value;
                  const price = priceEl?.value;
                  if (!qty || Number(qty) <= 0) { alert(isEN ? 'Please enter number of videos' : '请输入视频数量'); return; }
                  if (!price || Number(price) <= 0) { alert(isEN ? 'Please enter your price' : '请输入你能接受的价格'); return; }
                  fetch('/api/price-submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan: 'pro', qty: Number(qty), price: Number(price) }) })
                    .then(r => r.json()).then(d => { if (d.ok) alert(isEN ? `Thanks! ${qty} videos at ¥${price} — we recorded it!` : `谢谢！${qty}个视频，¥${price}，已记录！`); else alert(d.error || (isEN ? 'Submit failed' : '提交失败')); })
                    .catch(() => alert(isEN ? 'Submit failed' : '提交失败'));
                }}>
                {t.pricing.pro.cta}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER CTA */}
      <section style={{ padding: '120px 40px', background: 'linear-gradient(180deg, #0a0015, #000)', textAlign: 'center' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(36px, 6vw, 64px)', fontWeight: 900, marginBottom: 24, letterSpacing: -1 }}>
            {t.footer.cta1} <span className="neon-text">{t.footer.cta2}</span>
          </h2>
          <p style={{ fontSize: 16, color: '#888', marginBottom: 40, lineHeight: 1.6 }}>{t.footer.cta3}</p>
          <a href="/generate" className="gradient-btn" style={{ fontSize: 16, padding: '18px 48px' }}>{t.footer.btn}</a>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ padding: '40px', background: '#000', borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
        <div style={{ fontSize: 13, color: '#444' }}>
          © 2026 web2.video · <a href="#" style={{ color: '#555' }}>{isEN ? 'Privacy' : '隐私'}</a> · <a href="#" style={{ color: '#555' }}>{isEN ? 'Terms' : '条款'}</a>
        </div>
      </footer>
    </>
  );
}
