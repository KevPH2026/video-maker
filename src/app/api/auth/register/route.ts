import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { findUser, createUser, userExists } from '@/lib/users';

const JWT_SECRET = process.env.JWT_SECRET || 'web2video-fallback-secret';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: '邮箱和密码不能为空' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: '密码至少6位' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: '请输入有效的邮箱地址' }, { status: 400 });
    }

    if (userExists(email)) {
      return NextResponse.json({ error: '该邮箱已被注册' }, { status: 409 });
    }

    const user = createUser(email, password);

    const token = jwt.sign({ email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    const response = NextResponse.json({ ok: true, email: user.email });
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (err) {
    console.error('Register error:', err);
    return NextResponse.json({ error: '注册失败，请重试' }, { status: 500 });
  }
}
