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

type ModuleCard = {
  href: string;
  label: string;
  title: string;
  description: string;
  accent: 'red' | 'blue' | 'green';
};

const modules: ModuleCard[] = [
  {
    href: '/dashboard',
    label: 'ภาพรวม',
    title: 'Dashboard',
    description: 'ติดตามเหตุที่แจ้งเข้ามาและสถานะการตอบสนองของทีม',
    accent: 'blue',
  },
  {
    href: '/dashboard/points',
    label: 'จุดติดตั้ง',
    title: 'จัดการ QR Code',
    description: 'สร้าง แก้ไข และดาวน์โหลด QR ประจำจุดแจ้งเหตุ',
    accent: 'green',
  },
  {
    href: '/login',
    label: 'ทีมงาน',
    title: 'เข้าสู่ระบบ',
    description: 'สำหรับเจ้าหน้าที่ที่ต้องเข้าถึงข้อมูลภายใน',
    accent: 'red',
  },
];

const accentStyles: Record<ModuleCard['accent'], { ring: string; text: string; dot: string }> = {
  red: { ring: 'group-hover:ring-red-500/40', text: 'text-red-400', dot: 'bg-red-500' },
  blue: { ring: 'group-hover:ring-blue-500/40', text: 'text-blue-400', dot: 'bg-blue-500' },
  green: { ring: 'group-hover:ring-green-500/40', text: 'text-green-400', dot: 'bg-green-500' },
};

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
    <main className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-black px-6 py-16 text-white">
      <div className="mx-auto w-full max-w-5xl">
        {/* Header */}
        <div className="text-center">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-4 py-1 text-sm font-medium text-red-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
            Emergency Response Platform
          </span>
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">
            Rescue Studio
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-slate-400">
            แพลตฟอร์มสร้างระบบแจ้งเหตุฉุกเฉินผ่าน QR Code
          </p>
        </div>

        {/* Module hub */}
        <div className="mt-14 grid gap-4 sm:grid-cols-3">
          {modules.map((mod) => {
            const accent = accentStyles[mod.accent];
            return (
              <Link
                key={mod.href}
                href={mod.href}
                className={`group rounded-2xl border border-gray-800 bg-gray-900/60 p-6 backdrop-blur-sm ring-1 ring-transparent transition ${accent.ring} hover:bg-gray-900`}
              >
                <div className="flex items-center gap-2">
                  <span className={`h-1.5 w-1.5 rounded-full ${accent.dot}`} />
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    {mod.label}
                  </span>
                </div>
                <h2 className={`mt-3 text-xl font-bold ${accent.text}`}>{mod.title}</h2>
                <p className="mt-2 text-sm text-gray-400">{mod.description}</p>
                <span className="mt-4 inline-block text-sm text-gray-500 transition group-hover:text-gray-300">
                  เปิดหน้านี้ &rarr;
                </span>
              </Link>
            );
          })}
        </div>

        {/* Active SOS points — live from Supabase */}
        <div className="mt-16 rounded-2xl border border-gray-800 bg-gray-900/40 p-6 backdrop-blur-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
              จุดแจ้งเหตุที่ใช้งานอยู่
            </h3>
            {status === 'ready' && (
              <span className="text-xs text-gray-600">{points.length} จุด</span>
            )}
          </div>

          {status === 'loading' && (
            <div className="space-y-2">
              <div className="h-12 animate-pulse rounded-lg bg-gray-800" />
              <div className="h-12 animate-pulse rounded-lg bg-gray-800" />
            </div>
          )}

          {status === 'error' && (
            <p className="text-sm text-gray-500">
              ไม่สามารถดึงรายการจุดแจ้งเหตุได้ในขณะนี้
            </p>
          )}

          {status === 'ready' && points.length === 0 && (
            <p className="text-sm text-gray-500">
              ยังไม่มีจุด QR ที่เปิดใช้งาน ไปสร้างจุดแรกได้ที่{' '}
              <Link href="/dashboard/points" className="text-blue-400 underline">
                จัดการ QR Code
              </Link>
            </p>
          )}

          {status === 'ready' && points.length > 0 && (
            <ul className="divide-y divide-gray-800">
              {points.map((point) => (
                <li key={point.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-white">{point.name}</p>
                    <p className="truncate text-xs font-mono text-gray-500">{point.zone}</p>
                  </div>
                  <Link
                    href={`/sos/${point.id}`}
                    className="shrink-0 rounded-lg bg-gray-800 px-3 py-1.5 text-xs font-semibold text-gray-300 transition hover:bg-gray-700"
                  >
                    จำลองการแจ้งเหตุ
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}