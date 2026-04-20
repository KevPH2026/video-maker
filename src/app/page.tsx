'use client';

import { useState, useRef, useCallback } from 'react';
import Head from 'next/head';

export default function Home() {
  const [inputValue, setInputValue] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState('');
  const [resultHtml, setResultHtml] = useState<any>('');
  const [showPreview, setShowPreview] = useState(false);
  const previewRef = useRef<HTMLIFrameElement>(null);

  const handleGenerate = useCallback(async () => {
    if (!inputValue.trim() || isGenerating) return;
    setIsGenerating(true);
    setGenerationStep('分析产品信息中...');
    setResultHtml('');
    setShowPreview(false);

    try {
      const step = async (msg: string, ms: number) => {
        setGenerationStep(msg);
        await new Promise(r => setTimeout(r, ms));
      };

      await step('正在提取产品关键信息...', 800);
      await step('规划视频场景与动画编排...', 900);
      await step('渲染 HyperFrames 动画序列...', 1000);
      await step('生成最终视频预览...', 600);

      const API_KEY = 'sk-bzuzrniblkmsprdphgfhigqqokinomxcsfnwpexejboplbld';
      const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'deepseek-ai/DeepSeek-V3',
          messages: [{
            role: 'user',
            content: `你是一个专业的视频营销文案专家。用户的产品信息如下，请直接生成结构化JSON，严格使用真实数据：

产品描述：${inputValue}

直接返回JSON，从{开始，到}结束，不要任何其他文字：
{"scene1_title":"","scene1_subtitle":"","scene1_stats":["","",""],"scene2_features":[{"icon":"","title":"","desc":""},{"icon":"","title":"","desc":""},{"icon":"","title":"","desc":""}],"scene3_stats":[{"value":"","label":""},{"value":"","label":""},{"value":"","label":""}],"scene4_title":"","scene4_highlight":"","scene4_url":""}`
          }],
          stream: false,
          max_tokens: 1500,
        }),
      });

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonData = JSON.parse(jsonMatch[0]);
        setResultHtml(jsonData);
        setShowPreview(true);
      }
    } catch (error) {
      console.error(error);
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
        body { 
          background: #000; 
          color: #fff; 
          font-family: 'Inter', sans-serif; 
          overflow-x: hidden;
        }
        .glitch-text {
          position: relative;
          animation: glitch 3s infinite;
        }
        @keyframes glitch {
          0%, 90%, 100% { transform: translate(0); }
          92% { transform: translate(-2px, 1px); }
          94% { transform: translate(2px, -1px); }
          96% { transform: translate(-1px, 2px); }
          98% { transform: translate(1px, -2px); }
        }
        .neon-text {
          text-shadow: 0 0 10px #ff0080, 0 0 20px #ff0080, 0 0 40px #ff0080, 0 0 80px #ff0080;
        }
        .cyan-text {
          text-shadow: 0 0 10px #00ffff, 0 0 20px #00ffff, 0 0 40px #00ffff;
        }
        .gradient-btn {
          background: linear-gradient(135deg, #ff0080, #00ffff);
          border: none;
          padding: 16px 40px;
          border-radius: 50px;
          color: #fff;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s;
          box-shadow: 0 0 30px rgba(255, 0, 128, 0.4);
        }
        .gradient-btn:hover {
          transform: scale(1.05);
          box-shadow: 0 0 50px rgba(255, 0, 128, 0.6);
        }
        .glass-card {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 16px;
          backdrop-filter: blur(10px);
        }
        .grid-bg {
          background-image: 
            linear-gradient(rgba(255,0,128,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,0,128,0.03) 1px, transparent 1px);
          background-size: 60px 60px;
        }
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
        <button className="gradient-btn" style={{ fontSize: 13, padding: '10px 24px' }}>Try Free →</button>
      </nav>

      {/* HERO */}
      <section className="grid-bg" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '120px 40px 80px', position: 'relative', overflow: 'hidden' }}>
        {/* Diagonal burst */}
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
              {isGenerating ? 'Generating...' : 'Generate →'}
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

          {showPreview && resultHtml && (
            <div style={{ marginTop: 40 }}>
              <div style={{ fontSize: 12, color: '#00ffff', marginBottom: 8 }}>✓ Video Generated</div>
            </div>
          )}

          <div style={{ marginTop: 24, fontSize: 12, color: '#555' }}>No credit card required · Free tier available · HD export</div>
        </div>

        {/* Floating device */}
        <div style={{ position: 'absolute', right: '5%', top: '50%', transform: 'translateY(-50%)', opacity: 0.6, zIndex: 1 }}>
          <div style={{ width: 300, height: 200, border: '2px solid rgba(0,255,255,0.3)', borderRadius: 16, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 60px rgba(0,255,255,0.2)' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>▶</div>
              <div style={{ fontSize: 11, color: '#00ffff' }}>VIDEO OUTPUT</div>
            </div>
          </div>
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
                  <div style={{ fontSize: 13, color: '#00ffff', wordBreak: 'break-all', textAlign: 'left', width: '100%' }}>{inputValue}</div>
                ) : (
                  <div style={{ color: '#444', fontSize: 14 }}>Enter a URL above...</div>
                )}
              </div>
            </div>
            <div className="glass-card" style={{ padding: 32 }}>
              <div style={{ fontSize: 12, color: '#00ffff', fontWeight: 700, marginBottom: 16 }}>OUTPUT</div>
              <div style={{ background: 'rgba(0,0,0,0.5)', borderRadius: 12, padding: 16, minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(0,255,255,0.2)' }}>
                {showPreview ? (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 40, marginBottom: 8 }}>▶</div>
                    <div style={{ fontSize: 12, color: '#00ffff' }}>Video Generated</div>
                  </div>
                ) : (
                  <div style={{ color: '#444', fontSize: 14 }}>Video will appear here...</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" style={{ padding: '120px 40px', background: '#000' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 4, color: '#ff0080', textTransform: 'uppercase', marginBottom: 16, textAlign: 'center' }}>Simple Pricing</div>
          <h2 style={{ fontSize: 48, fontWeight: 900, textAlign: 'center', marginBottom: 64, letterSpacing: -1 }}>
            Start <span className="cyan-text">Free.</span><br />Scale <span className="neon-text">When Ready.</span>
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {[
              { name: 'Starter', price: 'Free', desc: 'Perfect for trying out web2.video', features: ['5 videos / month', '720p export', 'Basic templates', 'Community support'], color: '#888', cta: 'Get Started' },
              { name: 'Pro', price: '$29', period: '/mo', desc: 'For creators and marketers', features: ['100 videos / month', '1080p HD export', 'All templates', 'Priority support', 'Custom branding'], color: '#ff0080', popular: true, cta: 'Start Free Trial' },
              { name: 'Enterprise', price: 'Custom', desc: 'For teams and agencies', features: ['Unlimited videos', '4K export', 'API access', 'Dedicated support', 'Custom templates'], color: '#00ffff', cta: 'Contact Us' },
            ].map((plan, i) => (
              <div key={i} className="glass-card" style={{ padding: 32, border: plan.popular ? '2px solid #ff0080' : '1px solid rgba(255,255,255,0.1)', position: 'relative' }}>
                {plan.popular && <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg, #ff0080, #00ffff)', padding: '4px 16px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>MOST POPULAR</div>}
                <div style={{ fontSize: 12, fontWeight: 700, color: plan.color, marginBottom: 8, letterSpacing: 2 }}>{plan.name.toUpperCase()}</div>
                <div style={{ fontSize: 40, fontWeight: 900, marginBottom: 4 }}>
                  <span style={{ color: plan.color }}>{plan.price}</span>
                  {plan.period && <span style={{ fontSize: 14, color: '#666', fontWeight: 400 }}>{plan.period}</span>}
                </div>
                <p style={{ fontSize: 13, color: '#888', marginBottom: 24, lineHeight: 1.4 }}>{plan.desc}</p>
                <ul style={{ listStyle: 'none', marginBottom: 32 }}>
                  {plan.features.map((f, j) => (
                    <li key={j} style={{ fontSize: 13, color: '#ccc', marginBottom: 10, paddingLeft: 20, position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 0, color: plan.color }}>✓</span> {f}
                    </li>
                  ))}
                </ul>
                <button className="gradient-btn" style={{ width: '100%', background: plan.popular ? 'linear-gradient(135deg, #ff0080, #00ffff)' : 'transparent', border: plan.popular ? 'none' : '2px solid rgba(255,255,255,0.2)', fontSize: 14 }}>
                  {plan.cta}
                </button>
              </div>
            ))}
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
          <button className="gradient-btn" style={{ fontSize: 16, padding: '18px 48px' }}>
            Start Creating Free →
          </button>
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
