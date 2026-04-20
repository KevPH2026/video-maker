'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { APP_VERSION } from '@/lib/version';
import { buildPreviewHtml } from '@/lib/render';

const EXAMPLE_PRODUCTS = [
  { name: '智能手表 Pro X', category: '消费电子', price: '$399', market: '北美/欧洲', description: '心率/GPS/防水/7天续航，适合运动人群' },
  { name: '便携储能电源', category: '户外装备', price: '$599', market: '北美/日本', description: '1000Wh大容量，支持太阳能充电，适合露营/应急' },
  { name: '空气净化器 Mini', category: '家居家电', price: '$129', market: '欧洲/东南亚', description: 'HEPA滤网/静音/智能联动，适合小户型' },
];

export default function Generate() {
  const [mode, setMode] = useState<'chat' | 'form'>('form');
  const [formData, setFormData] = useState({ name: '', tagline: '', features: '', price: '', market: '', description: '' });
  const [htmlContent, setHtmlContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [activeExample, setActiveExample] = useState(0);
  const [previewUrl, setPreviewUrl] = useState('');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const previewWindowRef = useRef<Window | null>(null);

  // Build structured JSON prompt - AI returns JSON, we render to template
  const buildStructuredPrompt = (data: typeof formData) => {
    const name = data.name || '';
    const tagline = data.tagline || '';
    const features = data.features || '';
    const price = data.price || '';
    const market = data.market || '';
    const description = data.description || '';

    return `你是一个专业的视频营销文案专家。用户的产品信息如下，请直接生成结构化JSON：

产品名称：${name}
品牌定位：${tagline}
核心功能：${features}
价格：${price}
目标市场：${market}
产品描述：${description}

要求：严格使用上面的真实数据，不要生成任何"示例"、"测试"、"占位符"内容。如果价格是$399，scene1_stats里就要写399相关的内容。如果是美国市场，scene3_stats就要体现美国市场数据。

直接返回JSON，从{开始，到}结束，不要任何其他文字：
{"scene1_title":"","scene1_subtitle":"","scene1_stats":["","",""],"scene2_features":[{"icon":"","title":"","desc":""},{"icon":"","title":"","desc":""},{"icon":"","title":"","desc":""}],"scene3_stats":[{"value":"","label":""},{"value":"","label":""},{"value":"","label":""}],"scene4_title":"","scene4_highlight":"","scene4_url":""}`;
  };

  // Render structured JSON to HyperFrames HTML template
  const renderJsonToHtml = (json: any): string => {
    // Always prefer AI result, but fall back to user's actual form data
    const title = json.scene1_title || formData.name || '产品名称';
    const subtitle = json.scene1_subtitle || formData.tagline || '';
    const s1Stats = (json.scene1_stats && json.scene1_stats.length > 0
      ? json.scene1_stats
      : [formData.price ? `价格 ${formData.price}` : '高品质产品', formData.market || '全球市场', '创新科技']
    ).map((s: string) => {
      const match = s.match(/^([0-9a-zA-Z$%°米㎡㎡万一台次个]+(?:[\u4e00-\u9fa5]|[a-zA-Z])*)\s*[-–—:]?\s*(.*)$/);
      const num = match ? match[1] : s;
      const label = match && match[2] ? match[2] : '';
      return `<div style="text-align:center"><div style="font-size:56px;font-weight:900;color:#f59e0b;line-height:1">${num}</div>${label ? `<div style="font-size:14px;color:#64748b;margin-top:8px;letter-spacing:2px">${label}</div>` : ''}</div>`;
    }).join('');

    const features = (json.scene2_features && json.scene2_features.length > 0
      ? json.scene2_features
      : [
          { icon: '🌐', title: '全球覆盖', desc: formData.market || '面向全球市场' },
          { icon: '⚡', title: '高效便捷', desc: formData.features || '卓越品质' },
          { icon: '🎯', title: '精准定位', desc: formData.price ? `价格: ${formData.price}` : '性价比高' },
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
          { value: formData.price || '$399', label: '价格' },
          { value: formData.market || '全球', label: '目标市场' },
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
<div class="s s4"><div class="c1">${json.scene4_title || title}<br><span>${json.scene4_highlight || (formData.price ? `¥${formData.price}` : '立即体验')}</span></div><div class="c2">${json.scene4_url || (formData.market ? `www.${formData.market.toLowerCase().replace(/[^a-z]/g,'')}.com` : 'www.example.com')}</div></div>
</div>
<script>
window.__timelines=window.__timelines||{};
const tl=gsap.timeline({paused:false});
// ambient glow
tl.to('.glow',{scale:1.15,opacity:0.55,duration:3.5,ease:'sine.inOut',yoyo:true,repeat:5},0);
// S1
tl.to('.s1',{opacity:1,duration:0.5,ease:'power2.out'},0.3);
tl.from('.t1',{scale:0.8,opacity:0,duration:1,ease:'elastic.out(1,0.5)'},0.6);
tl.from('.t2',{y:30,opacity:0,duration:0.8,ease:'power3.out'},1.1);
tl.from('.s1 > div:last-child > div',{y:40,opacity:0,stagger:0.2,duration:0.7,ease:'power3.out'},1.5);
// S1→S2
tl.to('.s1',{opacity:0,filter:'blur(10px)',duration:0.35,ease:'power2.in'},4.8);
tl.from('.s2',{opacity:0,filter:'blur(10px)',duration:0.35,ease:'power2.out'},5.1);
// S2
tl.to('.s2',{opacity:1,duration:0.3},5.3);
tl.from('.s2 > div > div',{y:80,opacity:0,stagger:0.2,duration:0.85,ease:'back.out(1.1)'},5.5);
// S2→S3
tl.to('.s2',{x:'-100%',opacity:0,duration:0.4,ease:'power4.in'},10.0);
tl.from('.s3',{x:'100%',opacity:0,duration:0.4,ease:'power4.out'},10.05);
// S3
tl.to('.s3',{opacity:1,duration:0.3},10.5);
tl.from('.s3 > div > div',{y:40,opacity:0,stagger:0.2,duration:0.8,ease:'back.out(1.3)'},10.8);
// S3→S4
tl.to('.s3',{scale:1.1,opacity:0,duration:0.4,ease:'power4.in'},15.5);
tl.from('.s4',{scale:0.85,opacity:0,duration:0.5,ease:'power3.out'},15.55);
// S4
tl.to('.s4',{opacity:1,duration:0.3},16.0);
tl.from('.c1',{y:60,opacity:0,duration:1,ease:'power3.out'},16.3);
tl.from('.c2',{scale:0.8,opacity:0,duration:0.8,ease:'back.out(1.4)'},17.1);
// final fade
tl.to('.s4',{opacity:0,duration:1.5,ease:'power2.in'},21.0);
window.__timelines["comp"]=tl;
</script>
</body>
</html>`;
  };

  const generateVideo = useCallback(async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setError('');
    setStatus('正在分析产品信息...');
    setHtmlContent('');
    setShowPreview(false);

    try {
      const key = 'sk-bzuzrniblkmsprdphgfhigqqokinomxcsfnwpexejboplbld';
      const prompt = mode === 'form' ? buildStructuredPrompt(formData) : `你是一个视频营销策划师。根据产品描述生成结构化JSON，直接返回JSON：${formData.features}`;

      setStatus('正在生成视频内容...');
      const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'Pro/MiniMaxAI/MiniMax-M2.5',
          messages: [{ role: 'user', content: prompt }],
          stream: false,
          max_tokens: 3000,
        }),
      });

      if (!response.ok) throw new Error(`API错误: ${response.status}`);
      const data = await response.json();
      let raw = data.choices?.[0]?.message?.content || '';

      // Extract JSON from response
      let json: any = {};
      try {
        // Try direct parse
        json = JSON.parse(raw);
      } catch {
        // Try extracting JSON block
        const match = raw.match(/\{[\s\S]*\}/);
        if (match) {
          try { json = JSON.parse(match[0]); } catch {}
        }
      }

      if (!json || Object.keys(json).length === 0) {
        throw new Error('AI返回格式无效，请重试');
      }

      setStatus('正在渲染视频 Animation...');
      const html = renderJsonToHtml(json);
      setHtmlContent(html);
      const previewHtml = buildPreviewHtml(html);
      // Set inline preview immediately (no popup)
      setShowPreview(true);
      setTimeout(() => {
        if (iframeRef.current) iframeRef.current.srcdoc = previewHtml;
      }, 50);

      setStatus('✅ 视频已生成！点击「录制下载」开始录制');
    } catch (err: any) {
      setError(err.message);
      setStatus('');
    } finally {
      setIsGenerating(false);
    }
  }, [formData, mode]);

  const startRecording = useCallback(() => {
    if (!htmlContent || isRecording) return;
    setIsRecording(true);
    setRecordingProgress(0);
    chunksRef.current = [];

    // Try to capture the preview window via desktopCapture
    // Fallback: use the iframe stream
    let stream: MediaStream | null = null;

    navigator.mediaDevices?.getDisplayMedia?.({ video: { width: 1920, height: 1080 }, audio: false } as any)
      .then(displayStream => {
        stream = displayStream;
        const recorder = new MediaRecorder(stream!, { mimeType: 'video/webm;codecs=vp9' });
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = e => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };

        recorder.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `videoai-${Date.now()}.webm`;
          a.click();
          URL.revokeObjectURL(url);
          stream?.getTracks().forEach(t => t.stop());
          setIsRecording(false);
          setRecordingProgress(0);
          if (timerRef.current) clearInterval(timerRef.current);
        };

        // Record for ~23 seconds (a bit more than the 22s composition)
        recorder.start();
        let elapsed = 0;
        timerRef.current = setInterval(() => {
          elapsed += 0.5;
          setRecordingProgress(Math.min(100, (elapsed / 23) * 100));
          if (elapsed >= 23) {
            clearInterval(timerRef.current!);
            recorder.stop();
          }
        }, 500);
      })
      .catch(err => {
        setError(`录制失败: ${err.message}。请选择要录制的窗口/屏幕。`);
        setIsRecording(false);
      });
  }, [htmlContent]);

  const useExample = (ex: typeof EXAMPLE_PRODUCTS[0]) => {
    setFormData({
      name: ex.name,
      tagline: `「${ex.description}」专属体验`,
      features: `${ex.description}。目标市场：${ex.market}。价格：${ex.price}。`,
      price: ex.price,
      market: ex.market,
      description: ex.description,
    });
  };

  // Read URL params on mount to pre-fill from example links
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const name = params.get('name');
    const tagline = params.get('tagline');
    if (name || tagline) {
      setFormData(prev => ({
        ...prev,
        name: name || prev.name,
        tagline: tagline || prev.tagline,
        description: tagline || prev.description,
        features: tagline || prev.features,
      }));
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <Head><title>VideoAI · 生成视频</title></Head>

      {/* Header */}
      <header className="border-b border-white/5 px-6 h-16 flex items-center justify-between shrink-0 bg-slate-950/80 backdrop-blur-xl z-20">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-black text-slate-950 text-sm">V</div>
          <span className="font-bold text-lg tracking-tight">VideoAI</span>
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <a
            href="https://vercel.com/kevph2026s-projects/video-maker/deployments"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/50 text-slate-400 hover:text-amber-400 hover:border-amber-500/40 transition-all"
            title="查看版本迭代历史"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span className="text-xs font-medium">v{APP_VERSION}</span>
          </a>
          <Link href="/" className="text-slate-400 hover:text-white transition-colors">返回首页</Link>
        </div>
      </header>

      {/* Main */}
      <div className="flex-1 flex overflow-hidden">

        {/* Left Panel: Input */}
        <div className="w-[420px] shrink-0 border-r border-white/5 flex flex-col overflow-hidden">
          <div className="p-5 border-b border-white/5 flex gap-2">
            <button
              onClick={() => setMode('form')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${mode === 'form' ? 'bg-amber-500 text-slate-950' : 'bg-slate-900 text-slate-400 hover:text-white'}`}
            >
              📋 结构化录入
            </button>
            <button
              onClick={() => setMode('chat')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${mode === 'chat' ? 'bg-amber-500 text-slate-950' : 'bg-slate-900 text-slate-400 hover:text-white'}`}
            >
              💬 描述生成
            </button>
          </div>

          {mode === 'form' ? (
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-medium">产品名称 *</label>
                <input value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} placeholder="例如：智能手表 Pro X" className="w-full px-3.5 py-2.5 bg-slate-900/80 border border-slate-700/50 rounded-xl text-sm placeholder-slate-600 focus:outline-none focus:border-amber-500/50 transition-all" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-medium">品牌定位 / 一句话描述</label>
                <input value={formData.tagline} onChange={e => setFormData(p => ({ ...p, tagline: e.target.value }))} placeholder="例如：运动爱好者的贴身智能助手" className="w-full px-3.5 py-2.5 bg-slate-900/80 border border-slate-700/50 rounded-xl text-sm placeholder-slate-600 focus:outline-none focus:border-amber-500/50 transition-all" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-medium">核心功能（用逗号分隔）</label>
                <input value={formData.features} onChange={e => setFormData(p => ({ ...p, features: e.target.value }))} placeholder="例如：心率监测、GPS定位、防水50米、续航7天" className="w-full px-3.5 py-2.5 bg-slate-900/80 border border-slate-700/50 rounded-xl text-sm placeholder-slate-600 focus:outline-none focus:border-amber-500/50 transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 font-medium">价格</label>
                  <input value={formData.price} onChange={e => setFormData(p => ({ ...p, price: e.target.value }))} placeholder="$399" className="w-full px-3.5 py-2.5 bg-slate-900/80 border border-slate-700/50 rounded-xl text-sm placeholder-slate-600 focus:outline-none focus:border-amber-500/50 transition-all" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 font-medium">目标市场</label>
                  <input value={formData.market} onChange={e => setFormData(p => ({ ...p, market: e.target.value }))} placeholder="北美、欧洲" className="w-full px-3.5 py-2.5 bg-slate-900/80 border border-slate-700/50 rounded-xl text-sm placeholder-slate-600 focus:outline-none focus:border-amber-500/50 transition-all" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-medium">产品描述（详细说明）</label>
                <textarea value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} placeholder="描述产品的独特卖点、适用场景、竞争优势..." rows={3} className="w-full px-3.5 py-2.5 bg-slate-900/80 border border-slate-700/50 rounded-xl text-sm placeholder-slate-600 focus:outline-none focus:border-amber-500/50 transition-all resize-none" />
              </div>

              {/* Examples */}
              <div>
                <p className="text-xs text-slate-500 mb-2">试试这些示例产品：</p>
                <div className="space-y-2">
                  {EXAMPLE_PRODUCTS.map((ex, i) => (
                    <button key={i} onClick={() => useExample(ex)} className="w-full text-left px-3.5 py-2.5 bg-slate-900/60 border border-slate-800/60 rounded-xl hover:border-slate-700/60 transition-all">
                      <div className="text-sm text-slate-200 font-medium">{ex.name}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{ex.description}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-5">
              <textarea
                value={formData.features}
                onChange={e => setFormData(p => ({ ...p, features: e.target.value }))}
                placeholder={"描述你的视频需求，例如：\n\n做一个30秒产品介绍视频，活泼风格，目标市场是北美年轻人，售价$299，特点是轻便、多颜色选择、智能联动..."}
                rows={10}
                className="w-full px-3.5 py-3 bg-slate-900/80 border border-slate-700/50 rounded-xl text-sm placeholder-slate-600 focus:outline-none focus:border-amber-500/50 transition-all resize-none leading-relaxed"
              />
            </div>
          )}

          {/* Bottom action */}
          <div className="p-5 border-t border-white/5 space-y-3">
            {status && (
              <div className="text-xs text-amber-400 bg-amber-500/10 rounded-lg px-3 py-2">
                {status}
              </div>
            )}
            {error && (
              <div className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button
              onClick={generateVideo}
              disabled={isGenerating || (mode === 'form' && !formData.name.trim())}
              className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:from-slate-800 disabled:to-slate-800 disabled:cursor-not-allowed text-slate-950 font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-slate-950/30 border-t-slate-950 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  {mode === 'form' ? '生成视频预览' : '描述生成视频'}
                </>
              )}
            </button>

            {htmlContent && (
              <button
                onClick={startRecording}
                disabled={isRecording}
                className="w-full py-3.5 bg-red-500 hover:bg-red-400 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2"
              >
                {isRecording ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    录制中... {Math.round(recordingProgress)}%
                  </>
                ) : (
                  <>
                    <div className="w-4 h-4 rounded-full bg-white" />
                    录制 & 下载视频
                  </>
                )}
              </button>
            )}

            <p className="text-xs text-slate-600 text-center">
              {htmlContent ? '视频已生成，可预览或录制下载' : '填写信息后点击生成，AI 自动编排动画'}
            </p>
          </div>
        </div>

        {/* Right Panel: Preview */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 py-2.5 border-b border-white/5 bg-slate-900/30 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-slate-600" />
              <span className="text-xs text-slate-400 font-medium">视频预览 {htmlContent ? '✅ 已就绪' : ''}</span>
            </div>
            {htmlContent && !showPreview && (
              <button onClick={() => setShowPreview(true)} className="text-xs text-amber-400 hover:text-amber-300 transition-colors">
                显示预览 →
              </button>
            )}
          </div>

          <div className="flex-1 bg-slate-950 relative">
            {!showPreview || !htmlContent ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
                <div className="w-16 h-16 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-center text-2xl mb-4">
                  🎬
                </div>
                <div className="text-slate-400 text-sm mb-1">视频预览区</div>
                <div className="text-slate-600 text-xs">
                  {htmlContent ? '点击「显示预览」查看' : '填写左侧信息并点击「生成视频预览」'}
                </div>
                {htmlContent && (
                  <button
                    onClick={() => setShowPreview(true)}
                    className="mt-4 px-6 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm rounded-xl transition-all"
                  >
                    打开预览
                  </button>
                )}
              </div>
            ) : (
              <iframe
                ref={iframeRef}
                className="w-full h-full border-0"
                sandbox="allow-scripts allow-same-origin"
                title="Video Preview"
              />
            )}
          </div>

          {htmlContent && (
            <div className="px-4 py-3 border-t border-white/5 bg-slate-900/30 flex items-center justify-between gap-3 shrink-0">
              <div className="text-xs text-slate-500">
                22秒 · GSAP动画 · 点击录制后选择要录的窗口
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const html = buildPreviewHtml(htmlContent);
                    const blob = new Blob([html], { type: 'text/html' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'videoai-composition.html';
                    a.click();
                  }}
                  className="px-3 py-1.5 border border-slate-700 rounded-lg text-xs text-slate-400 hover:text-white hover:border-slate-600 transition-all"
                >
                  导出HTML
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
