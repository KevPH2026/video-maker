import { NextRequest, NextResponse } from 'next/server';

const RENDER_API_URL = process.env.NEXT_PUBLIC_RENDER_API_URL || 'https://video-maker-production-4372.up.railway.app';

export async function POST(req: NextRequest) {
  try {
    const { html, duration = 22 } = await req.json();
    
    if (!html?.trim()) {
      return NextResponse.json({ error: 'HTML is required' }, { status: 400 });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000);
    
    const response = await fetch(`${RENDER_API_URL}/render`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ html, duration }),
      signal: controller.signal as any,
    });
    
    clearTimeout(timeout);

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json({ error: `Render failed: ${err}` }, { status: 500 });
    }

    const result = await response.json();
    return NextResponse.json(result);

  } catch (err: any) {
    console.error('Render video error:', err);
    return NextResponse.json({ error: err.message || 'Render failed' }, { status: 500 });
  }
}
