'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

function ArrowRightIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-6-6 6 6-6 6" />
    </svg>
  );
}

function MailIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m4 7 8 6 8-6" />
    </svg>
  );
}

function LockIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <rect x="4" y="10" width="16" height="10" rx="2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function ShieldIcon({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3.5c2.2 1.8 4.8 2.8 7.5 3v5.1c0 4.3-2.8 7.7-7.5 8.9-4.7-1.2-7.5-4.6-7.5-8.9V6.5c2.7-.2 5.3-1.2 7.5-3Z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="m9.4 12 1.7 1.7 3.7-3.9" />
    </svg>
  );
}

function ActivityIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h4l2.5-6 5 12 2.5-6H21" />
    </svg>
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (error) {
      setError('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    } else {
      router.push('/dashboard');
      router.refresh();
    }
  };

  return (
    <main className="relative flex min-h-screen items-center overflow-hidden bg-[#050914] px-5 py-10 text-white sm:px-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.035)_1px,transparent_1px)] bg-[size:48px_48px]" />
        <div className="absolute left-[-12rem] top-[-12rem] h-[34rem] w-[34rem] rounded-full bg-blue-500/10 blur-[130px]" />
        <div className="absolute bottom-[-12rem] right-[-8rem] h-[30rem] w-[30rem] rounded-full bg-red-500/10 blur-[120px]" />
      </div>

      <div className="relative mx-auto grid w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-800/90 bg-slate-900/55 shadow-2xl shadow-black/30 backdrop-blur-xl lg:grid-cols-[1fr_0.92fr]">
        <section className="relative border-b border-slate-800 p-7 sm:p-10 lg:border-b-0 lg:border-r">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.08] via-transparent to-transparent" />

          <div className="relative">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-400 transition hover:text-white"
            >
              <span className="text-lg leading-none">←</span>
              กลับสู่หน้า Rescue Studio
            </Link>

            <div className="mt-14">
              <div className="inline-flex items-center gap-2 rounded-full border border-red-400/20 bg-red-500/10 px-3 py-1.5 text-xs font-semibold tracking-wide text-red-300">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
                EMERGENCY RESPONSE PLATFORM
              </div>

              <p className="mt-8 text-xs font-semibold tracking-[0.24em] text-blue-300">
                CONSOLE CENTER
              </p>

              <h1 className="mt-3 text-5xl font-black tracking-[-0.06em] text-white sm:text-6xl">
                RESCUE
                <span className="block text-blue-300">STUDIO</span>
              </h1>

              <div className="mt-6 h-px w-16 bg-gradient-to-r from-blue-400 to-transparent" />

              <p className="mt-5 max-w-md text-sm font-medium tracking-[0.14em] text-slate-400">
                QR EMERGENCY RESPONSE SYSTEM
              </p>

              <p className="mt-4 max-w-md text-base leading-7 text-slate-500">
                ศูนย์กลางสำหรับติดตามสถานการณ์ จัดการจุดแจ้งเหตุ
                และดูแลการตอบสนองของทีมอย่างเป็นระบบ
              </p>
            </div>

            <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <div className="flex items-start gap-3 rounded-2xl border border-slate-700/70 bg-slate-950/35 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-400/20">
                  <ShieldIcon />
                </div>
                <div>
                  <p className="text-xs font-semibold tracking-[0.14em] text-emerald-300">
                    SECURE ACCESS
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-400">
                    Restricted tools for authorized staff only.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-slate-700/70 bg-slate-950/35 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-300 ring-1 ring-blue-400/20">
                  <ActivityIcon />
                </div>
                <div>
                  <p className="text-xs font-semibold tracking-[0.14em] text-blue-300">
                    OPERATIONAL HUB
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-400">
                    Monitor incidents and manage QR points in one place.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="p-7 sm:p-10">
          <div className="mx-auto max-w-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-300 ring-1 ring-blue-400/20">
              <ShieldIcon />
            </div>

            <p className="mt-7 text-xs font-semibold tracking-[0.16em] text-blue-300">
              STAFF ACCESS
            </p>

            <h2 className="mt-2 text-2xl font-bold text-white">เข้าสู่ระบบทีมงาน</h2>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              กรอกข้อมูลบัญชีของคุณเพื่อดำเนินการต่อ
            </p>

            <form
              className="mt-7 space-y-5"
              onSubmit={(event) => {
                event.preventDefault();
                void handleLogin();
              }}
            >
              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-300">
                  อีเมล
                </label>
                <div className="relative">
                  <MailIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                  <input
                    id="email"
                    type="email"
                    placeholder="name@company.com"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/60 py-3.5 pl-12 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-300">
                  รหัสผ่าน
                </label>
                <div className="relative">
                  <LockIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                  <input
                    id="password"
                    type="password"
                    placeholder="กรอกรหัสผ่านของคุณ"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/60 py-3.5 pl-12 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                    required
                  />
                </div>
              </div>

              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200"
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-400 px-4 py-3.5 text-sm font-bold text-slate-950 transition hover:bg-blue-300 focus:outline-none focus:ring-4 focus:ring-blue-500/25 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
                {!loading && <ArrowRightIcon />}
              </button>
            </form>

            <p className="mt-6 text-center text-xs font-medium tracking-wide text-slate-600">
              RESCUE STUDIO · SECURE STAFF ACCESS
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}