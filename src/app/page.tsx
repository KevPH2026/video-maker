'use client';

import { useState, useRef, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { renderJsonToHtml, buildPreviewHtml } from '@/lib/render';

export default function Home() {
  const [inputValue, setInputValue] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState('');
  const [resultHtml, setResultHtml] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const previewRef = useRef<HTMLIFrameElement>(null);
  const previewWinRef = useRef<Window | null>(null);

  const handleGenerate = useCallback(async () => {
    if (!inputValue.trim() || isGenerating) return;
    setIsGenerating(true);
    setGenerationStep('正在分析产品信息...');
    setResultHtml('');
    setShowPreview(false);

    try {
      setGenerationStep('正在生成视频内容...');
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: inputValue }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || '生成失败');
      }

      const data = await response.json();
      const html = data.html;

      setGenerationStep('正在渲染预览...');
      setResultHtml(html);
      setShowPreview(true);

      // Open preview window
      if (previewWinRef.current) previewWinRef.current.close();
      const win = window.open('', '_blank', 'width=1920,height=1080') as any;
      if (win) {
        win.document.write(buildPreviewHtml(html));
        win.document.close();
        previewWinRef.current = win;
      }
    } catch (error: any) {
      console.error(error);
      alert(error.message || '生成失败，请重试');
    } finally {
      setIsGenerating(false);
      setGenerationStep('');
    }
  }, [inputValue, isGenerating]);

  return (
    <>
      <Head>
        <title>web2.video — Turn Any Webpage Into Video</title>
        <meta name="description" content="AI-powered webpage to video conversion. Paste any URL and get a stunning video in seconds." />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </Head>

      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #000; color: #fff; font-family: 'Inter', sans-serif; overflow-x: hidden; }
        .glitch-text { position: relative; animation: glitch 3s infinite; }
        @keyframes glitch {
          0%, 90%, 100% { transform: translate(0); }
          92% { transform: translate(-2px, 1px); }
          94% { transform: translate(2px, -1px); }
          96% { transform: translate(-1px, 2px); }
          98% { transform: translate(1px, -2px); }
        }
        .neon-text { text-shadow: 0 0 10px #ff0080, 0 0 20px #ff0080, 0 0 40px #ff0080, 0 0 80px #ff0080; }
        .cyan-text { text-shadow: 0 0 10px #00ffff, 0 0 20px #00ffff, 0 0 40px #00ffff; }
        .gradient-btn {
          background: linear-gradient(135deg, #ff0080, #00ffff);
          border: none; padding: 16px 40px; border-radius: 50px;
          color: #fff; font-size: 16px; font-weight: 700;
          cursor: pointer; transition: all 0.3s;
          box-shadow: 0 0 30px rgba(255, 0, 128, 0.4);
        }
        .gradient-btn:hover { transform: scale(1.05); box-shadow: 0 0 50px rgba(255, 0, 128, 0.6); }
        .gradient-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        .glass-card { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; backdrop-filter: blur(10px); }
        .grid-bg {
          background-image: linear-gradient(rgba(255,0,128,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,0,128,0.03) 1px, transparent 1px);
          background-size: 60px 60px;
        }
        .pay-input {
          width: 100%; padding: 12px 16px; font-size: 20px; font-weight: 700;
          background: rgba(255,255,255,0.08); border: 2px solid rgba(0,255,255,0.3);
          border-radius: 12px; color: #00ffff; outline: none; text-align: center;
          font-family: 'Inter', sans-serif;
        }
        .pay-input:focus { border-color: #00ffff; box-shadow: 0 0 20px rgba(0,255,255,0.2); }
        .submit-price-btn {
          width: 100%; margin-top: 12px; padding: 12px;
          background: linear-gradient(135deg, #00ffff, #0080ff);
          border: none; border-radius: 12px; color: #000;
          font-size: 14px; font-weight: 700; cursor: pointer;
          transition: all 0.3s;
        }
        .submit-price-btn:hover { transform: scale(1.02); box-shadow: 0 0 30px rgba(0,255,255,0.4); }
      `}</style>

      {/* NAV */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 60px', position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, backdropFilter: 'blur(20px)', background: 'rgba(0,0,0,0.5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 24, fontWeight: 900 }} className="neon-text">web2</span>
          <span style={{ fontSize: 24, fontWeight: 300, color: '#fff' }}>.video</span>
        </div>
        <div style={{ display: 'flex', gap: 32, fontSize: 14, fontWeight: 500 }}>
          <a href="#how" style={{ color: '#aaa', textDecoration: 'none' }}>How</a>
          <a href="#features" style={{ color: '#aaa', textDecoration: 'none' }}>Features</a>
          <a href="#demo" style={{ color: '#aaa', textDecoration: 'none' }}>Demo</a>
          <a href="#pricing" style={{ color: '#aaa', textDecoration: 'none' }}>Pricing</a>
        </div>
        <a href="/generate" className="gradient-btn" style={{ fontSize: 13, padding: '10px 24px', textDecoration: 'none' }}>Try Free →</a>
      </nav>

      {/* HERO */}
      <section className="grid-bg" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '120px 40px 80px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #000 0%, transparent 40%, rgba(255,0,128,0.15) 60%, rgba(0,255,255,0.1) 80%, #000 100%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '-20%', right: '-10%', width: '80%', height: '140%', background: 'radial-gradient(ellipse at center, rgba(255,0,128,0.2) 0%, transparent 60%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-20%', left: '-10%', width: '80%', height: '140%', background: 'radial-gradient(ellipse at center, rgba(0,255,255,0.15) 0%, transparent 60%)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 2, maxWidth: 900 }}>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 4, color: '#ff0080', marginBottom: 24, textTransform: 'uppercase' }}>AI-Powered · HyperFrames Engine</div>

          <h1 className="glitch-text" style={{ fontSize: 'clamp(48px, 8vw, 96px)', fontWeight: 900, lineHeight: 1, marginBottom: 24, letterSpacing: -2 }}>
            <span className="neon-text">PASTE ANY URL.</span><br />
            <span className="cyan-text">GET A VIDEO.</span>
          </h1>

          <p style={{ fontSize: 18, color: '#aaa', marginBottom: 48, maxWidth: 560, margin: '0 auto 48px', lineHeight: 1.6 }}>
            Paste any webpage URL. Our AI extracts the content, generates a cinematic video with HyperFrames engine, and delivers stunning HD video — in under 30 seconds.
          </p>

          {/* Input */}
          <div style={{ display: 'flex', gap: 0, maxWidth: 600, margin: '0 auto', flexWrap: 'wrap', justifyContent: 'center' }}>
            <input
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              placeholder="https://yoursite.com"
              style={{ flex: 1, minWidth: 280, padding: '16px 24px', fontSize: 15, background: 'rgba(255,255,255,0.07)', border: '2px solid rgba(255,0,128,0.3)', borderRadius: '50px 0 0 50px', color: '#fff', outline: 'none', fontFamily: 'Inter' }}
              onKeyDown={e => e.key === 'Enter' && handleGenerate()}
            />
            <button
              className="gradient-btn"
              onClick={handleGenerate}
              disabled={isGenerating || !inputValue.trim()}
              style={{ borderRadius: '0 50px 50px 0', opacity: (!inputValue.trim() || isGenerating) ? 0.5 : 1 }}
            >
              {isGenerating ? '生成中...' : '开始体验 →'}
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

          <div style={{ marginTop: 24, fontSize: 12, color: '#555' }}>No credit card required · Free tier available · HD export</div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" style={{ padding: '120px 40px', background: 'linear-gradient(180deg, #000, #0a0010)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 4, color: '#ff0080', textTransform: 'uppercase', marginBottom: 16, textAlign: 'center' }}>Simple Process</div>
          <h2 style={{ fontSize: 48, fontWeight: 900, textAlign: 'center', marginBottom: 80, letterSpacing: -1 }}>
            <span className="neon-text">THREE STEPS.</span><br />
            <span style={{ color: '#fff', fontWeight: 300 }}>Zero Complexity.</span>
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {[
              { num: '01', title: 'Paste URL', desc: 'Enter any webpage URL — product page, article, landing page — anything.', color: '#ff0080' },
              { num: '02', title: 'AI Analyzes', desc: 'Our HyperFrames engine extracts key content, scenes, and visual hierarchy.', color: '#bf00ff' },
              { num: '03', title: 'Video Ready', desc: 'Download stunning HD video with cinematic transitions. Share anywhere.', color: '#00ffff' },
            ].map((step, i) => (
              <div key={i} className="glass-card" style={{ padding: 32, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${step.color}, transparent)` }} />
                <div style={{ fontSize: 64, fontWeight: 900, color: step.color, opacity: 0.3, position: 'absolute', top: -10, right: 16 }}>{step.num}</div>
                <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12, color: step.color }}>{step.title}</h3>
                <p style={{ fontSize: 14, color: '#888', lineHeight: 1.6 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" style={{ padding: '120px 40px', background: '#000' }} className="grid-bg">
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 4, color: '#00ffff', textTransform: 'uppercase', marginBottom: 16, textAlign: 'center' }}>HyperFrames Engine</div>
          <h2 style={{ fontSize: 48, fontWeight: 900, textAlign: 'center', marginBottom: 64, letterSpacing: -1 }}>
            Built for <span className="cyan-text">Speed</span> & <span className="neon-text">Quality</span>
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {[
              { icon: '⚡', title: '30-Second Export', desc: 'From URL to HD video in under 30 seconds. No waiting, no queue.' },
              { icon: '🎬', title: 'AI Scene Analysis', desc: 'Automatically identifies key content, stats, and visual hierarchy.' },
              { icon: '📐', title: 'Multi-Format', desc: 'Export in 16:9, 9:16, 1:1, and 4:5. Perfect for any platform.' },
              { icon: '🖥️', title: 'HTML5 Player', desc: 'Built-in video player with custom branding. Embed anywhere.' },
              { icon: '🔧', title: 'No Code Required', desc: 'Paste URL, click generate. No technical skills needed.' },
              { icon: '💎', title: 'HD Quality', desc: 'Crystal clear 1080p exports with cinematic transitions.' },
            ].map((f, i) => (
              <div key={i} className="glass-card" style={{ padding: 24, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 28, flexShrink: 0 }}>{f.icon}</span>
                <div>
                  <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{f.title}</h4>
                  <p style={{ fontSize: 13, color: '#888', lineHeight: 1.5 }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DEMO */}
      <section id="demo" style={{ padding: '120px 40px', background: 'linear-gradient(180deg, #000, #0a0015)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 4, color: '#bf00ff', textTransform: 'uppercase', marginBottom: 16, textAlign: 'center' }}>Live Preview</div>
          <h2 style={{ fontSize: 48, fontWeight: 900, textAlign: 'center', marginBottom: 16 }}>
            <span className="neon-text">TRY IT</span> <span style={{ fontWeight: 300 }}>Right Now</span>
          </h2>
          <p style={{ textAlign: 'center', color: '#888', marginBottom: 64, maxWidth: 480, margin: '0 auto 64px' }}>Enter any URL above and watch the AI transform it into a video in real-time.</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div className="glass-card" style={{ padding: 32 }}>
              <div style={{ fontSize: 12, color: '#ff0080', fontWeight: 700, marginBottom: 16 }}>INPUT</div>
              <div style={{ background: 'rgba(0,0,0,0.5)', borderRadius: 12, padding: 16, minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,0,128,0.2)' }}>
                {inputValue ? (
                  <div style={{ fontSize: 13, color: '#00ffff', wordBreak: 'break-all', textAlign: 'left', width: '100%', fontFamily: 'monospace' }}>{inputValue}</div>
                ) : (
                  <div style={{ color: '#444', fontSize: 14 }}>Enter a URL above...</div>
                )}
              </div>
            </div>
            <div className="glass-card" style={{ padding: 32 }}>
              <div style={{ fontSize: 12, color: '#00ffff', fontWeight: 700, marginBottom: 16 }}>OUTPUT</div>
              <div style={{ background: 'rgba(0,0,0,0.5)', borderRadius: 12, padding: 16, minHeight: 200, border: '1px solid rgba(0,255,255,0.2)', position: 'relative' }}>
                {showPreview && resultHtml ? (
                  <iframe
                    ref={previewRef}
                    style={{ width: '100%', height: 200, border: 'none', borderRadius: 8 }}
                    sandbox="allow-scripts allow-same-origin"
                    title="Video Preview"
                    srcDoc={buildPreviewHtml(resultHtml)}
                  />
                ) : isGenerating ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 168 }}>
                    <div style={{ fontSize: 32, marginBottom: 8, animation: 'pulse 1s infinite' }}>⚡</div>
                    <div style={{ fontSize: 12, color: '#00ffff' }}>{generationStep || '生成中...'}</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 168, color: '#444', fontSize: 14 }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>▶</div>
                    Video will appear here...
                  </div>
                )}
              </div>
            </div>
          </div>

          {showPreview && (
            <div style={{ textAlign: 'center', marginTop: 24 }}>
              <a href="/generate" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 32px', background: 'linear-gradient(135deg, #ff0080, #00ffff)', borderRadius: 50, color: '#fff', fontWeight: 700, fontSize: 14, textDecoration: 'none', transition: 'all 0.3s', boxShadow: '0 0 30px rgba(255,0,128,0.3)' }}>
                去制作完整视频 →
              </a>
            </div>
          )}
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" style={{ padding: '120px 40px', background: '#000' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 4, color: '#ff0080', textTransform: 'uppercase', marginBottom: 16, textAlign: 'center' }}>Simple Pricing</div>
          <h2 style={{ fontSize: 48, fontWeight: 900, textAlign: 'center', marginBottom: 16, letterSpacing: -1 }}>
            Start <span className="cyan-text">Free.</span><br /><span style={{ fontWeight: 300 }}>Pay What You Want.</span>
          </h2>
          <p style={{ textAlign: 'center', color: '#888', marginBottom: 64, maxWidth: 520, margin: '0 auto 64px', fontSize: 14 }}>
            Free tier includes 3 videos per day per IP. Paid versions — set your own price and tell us what it's worth to you.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, alignItems: 'start' }}>
            {/* Free */}
            <div className="glass-card" style={{ padding: 32, border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#888', marginBottom: 8, letterSpacing: 2 }}>FREE</div>
              <div style={{ fontSize: 40, fontWeight: 900, marginBottom: 4 }}>
                <span style={{ color: '#888' }}>$0</span>
              </div>
              <p style={{ fontSize: 13, color: '#888', marginBottom: 24, lineHeight: 1.4 }}>Try it out. No commitment.</p>
              <ul style={{ listStyle: 'none', marginBottom: 32 }}>
                {['3 videos / day / IP', '720p resolution', 'Basic templates', 'Community support'].map((f, j) => (
                  <li key={j} style={{ fontSize: 13, color: '#ccc', marginBottom: 10, paddingLeft: 20, position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 0, color: '#888' }}>✓</span> {f}
                  </li>
                ))}
              </ul>
              <a href="/generate" style={{ display: 'block', width: '100%', padding: '14px', textAlign: 'center', background: 'rgba(255,255,255,0.08)', border: '2px solid rgba(255,255,255,0.2)', borderRadius: 12, color: '#fff', fontWeight: 700, fontSize: 14, textDecoration: 'none', transition: 'all 0.3s' }}>
                Get Started Free
              </a>
            </div>

            {/* Paid v1 */}
            <div className="glass-card" style={{ padding: 32, border: '2px solid #ff0080', position: 'relative', background: 'rgba(255,0,128,0.03)' }}>
              <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg, #ff0080, #00ffff)', padding: '4px 16px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>MOST FLEXIBLE</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#ff0080', marginBottom: 8, letterSpacing: 2 }}>PAID ESSENTIALS</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 14, color: '#888', textDecoration: 'line-through' }}>$29</span>
                <span style={{ fontSize: 14, color: '#ff0080', fontWeight: 600 }}>Pay what you want</span>
              </div>
              <p style={{ fontSize: 13, color: '#888', marginBottom: 24, lineHeight: 1.4 }}>You decide what's it worth. Tell us your number.</p>
              <ul style={{ listStyle: 'none', marginBottom: 24 }}>
                {['Unlimited videos', '1080p HD export', 'All templates', 'Custom branding', 'Priority support'].map((f, j) => (
                  <li key={j} style={{ fontSize: 13, color: '#ccc', marginBottom: 10, paddingLeft: 20, position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 0, color: '#ff0080' }}>✓</span> {f}
                  </li>
                ))}
              </ul>
              <div>
                <input
                  type="number"
                  placeholder="输入你接受的价格"
                  className="pay-input"
                  min="1"
                  id="pay-essentials"
                />
                <button
                  className="submit-price-btn"
                  onClick={() => {
                    const input = document.getElementById('pay-essentials') as HTMLInputElement;
                    const price = input?.value;
                    if (!price || Number(price) <= 0) { alert('请输入有效价格'); return; }
                    fetch('/api/price-submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan: 'essentials', price: Number(price) }) })
                      .then(r => r.json())
                      .then(d => { if (d.ok) alert(`谢谢！你的价格 ¥${price} 已记录，我们会在24小时内联系你`); else alert(d.error || '提交失败'); })
                      .catch(() => alert('提交失败，请重试'));
                  }}
                >
                  提交价格
                </button>
              </div>
            </div>

            {/* Paid v2 */}
            <div className="glass-card" style={{ padding: 32, border: '1px solid rgba(0,255,255,0.3)', position: 'relative', background: 'rgba(0,255,255,0.03)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#00ffff', marginBottom: 8, letterSpacing: 2 }}>PAID PRO</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 14, color: '#888', textDecoration: 'line-through' }}>$99</span>
                <span style={{ fontSize: 14, color: '#00ffff', fontWeight: 600 }}>Pay what you want</span>
              </div>
              <p style={{ fontSize: 13, color: '#888', marginBottom: 24, lineHeight: 1.4 }}>Everything in Essentials, plus team features and API access.</p>
              <ul style={{ listStyle: 'none', marginBottom: 24 }}>
                {['Everything in Essentials', '4K export', 'Team collaboration', 'API access', 'Dedicated support', 'Custom templates'].map((f, j) => (
                  <li key={j} style={{ fontSize: 13, color: '#ccc', marginBottom: 10, paddingLeft: 20, position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 0, color: '#00ffff' }}>✓</span> {f}
                  </li>
                ))}
              </ul>
              <div>
                <input
                  type="number"
                  placeholder="输入你接受的价格"
                  className="pay-input"
                  min="1"
                  id="pay-pro"
                  style={{ borderColor: 'rgba(0,255,255,0.3)' }}
                />
                <button
                  className="submit-price-btn"
                  style={{ background: 'linear-gradient(135deg, #00ffff, #0080ff)' }}
                  onClick={() => {
                    const input = document.getElementById('pay-pro') as HTMLInputElement;
                    const price = input?.value;
                    if (!price || Number(price) <= 0) { alert('请输入有效价格'); return; }
                    fetch('/api/price-submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan: 'pro', price: Number(price) }) })
                      .then(r => r.json())
                      .then(d => { if (d.ok) alert(`谢谢！你的价格 ¥${price} 已记录，我们会在24小时内联系你`); else alert(d.error || '提交失败'); })
                      .catch(() => alert('提交失败，请重试'));
                  }}
                >
                  提交价格
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER CTA */}
      <section style={{ padding: '120px 40px', background: 'linear-gradient(180deg, #0a0015, #000)', textAlign: 'center' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(36px, 6vw, 64px)', fontWeight: 900, marginBottom: 24, letterSpacing: -1 }}>
            Ready to <span className="neon-text">Go Viral?</span>
          </h2>
          <p style={{ fontSize: 16, color: '#888', marginBottom: 40, lineHeight: 1.6 }}>
            Join thousands of creators turning webpages into viral videos. No credit card required.
          </p>
          <a href="/generate" className="gradient-btn" style={{ fontSize: 16, padding: '18px 48px', textDecoration: 'none', display: 'inline-block' }}>
            Start Creating Free →
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ padding: '40px', background: '#000', borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
        <div style={{ fontSize: 13, color: '#444' }}>
          © 2026 web2.video · <a href="#" style={{ color: '#555' }}>Privacy</a> · <a href="#" style={{ color: '#555' }}>Terms</a>
        </div>
      </footer>

      <style>{`
        @keyframes loading {
          0% { width: 0%; }
          50% { width: 100%; }
          100% { width: 0%; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @media (max-width: 768px) {
          section, nav { padding: 60px 20px !important; }
          nav { padding: 16px 20px !important; }
          nav > div:last-child { display: none; }
          h2 { font-size: 32px !important; }
          .grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  );
}
