'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { APP_VERSION } from '@/lib/version';
import { buildPreviewHtml } from '@/lib/render';
import { supabase } from '@/lib/supabase';

const EXAMPLE_PRODUCTS = [
  { name: '智能手表 Pro X', category: '消费电子', price: '$399', market: '北美/欧洲', description: '心率/GPS/防水/7天续航，适合运动人群' },
  { name: '便携储能电源', category: '户外装备', price: '$599', market: '北美/日本', description: '1000Wh大容量，支持太阳能充电，适合露营/应急' },
  { name: '空气净化器 Mini', category: '家居家电', price: '$129', market: '欧洲/东南亚', description: 'HEPA滤网/静音/智能联动，适合小户型' },
];

// Chat message type
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  json?: any;
}

export default function Generate() {
  const [mode, setMode] = useState<'chat' | 'form' | 'url'>('form');
  const [formData, setFormData] = useState({ name: '', tagline: '', features: '', price: '', market: '', description: '' });
  const [htmlContent, setHtmlContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const [isRenderingMp4, setIsRenderingMp4] = useState(false);
  const [mp4Url, setMp4Url] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [authChecked, setAuthChecked] = useState(false);
  const [scrapeUrl, setScrapeUrl] = useState('');
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeMsg, setScrapeMsg] = useState('');
  const [userEmail, setUserEmail] = useState('');

  // Chat mode state
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [lastJson, setLastJson] = useState<any>(null);
  const [showJsonEditor, setShowJsonEditor] = useState(false);
  const [editedJson, setEditedJson] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const RENDER_API = 'https://video-maker-production-4372.up.railway.app';

  const handleScrapeUrl = async () => {
    if (!scrapeUrl.trim()) return;
    setIsScraping(true);
    setScrapeMsg('🌐 正在抓取网页内容...');
    setError('');
    try {
      const res = await fetch('/api/scrape-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: scrapeUrl }),
      });
      const data = await res.json();
      if (!data.success) {
        setScrapeMsg('');
        setError(data.error || '抓取失败');
        return;
      }
      const name = data.brand && data.title
        ? `${data.brand} ${data.title}`.trim()
        : (data.title || '');
      const features = (data.features || []).slice(0, 5).join('、');
      setFormData(prev => ({
        ...prev,
        name: name || prev.name,
        tagline: data.description ? data.description.substring(0, 60) : prev.tagline,
        features: features || prev.features,
        price: data.price || prev.price,
        description: data.description || prev.description,
      }));
      setScrapeMsg(`✅ 抓取成功！已填充：${name || data.title || '产品信息'}`);
      setMode('form');
    } catch (e: any) {
      setScrapeMsg('');
      setError(e.message || '抓取失败，请稍后重试');
    } finally {
      setIsScraping(false);
    }
  };

  const renderToServerMp4 = useCallback(async () => {
    if (!htmlContent || isRenderingMp4) return;
    setIsRenderingMp4(true);
    setError('');
    setStatus('🎬 正在服务器渲染 MP4，预计 20-30 秒...');
    try {
      const response = await fetch(`${RENDER_API}/render`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          html: htmlContent,
          duration: 22,
          width: 1920,
          height: 1080,
        }),
      });
      const data = await response.json();
      if (data.success) {
        const mp4FullUrl = `${RENDER_API}${data.videoUrl}`;
        setMp4Url(mp4FullUrl);
        setStatus('✅ MP4 渲染完成，点击下方按钮下载');
        const a = document.createElement('a');
        a.href = mp4FullUrl;
        a.download = `videoai-${Date.now()}.mp4`;
        a.click();
      } else {
        throw new Error(data.error || '渲染失败');
      }
    } catch (err: any) {
      setError(`服务器渲染失败: ${err.message}`);
      setStatus('');
    } finally {
      setIsRenderingMp4(false);
    }
  }, [htmlContent, isRenderingMp4]);

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

  // Chat mode prompt builder
  const buildChatPrompt = (history: ChatMessage[], newMessage: string) => {
    const context = history.length > 0
      ? `\n【对话历史】\n${history.map(m => `${m.role === 'user' ? '用户' : '助手'}：${m.content}`).join('\n')}\n\n【要求】根据以上对话历史和用户的最新输入，生成符合用户意图的结构化JSON。只返回JSON，不要其他文字。JSON格式：`
      : '\n【要求】根据用户输入，生成结构化JSON。只返回JSON，不要其他文字。JSON格式：';

    return `你是一个专业的视频营销文案专家。

${context}
{"scene1_title":"","scene1_subtitle":"","scene1_stats":["数值/关键词","数值/关键词","数值/关键词"],"scene2_features":[{"icon":"emoji","title":"功能标题","desc":"功能描述"},{"icon":"emoji","title":"功能标题","desc":"功能描述"},{"icon":"emoji","title":"功能标题","desc":"功能描述"}],"scene3_stats":[{"value":"数值","label":"标签"},{"value":"数值","label":"标签"},{"value":"数值","label":"标签"}],"scene4_title":"CTA标题","scene4_highlight":"核心卖点","scene4_url":"网站域名"}

用户最新输入：${newMessage}`;
  };

  // Render structured JSON to HyperFrames HTML template
  const renderJsonToHtml = (json: any, fallbackData?: any): string => {
    const title = json.scene1_title || fallbackData?.name || '产品名称';
    const subtitle = json.scene1_subtitle || fallbackData?.tagline || '';
    const s1Stats = (json.scene1_stats && json.scene1_stats.length > 0
      ? json.scene1_stats
      : [fallbackData?.price ? `价格 ${fallbackData.price}` : '高品质产品', fallbackData?.market || '全球市场', '创新科技']
    ).map((s: string) => {
      const match = s.match(/^([0-9a-zA-Z$%°米㎡万一台次个]+(?:[\u4e00-\u9fa5]|[a-zA-Z])*)\s*[-–—:]?\s*(.*)$/);
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
  };

  // Core function: call AI and render video
  const callAIAndRender = useCallback(async (prompt: string, fallbackData?: any) => {
    setStatus('正在分析产品信息...');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer sk-bzuzrniblkmsprdphgfhigqqokinomxcsfnwpexejboplbld`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'deepseek-ai/DeepSeek-V3',
        messages: [{ role: 'user', content: prompt }],
        stream: false,
        max_tokens: 2500,
      }),
      signal: controller.signal as any,
    });
    clearTimeout(timeout);

    if (!response.ok) throw new Error(`API错误: ${response.status}`);
    const data = await response.json();
    let raw = data.choices?.[0]?.message?.content || '';

    raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    let json: any = {};
    try {
      json = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        try { json = JSON.parse(match[0]); } catch { }
      }
    }

    if (!json || Object.keys(json).length === 0) {
      throw new Error('AI返回格式无效，请重试');
    }

    return json;
  }, []);

  // Apply JSON to render video
  const applyJsonAndRender = useCallback((json: any, fallbackData?: any) => {
    setStatus('正在渲染视频 Animation...');
    const html = renderJsonToHtml(json, fallbackData);
    setHtmlContent(html);
    const previewHtml = buildPreviewHtml(html);
    setShowPreview(true);
    setTimeout(() => {
      if (iframeRef.current) iframeRef.current.srcdoc = previewHtml;
    }, 50);
    setLastJson(json);
    setEditedJson(JSON.stringify(json, null, 2));
    setStatus('✅ 视频已生成！可以编辑JSON重新生成，或直接录制下载');
  }, []);

  // Form mode: generate video
  const generateVideo = useCallback(async () => {
    if (isGenerating) return;
    if ((mode === 'form' || mode === 'url') && !formData.name.trim()) {
      setError('请填写产品名称');
      return;
    }
    setIsGenerating(true);
    setError('');
    setStatus('');
    setHtmlContent('');
    setShowPreview(false);

    try {
      const prompt = mode === 'form' ? buildStructuredPrompt(formData) : buildStructuredPrompt(formData);
      const json = await callAIAndRender(prompt, formData);
      applyJsonAndRender(json, formData);
    } catch (err: any) {
      console.error('AI generation failed:', err.message);
      const fallbackJson = {
        scene1_title: formData.name || '产品名称',
        scene1_subtitle: formData.tagline || formData.features || '卓越品质',
        scene1_stats: ['🔥', '⚡', '💎'],
        scene2_features: [
          { icon: '⚡', title: '核心功能', desc: formData.features || '高品质体验' },
          { icon: '🔋', title: '持久续航', desc: '长时使用无忧' },
          { icon: '💎', title: '卓越品质', desc: '专业值得信赖' },
        ],
        scene3_stats: [
          { value: formData.price || '$99', label: formData.market || '全球' },
          { value: '⭐⭐⭐⭐⭐', label: '用户好评' },
          { value: '24/7', label: '售后支持' },
        ],
        scene4_title: '立即购买',
        scene4_highlight: formData.tagline || '',
        scene4_url: '#',
      };
      applyJsonAndRender(fallbackJson, formData);
      setError('');
    } finally {
      setIsGenerating(false);
    }
  }, [formData, mode, isGenerating, callAIAndRender, applyJsonAndRender]);

  // Chat mode: send message
  const sendChatMessage = useCallback(async () => {
    if (!chatInput.trim() || isGenerating) return;
    const userMsg = chatInput.trim();
    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsGenerating(true);
    setError('');
    setStatus('');
    setHtmlContent('');
    setShowPreview(false);

    try {
      setStatus('AI 构思中...');
      const prompt = buildChatPrompt(chatHistory, userMsg);
      const json = await callAIAndRender(prompt, formData);
      const assistantMsg = JSON.stringify(json, null, 2);
      setChatHistory(prev => [...prev, { role: 'assistant', content: assistantMsg, json }]);
      applyJsonAndRender(json, formData);
    } catch (err: any) {
      console.error('Chat generation failed:', err.message);
      setChatHistory(prev => [...prev, { role: 'assistant', content: `生成失败: ${err.message}` }]);
      setError(err.message);
    } finally {
      setIsGenerating(false);
      setStatus('');
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [chatInput, isGenerating, chatHistory, formData, callAIAndRender, applyJsonAndRender]);

  // Apply edited JSON and re-render
  const applyEditedJson = useCallback(() => {
    try {
      const json = JSON.parse(editedJson);
      setShowJsonEditor(false);
      applyJsonAndRender(json, formData);
    } catch (e: any) {
      setError(`JSON格式错误: ${e.message}`);
    }
  }, [editedJson, applyJsonAndRender]);

  const startRecording = useCallback(() => {
    if (!htmlContent || isRecording) return;
    setIsRecording(true);
    setRecordingProgress(0);
    chunksRef.current = [];

    navigator.mediaDevices?.getDisplayMedia?.({ video: { width: 1920, height: 1080 }, audio: false } as any)
      .then(displayStream => {
        const recorder = new MediaRecorder(displayStream, { mimeType: 'video/webm;codecs=vp9' });
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
          displayStream.getTracks().forEach(t => t.stop());
          setIsRecording(false);
          setRecordingProgress(0);
          if (timerRef.current) clearInterval(timerRef.current);
        };

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
  }, [htmlContent, isRecording]);

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

  // Auth check
  useEffect(() => {
    if (typeof window === 'undefined') return;
    supabase.auth.getUser().then((result) => {
      const user = result.data?.user;
      if (!user) {
        const currentUrl = window.location.href;
        window.location.href = `/login?redirect=${encodeURIComponent(currentUrl)}`;
      } else {
        setUserEmail(user.email || '');
        setAuthChecked(true);
      }
    });
  }, []);

  // URL params pre-fill
  useEffect(() => {
    if (typeof window === 'undefined' || !authChecked) return;
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
  }, [authChecked]);

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
          {userEmail && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/50 text-slate-400 text-xs">
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#00ff88', display: 'inline-block' }} />
              {userEmail}
            </div>
          )}
          <button
            onClick={async () => { await supabase.auth.signOut(); window.location.href = '/login'; }}
            className="px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/50 text-slate-400 hover:text-white hover:border-slate-500 transition-all text-xs cursor-pointer"
          >
            退出
          </button>
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
              💬 描述
            </button>
            <button
              onClick={() => setMode('url')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${mode === 'url' ? 'bg-amber-500 text-slate-950' : 'bg-slate-900 text-slate-400 hover:text-white'}`}
            >
              🔗 URL
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
          ) : mode === 'url' ? (
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="bg-gradient-to-br from-slate-900 to-slate-800/80 rounded-2xl p-5 border border-slate-700/30">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">🔗</span>
                  <span className="font-bold text-white">URL 智能抓取</span>
                </div>
                <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                  粘贴任意产品页链接，自动解析：标题、价格、功能特点、品牌信息，直接填充表单生成视频。
                </p>
                <div className="flex gap-2">
                  <input
                    value={scrapeUrl}
                    onChange={e => setScrapeUrl(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleScrapeUrl()}
                    placeholder="https://..."
                    className="flex-1 px-3.5 py-2.5 bg-slate-950/80 border border-slate-700/50 rounded-xl text-sm placeholder-slate-600 focus:outline-none focus:border-amber-500/50 transition-all"
                  />
                  <button
                    onClick={handleScrapeUrl}
                    disabled={isScraping || !scrapeUrl.trim()}
                    className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed text-slate-950 font-bold text-sm rounded-xl transition-all whitespace-nowrap"
                  >
                    {isScraping ? '抓取中...' : '抓取'}
                  </button>
                </div>
                {scrapeMsg && (
                  <div className={`mt-3 text-xs px-3 py-2 rounded-lg ${scrapeMsg.includes('✅') ? 'bg-green-500/15 text-green-400' : 'bg-amber-500/10 text-amber-400'}`}>
                    {scrapeMsg}
                  </div>
                )}
                {error && (
                  <div className="mt-3 text-xs px-3 py-2 rounded-lg bg-red-500/10 text-red-400">
                    {error}
                  </div>
                )}
              </div>

              <div className="bg-slate-900/50 rounded-2xl p-4 border border-slate-800/40">
                <p className="text-xs text-slate-400 mb-2 font-medium">支持的网站类型</p>
                <div className="flex flex-wrap gap-2">
                  {['Amazon', 'AliExpress', 'Shopify店铺', '独立站', '淘宝/天猫', '产品博客'].map(s => (
                    <span key={s} className="text-xs px-2.5 py-1 bg-slate-800/80 rounded-lg text-slate-400 border border-slate-700/40">{s}</span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Chat Mode */
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Chat history */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {chatHistory.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-center px-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-center text-xl mb-3">💬</div>
                    <div className="text-slate-400 text-sm mb-1">对话式生成</div>
                    <div className="text-slate-600 text-xs leading-relaxed max-w-[260px]">
                      用自然语言描述你的产品，AI会自动构思视频内容，可以多轮对话优化
                    </div>
                  </div>
                )}
                {chatHistory.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${msg.role === 'user'
                      ? 'bg-amber-500/20 border border-amber-500/30 text-amber-100 rounded-br-sm'
                      : 'bg-slate-800/80 border border-slate-700/50 text-slate-300 rounded-bl-sm'
                    }`}>
                      {msg.role === 'assistant' && !msg.json ? (
                        <div className="text-red-300 text-xs">{msg.content}</div>
                      ) : msg.role === 'assistant' && msg.json ? (
                        <div>
                          <div className="text-slate-400 text-xs mb-1.5">🎬 AI 已生成视频结构</div>
                          <div className="text-slate-300 text-xs leading-relaxed space-y-1">
                            <div>📌 <span className="text-white font-medium">{msg.json.scene1_title}</span></div>
                            <div>💬 {msg.json.scene1_subtitle}</div>
                            {msg.json.scene2_features?.map((f: any, fi: number) => (
                              <div key={fi}>⚡ {f.title} — {f.desc}</div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="text-slate-200">{msg.content}</div>
                      )}
                    </div>
                  </div>
                ))}
                {isGenerating && chatHistory[chatHistory.length - 1]?.role !== 'assistant' && (
                  <div className="flex justify-start">
                    <div className="bg-slate-800/80 border border-slate-700/50 rounded-2xl rounded-bl-sm px-3.5 py-2.5">
                      <div className="flex items-center gap-1.5 text-slate-400 text-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                        {status || 'AI 生成中...'}
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat input */}
              <div className="p-4 border-t border-white/5">
                <div className="flex gap-2">
                  <input
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendChatMessage()}
                    placeholder="描述你的产品视频需求..."
                    disabled={isGenerating}
                    className="flex-1 px-3.5 py-2.5 bg-slate-900/80 border border-slate-700/50 rounded-xl text-sm placeholder-slate-600 focus:outline-none focus:border-amber-500/50 transition-all disabled:opacity-50"
                  />
                  <button
                    onClick={sendChatMessage}
                    disabled={isGenerating || !chatInput.trim()}
                    className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed text-slate-950 font-bold text-sm rounded-xl transition-all whitespace-nowrap"
                  >
                    {isGenerating ? '⏳' : '→'}
                  </button>
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => { setChatHistory([]); setHtmlContent(''); setShowPreview(false); setLastJson(null); }}
                    className="text-xs text-slate-600 hover:text-slate-400 transition-colors"
                    disabled={chatHistory.length === 0}
                  >
                    清空对话
                  </button>
                  {chatHistory.length > 0 && (
                    <button
                      onClick={() => { const lastAssistant = [...chatHistory].reverse().find(m => m.role === 'assistant' && m.json); if (lastAssistant?.json) { setEditedJson(JSON.stringify(lastAssistant.json, null, 2)); setShowJsonEditor(true); } }}
                      className="text-xs text-slate-600 hover:text-amber-400 transition-colors"
                    >
                      查看/编辑 JSON
                    </button>
                  )}
                </div>
              </div>
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

            {/* JSON Editor Modal */}
            {showJsonEditor && (
              <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setShowJsonEditor(false)}>
                <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800">
                    <div className="text-sm font-bold text-white">✏️ 编辑视频内容</div>
                    <button onClick={() => setShowJsonEditor(false)} className="text-slate-500 hover:text-white text-lg">✕</button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4">
                    <textarea
                      value={editedJson}
                      onChange={e => setEditedJson(e.target.value)}
                      rows={18}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-300 font-mono leading-relaxed resize-none focus:outline-none focus:border-amber-500/50"
                    />
                    <div className="mt-2 text-xs text-slate-500">
                      scene1_title=首页大标题 · scene1_subtitle=副标题 · scene1_stats=数据展示（3项）<br/>
                      scene2_features=功能卡片（3项，含icon/title/desc）· scene3_stats=统计数据（3项）<br/>
                      scene4_title=结尾CTA标题 · scene4_highlight=核心卖点 · scene4_url=网站
                    </div>
                  </div>
                  <div className="px-5 py-3 border-t border-slate-800 flex gap-2">
                    <button
                      onClick={() => setShowJsonEditor(false)}
                      className="flex-1 py-2.5 border border-slate-700 rounded-xl text-slate-400 text-sm hover:text-white hover:border-slate-600 transition-all"
                    >
                      取消
                    </button>
                    <button
                      onClick={applyEditedJson}
                      className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm rounded-xl transition-all"
                    >
                      🎬 应用并生成视频
                    </button>
                  </div>
                </div>
              </div>
            )}

            {mode !== 'chat' && (
              <button
                onClick={generateVideo}
                disabled={isGenerating || ((mode === 'form' || mode === 'url') && !formData.name.trim())}
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
                    {htmlContent ? '🔄 重新生成视频' : '生成视频预览'}
                  </>
                )}
              </button>
            )}

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

            {htmlContent && (
              <button
                onClick={renderToServerMp4}
                disabled={isRenderingMp4}
                className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 disabled:cursor-not-allowed text-black font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2"
              >
                {isRenderingMp4 ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-black/30 border-t-black animate-spin" />
                    服务器渲染中...
                  </>
                ) : mp4Url ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    MP4 已就绪，再次下载
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    服务器渲染 MP4
                  </>
                )}
              </button>
            )}

            {htmlContent && mode !== 'chat' && (
              <button
                onClick={() => { setEditedJson(JSON.stringify(lastJson, null, 2)); setShowJsonEditor(true); }}
                className="w-full py-3 border border-slate-700 hover:border-slate-600 text-slate-400 hover:text-white text-sm rounded-xl transition-all flex items-center justify-center gap-2"
              >
                ✏️ 编辑视频内容（JSON）
              </button>
            )}

            <p className="text-xs text-slate-600 text-center">
              {htmlContent ? '✅ 视频已生成 · 可录制/下载 · 编辑JSON可重新生成' : '填写信息后点击生成，AI 自动编排动画'}
            </p>
          </div>
        </div>

        {/* Right Panel: Preview */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 py-2.5 border-b border-white/5 bg-slate-900/30 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${htmlContent ? 'bg-green-500' : 'bg-slate-600'}`} />
              <span className="text-xs text-slate-400 font-medium">
                视频预览 {htmlContent ? '✅ 已就绪' : showJsonEditor ? '✏️ 编辑中' : ''}
              </span>
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
