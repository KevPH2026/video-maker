import { NextRequest, NextResponse } from 'next/server';
import { appendFileSync, existsSync, readFileSync } from 'fs';

const DATA_FILE = '/tmp/price-submissions.jsonl';

export async function POST(req: NextRequest) {
  try {
    const { plan, price } = await req.json();

    if (!plan || !price || typeof price !== 'number' || price <= 0) {
      return NextResponse.json({ error: 'Invalid plan or price' }, { status: 400 });
    }

    const entry = {
      plan,
      price,
      timestamp: new Date().toISOString(),
      ip: req.headers.get('x-forwarded-for') || 'unknown',
    };

    // Append to JSONL file for easy reading
    try {
      const line = JSON.stringify(entry) + '\n';
      appendFileSync(DATA_FILE, line);
    } catch (e) {
      // In serverless, /tmp might not persist — log instead
      console.log('[price-submit]', JSON.stringify(entry));
    }

    return NextResponse.json({ ok: true, message: `Submitted: ${plan} at ¥${price}` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  // Simple view of submissions (for internal use)
  try {
    if (existsSync(DATA_FILE)) {
      const content = readFileSync(DATA_FILE, 'utf-8');
      const lines = content.trim().split('\n').map(l => JSON.parse(l));
      return NextResponse.json({ submissions: lines });
    }
    return NextResponse.json({ submissions: [] });
  } catch (e) {
    return NextResponse.json({ submissions: [], error: 'Cannot read file in serverless env' });
  }
}
