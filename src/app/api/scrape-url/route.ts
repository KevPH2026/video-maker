import { NextRequest, NextResponse } from 'next/server';

const RAILWAY_URL = process.env.RAILWAY_RENDER_URL || 'https://video-maker-production-4372.up.railway.app';

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url?.trim()) {
      return NextResponse.json({ error: '请输入URL' }, { status: 400 });
    }

    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('Invalid');
      }
    } catch {
      return NextResponse.json({ error: 'URL格式无效，请输入以 http:// 或 https:// 开头的链接' }, { status: 400 });
    }

    // Try Railway scrape endpoint first (has Playwright, best for JS-rendered pages)
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);
      const railRes = await fetch(`${RAILWAY_URL}/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
        signal: controller.signal as any,
      });
      clearTimeout(timeout);

      if (railRes.ok) {
        const data = await railRes.json();
        if (data.success) {
          return NextResponse.json(data);
        }
      }
    } catch {}

    // Fallback: simple HTTP fetch + regex parsing (works for static pages)
    let html = '';
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      const res = await fetch(url, {
        signal: controller.signal as any,
        headers: {
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });
      clearTimeout(timeout);

      if (!res.ok) {
        return NextResponse.json({
          error: `网页返回错误 (HTTP ${res.status})，请尝试其他URL`,
        }, { status: 400 });
      }

      html = await res.text();
    } catch (err: any) {
      return NextResponse.json({
        error: '网页加载失败，可能是网站禁止访问或链接无效',
      }, { status: 400 });
    }

    // Parse HTML with regex (no cheerio needed for basic extraction)
    const extract = (pattern: RegExp, defaultVal = ''): string => {
      const m = html.match(pattern);
      return m ? m[1]?.trim().substring(0, 200) || defaultVal : defaultVal;
    };

    const title = extract(/<title[^>]*>([^<]+)<\/title>/i) ||
      extract(/<h1[^>]*class=["'][^"']*title[^"']*["'][^>]*>([^<]+)/i) ||
      extract(/<h1[^>]*>([^<]+)<\/h1>/i) || '';

    const description = extract(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
      extract(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i) ||
      extract(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i) || '';

    const price = extract(/<meta[^>]+itemprop=["']price["'][^>]+content=["']([^"']+)["']/i) ||
      extract(/[\$\xa5]\s*[\d,]+\.?\d{0,2}/) || '';

    const brand = extract(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i) ||
      extract(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:site_name["']/i) ||
      extract(/<a[^>]+class=["'][^"']*brand[^"']*["'][^>]*>([^<]+)<\/a>/i) || '';

    // Extract images
    const imageMatches = html.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi);
    const images: string[] = [];
    for (const m of imageMatches) {
      const src = m[1];
      if (src && src.startsWith('http') && !src.includes('data:') && !src.includes('data-src') && images.length < 5) {
        images.push(src);
      }
    }
    const ogImage = extract(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
    if (ogImage) images.unshift(ogImage);

    // Extract list items as features
    const listMatches = html.matchAll(/<(?:li|div|span|p)[^>]*(?:class|id)=["'][^"']*(?:feature|spec|benefit|highlight)[^"']*["'][^>]*>([^<]+)<\/(?:li|div|span|p)>/gi);
    const features: string[] = [];
    for (const m of listMatches) {
      const text = m[1]?.trim();
      if (text && text.length > 3 && text.length < 150 && features.length < 6) {
        features.push(text);
      }
    }

    return NextResponse.json({
      success: true,
      url,
      title: title.substring(0, 100),
      description: description.substring(0, 300),
      price,
      brand,
      features,
      images,
      siteName: parsedUrl.hostname,
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message || '服务器错误' }, { status: 500 });
  }
}
