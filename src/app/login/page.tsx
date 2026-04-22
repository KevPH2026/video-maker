'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      setSuccess(true);
      // Redirect to the page they came from, or /generate
      const params = new URLSearchParams(window.location.search);
      const redirect = params.get('redirect') || '/generate';
      window.location.href = `${redirect}${redirect.includes('?') ? '&' : '?'} just_logged_in=1`;
    } catch (err: any) {
      setError(err.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a14', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 8, background: 'linear-gradient(135deg, #ff0080, #00ffff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>web2.video</h1>
          <p style={{ color: '#888', fontSize: 14 }}>登录你的账号</p>
        </div>

        <form onSubmit={handleLogin} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 32 }}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 8, fontWeight: 600 }}>邮箱</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              style={{ width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 8, fontWeight: 600 }}>密码</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              style={{ width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          {error && (
            <div style={{ padding: '12px 16px', background: 'rgba(255,0,80,0.15)', border: '1px solid rgba(255,0,80,0.3)', borderRadius: 12, color: '#ff4488', fontSize: 13, marginBottom: 16 }}>
              {error}
            </div>
          )}

          {success && (
            <div style={{ padding: '12px 16px', background: 'rgba(0,255,128,0.1)', border: '1px solid rgba(0,255,128,0.3)', borderRadius: 12, color: '#00ff88', fontSize: 13, marginBottom: 16 }}>
              登录成功，跳转中...
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', padding: '14px', background: loading ? 'rgba(255,0,128,0.5)' : 'linear-gradient(135deg, #ff0080, #ff4400)', border: 'none', borderRadius: 12, color: '#fff', fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', transition: 'opacity 0.2s' }}
          >
            {loading ? '登录中...' : '登录'}
          </button>
        </form>

        <p style={{ textAlign: 'center', color: '#555', fontSize: 13, marginTop: 24 }}>
          还没有账号？<Link href="/register" style={{ color: '#00ffff', textDecoration: 'none', fontWeight: 600 }}>立即注册 →</Link>
        </p>
      </div>
    </div>
  );
}
