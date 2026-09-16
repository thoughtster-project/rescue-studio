'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type QRPoint = {
  id: string;
  name: string;
  zone: string;
  is_active: boolean;
};

type StaffModule = {
  href: string;
  eyebrow: string;
  title: string;
  description: string;
  accent: 'blue' | 'green';
};

const staffModules: StaffModule[] = [
  {
    href: '/dashboard',
    eyebrow: 'ภาพรวมการปฏิบัติการ',
    title: 'Dashboard',
    description: 'ติดตามเหตุที่แจ้งเข้ามาและสถานะการตอบสนองของทีมแบบรวมศูนย์',
    accent: 'blue',
  },
  {
    href: '/dashboard/points',
    eyebrow: 'จัดการจุดติดตั้ง',
    title: 'จัดการ QR Code',
    description: 'สร้าง แก้ไข และดาวน์โหลด QR Code สำหรับแต่ละจุดแจ้งเหตุ',
    accent: 'green',
  },
];

const moduleStyles: Record<
  StaffModule['accent'],
  {
    icon: string;
    label: string;
    border: string;
    glow: string;
  }
> = {
  blue: {
    icon: 'bg-blue-500/15 text-blue-300 ring-1 ring-blue-400/20',
    label: 'text-blue-300',
    border: 'hover:border-blue-400/40',
    glow: 'group-hover:bg-blue-500/10',
  },
  green: {
    icon: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/20',
    label: 'text-emerald-300',
    border: 'hover:border-emerald-400/40',
    glow: 'group-hover:bg-emerald-500/10',
  },
};

function ArrowUpRightIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 17 17 7M8 7h9v9" />
    </svg>
  );
}

function DashboardIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.2" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.2" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.2" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.2" />
    </svg>
  );
}

function QRIcon({ className = 'h-5 w-5' }: { className?: string }) {
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
        d="M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm11 1h2m3 0v2m-4 3h4m-2-5v5"
      />
    </svg>
  );
}

function ShieldIcon({ className = 'h-5 w-5' }: { className?: string }) {
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

export default function Home() {
  const [points, setPoints] = useState<QRPoint[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    const fetchPoints = async () => {
      const { data, error } = await supabase
        .from('qr_points')
        .select('id, name, zone, is_active')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        setStatus('error');
      } else {
        setPoints(data ?? []);
        setStatus('ready');
      }
    };

    fetchPoints();
  }, []);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050914] px-5 py-8 text-white sm:px-8 sm:py-12">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.035)_1px,transparent_1px)] bg-[size:48px_48px]" />
        <div className="absolute left-1/2 top-[-20rem] h-[42rem] w-[42rem] -translate-x-1/2 rounded-full bg-blue-500/10 blur-[130px]" />
        <div className="absolute bottom-[-18rem] right-[-12rem] h-[32rem] w-[32rem] rounded-full bg-emerald-500/5 blur-[120px]" />
      </div>

      <div className="relative mx-auto w-full max-w-6xl">
        <header className="flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-red-400/20 bg-red-500/10 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-red-300 shadow-[0_0_30px_rgba(248,113,113,0.08)]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
            EMERGENCY RESPONSE PLATFORM
          </div>

          <h1 className="mt-7 text-4xl font-bold tracking-tight text-white sm:text-6xl">
            Rescue Studio
          </h1>

          <p className="mt-4 text-base text-slate-300 sm:text-lg">
            แพลตฟอร์มสร้างระบบแจ้งเหตุฉุกเฉินผ่าน QR Code
          </p>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
            พื้นที่จำลองและจัดการระบบแจ้งเหตุฉุกเฉินผ่าน QR Code
            สำหรับทีมปฏิบัติการและการทดสอบหน้างาน
          </p>
        </header>

        <section
          aria-labelledby="staff-hub-heading"
          className="mt-12 rounded-3xl border border-slate-800/90 bg-slate-900/55 p-4 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-6"
        >
          <div className="flex flex-col gap-4 border-b border-slate-800 pb-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/10 text-amber-300 ring-1 ring-amber-300/20">
                <ShieldIcon />
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 id="staff-hub-heading" className="font-semibold text-white">
                    สำหรับเจ้าหน้าที่
                  </h2>
                  <span className="rounded-full bg-amber-300/10 px-2.5 py-1 text-[11px] font-semibold text-amber-200">
                    ต้องเข้าสู่ระบบก่อน
                  </span>
                </div>
                <p className="mt-1 text-sm leading-6 text-slate-400">
                  กรุณาเข้าสู่ระบบก่อนเข้าใช้งาน Dashboard และการจัดการ QR Code
                </p>
              </div>
            </div>

            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-700/80 bg-slate-950/40 px-3 py-1.5 text-xs text-slate-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              ระบบพร้อมใช้งาน
            </span>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            {staffModules.map((module) => {
              const style = moduleStyles[module.accent];
              const Icon = module.accent === 'blue' ? DashboardIcon : QRIcon;

              return (
                <Link
                  key={module.href}
                  href={module.href}
                  className={`group relative overflow-hidden rounded-2xl border border-slate-800 bg-[#0a1020]/80 p-5 transition duration-300 hover:-translate-y-0.5 ${style.border}`}
                >
                  <div
                    className={`pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full blur-2xl transition duration-300 ${style.glow}`}
                  />

                  <div className="relative">
                    <div className="flex items-start justify-between gap-4">
                      <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${style.icon}`}>
                        <Icon />
                      </div>
                      <ArrowUpRightIcon className="h-5 w-5 text-slate-600 transition group-hover:text-white" />
                    </div>

                    <p className={`mt-7 text-xs font-semibold tracking-[0.14em] ${style.label}`}>
                      {module.eyebrow}
                    </p>
                    <h3 className="mt-2 text-xl font-bold text-white">{module.title}</h3>
                    <p className="mt-2 min-h-12 text-sm leading-6 text-slate-400">
                      {module.description}
                    </p>

                    <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-300 transition group-hover:text-white">
                      เปิดเครื่องมือ
                      <ArrowUpRightIcon />
                    </span>
                  </div>
                </Link>
              );
            })}

            <Link
              href="/login"
              className="group relative overflow-hidden rounded-2xl border border-red-400/20 bg-gradient-to-br from-red-500/15 via-[#151021] to-[#0a1020] p-5 transition duration-300 hover:-translate-y-0.5 hover:border-red-400/45"
            >
              <div className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-red-500/15 blur-3xl transition group-hover:bg-red-500/25" />

              <div className="relative flex h-full flex-col">
                <div className="flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/15 text-red-300 ring-1 ring-red-400/20">
                    <ShieldIcon />
                  </div>
                  <ArrowUpRightIcon className="h-5 w-5 text-red-300/60 transition group-hover:text-red-200" />
                </div>

                <p className="mt-7 text-xs font-semibold tracking-[0.14em] text-red-300">
                  STAFF ACCESS
                </p>
                <h3 className="mt-2 text-xl font-bold text-white">เข้าสู่ระบบ</h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  ยืนยันสิทธิ์ของคุณเพื่อเริ่มใช้งานเครื่องมือสำหรับเจ้าหน้าที่
                </p>

                <span className="mt-5 inline-flex w-fit items-center gap-2 rounded-xl bg-red-400 px-3.5 py-2 text-sm font-bold text-red-950 transition group-hover:bg-red-300">
                  เข้าสู่ระบบ
                  <ArrowUpRightIcon />
                </span>
              </div>
            </Link>
          </div>
        </section>

        <section
          aria-labelledby="active-points-heading"
          className="mt-6 rounded-3xl border border-slate-800/90 bg-slate-900/45 p-4 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-6"
        >
          <div className="flex flex-col gap-4 border-b border-slate-800 pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                </span>
                <h2 id="active-points-heading" className="font-semibold text-white">
                  จุดแจ้งเหตุที่ใช้งานอยู่
                </h2>
              </div>
              <p className="mt-2 text-sm text-slate-400">
                เลือกจุดเพื่อเปิดหน้าจำลองการแจ้งเหตุและทดสอบประสบการณ์ผู้ใช้งาน
              </p>
            </div>

            {status === 'ready' && (
              <div className="flex w-fit items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-500/10 px-3 py-1.5 text-sm font-semibold text-emerald-200">
                <span>{points.length}</span>
                <span className="font-normal text-emerald-200/70">จุดพร้อมใช้งาน</span>
              </div>
            )}
          </div>

          <div className="mt-4">
            {status === 'loading' && (
              <div className="grid gap-3">
                {[0, 1, 2].map((item) => (
                  <div
                    key={item}
                    className="h-[86px] animate-pulse rounded-2xl border border-slate-800 bg-slate-800/40"
                  />
                ))}
              </div>
            )}

            {status === 'error' && (
              <div className="rounded-2xl border border-red-400/15 bg-red-500/5 px-5 py-7 text-center">
                <p className="font-medium text-slate-200">
                  ไม่สามารถดึงรายการจุดแจ้งเหตุได้ในขณะนี้
                </p>
                <p className="mt-1 text-sm text-slate-500">กรุณาลองใหม่อีกครั้งในภายหลัง</p>
              </div>
            )}

            {status === 'ready' && points.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/30 px-5 py-8 text-center">
                <p className="font-medium text-slate-200">ยังไม่มีจุด QR ที่เปิดใช้งาน</p>
                <p className="mt-1 text-sm text-slate-500">
                  เริ่มต้นสร้างจุดแจ้งเหตุแรกสำหรับการทดสอบของคุณ
                </p>
                <Link
                  href="/dashboard/points"
                  className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-300 transition hover:text-blue-200"
                >
                  ไปที่จัดการ QR Code
                  <ArrowUpRightIcon />
                </Link>
              </div>
            )}

            {status === 'ready' && points.length > 0 && (
              <ul className="grid gap-3">
                {points.map((point) => (
                  <li
                    key={point.id}
                    className="group rounded-2xl border border-slate-800 bg-slate-950/35 p-4 transition hover:border-slate-700 hover:bg-slate-900/80"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <span
                          role="img"
                          aria-label="จุดแจ้งเหตุ"
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-lg ring-1 ring-red-400/15"
                        >
                          📍
                        </span>

                        <div className="min-w-0">
                          <p className="truncate font-semibold text-white">{point.name}</p>
                          <div className="mt-1 flex items-center gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                            <p className="truncate font-mono text-xs text-slate-500">
                              {point.zone || 'ไม่ได้ระบุโซน'}
                            </p>
                          </div>
                        </div>
                      </div>

                      <Link
                        href={`/sos/${point.id}`}
                        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-blue-400/20 bg-blue-500/10 px-4 py-2.5 text-sm font-semibold text-blue-200 transition hover:border-blue-400/40 hover:bg-blue-500/20 hover:text-white"
                      >
                        จำลองการแจ้งเหตุ
                        <ArrowUpRightIcon />
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <p className="mt-7 text-center text-xs text-slate-600">
          Rescue Studio · QR Emergency Response Simulation
        </p>
      </div>
    </main>
  );
}