import { NextRequest, NextResponse } from 'next/server';

const SF_API_KEY = process.env.SILICONFLOW_API_KEY || 'sk-bzuzrniblkmsprdphgfhigqqokinomxcsfnwpexejboplbld';
const SF_BASE = 'https://api.siliconflow.cn/v1';

const SYSTEM_PROMPT = `You are an expert HyperFrames HTML video composition generator.

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
- The HTML must be renderable in a browser and look like a professional video composition`;

export async function POST(req: NextRequest) {
  try {
    const { description, apiKey } = await req.json();
    if (!description?.trim()) {
      return NextResponse.json({ error: '请输入视频描述' }, { status: 400 });
    }

    const key = apiKey || SF_API_KEY;

    const prompt = `${SYSTEM_PROMPT}

Generate a professional video composition for: ${description}

Make the content specific to this product/service. Include real text, numbers, and details.
Colors: dark background with warm amber/gold accent.`;

    const response = await fetch(`${SF_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-ai/DeepSeek-V3',
        messages: [{ role: 'user', content: prompt }],
        stream: false,
        max_tokens: 3500,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json({ error: `AI生成失败: ${response.status}` }, { status: 500 });
    }

    const data = await response.json();
    let html = data.choices?.[0]?.message?.content || '';
    
    // Clean markdown code blocks
    html = html.replace(/^```(?:html|htm)?\s*/i, '').replace(/\s*```$/i, '').trim();

    if (!html.includes('<html') && !html.includes('<!DOCTYPE')) {
      return NextResponse.json({ error: '生成的HTML格式无效，请重试' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      html,
      message: 'Composition generated — previewing in browser'
    });

  } catch (err: any) {
    console.error('Generate error:', err);
    return NextResponse.json({ error: err.message || '服务器错误' }, { status: 500 });
  }
}
