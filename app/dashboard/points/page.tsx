'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { deleteQRPoint } from '@/lib/delete-qr-point';
import { QRCodeCanvas } from 'qrcode.react';

type QRPoint = {
  id: string;
  name: string;
  zone: string;
  is_active: boolean;
};

export default function QRPointsPage() {
  const [points, setPoints] = useState<QRPoint[]>([]);
  const [name, setName] = useState('');
  const [zone, setZone] = useState('');
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pointToDelete, setPointToDelete] = useState<QRPoint | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const deleteInFlight = useRef(false);
  const [orgId, setOrgId] = useState<string | null>(null);

  const baseUrl =
    typeof window !== 'undefined' ? window.location.origin : '';

  const fetchPoints = async () => {
    const { data } = await supabase
      .from('qr_points')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) setPoints(data);
  };

  const fetchOrg = async () => {
    // ดึง org แรกที่มีในระบบมาใช้ก่อน (ภายหลังค่อยทำระบบเลือก org ได้)
    const { data } = await supabase
      .from('organizations')
      .select('id')
      .limit(1)
      .single();

    if (data) setOrgId(data.id);
  };

  useEffect(() => {
    fetchPoints();
    fetchOrg();
  }, []);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !deletingId) setPointToDelete(null);
    };

    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [deletingId]);

  const handleCreate = async () => {
    if (!name.trim() || !orgId) return alert('กรุณากรอกชื่อจุด');

    setLoading(true);

    const { error } = await supabase.from('qr_points').insert({
      name,
      zone,
      org_id: orgId,
      is_active: true,
    });

    setLoading(false);

    if (error) {
      alert('เกิดข้อผิดพลาด: ' + error.message);
    } else {
      setName('');
      setZone('');
      fetchPoints();
    }
  };

  const handleDelete = async () => {
    if (!pointToDelete || deleteInFlight.current) return;

    const { id: pointId } = pointToDelete;

    deleteInFlight.current = true;
    setDeletingId(pointId);
    setDeleteError(null);
    try {
      await deleteQRPoint(supabase, pointId);
      setPoints((current) => current.filter((point) => point.id !== pointId));
      setPointToDelete(null);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'ลบจุดไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      deleteInFlight.current = false;
      setDeletingId(null);
    }
  };

  const downloadQR = (pointId: string, pointName: string) => {
    const canvas = document.getElementById(
      `qr-${pointId}`
    ) as HTMLCanvasElement;

    if (!canvas) return;

    const url = canvas.toDataURL('image/png');

    const link = document.createElement('a');
    link.href = url;
    link.download = `QR-${pointName}.png`;
    link.click();
  };

  return (
    <main className="min-h-screen bg-[#050914] text-slate-100">
      {/* Subtle system grid — visual only */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.22]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(90,130,180,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(90,130,180,0.08) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      <div className="relative mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        {/* =========================================
            PAGE HEADER
        ========================================== */}
        <header className="mb-5 overflow-hidden rounded-2xl border border-slate-800/90 bg-[#091120]/90 shadow-[0_18px_50px_rgba(0,0,0,0.25)] backdrop-blur">
          <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-sky-400/20 bg-sky-400/[0.06] shadow-inner shadow-sky-400/5 sm:h-14 sm:w-14">
  <div className="rounded-lg bg-white p-1.5 shadow-[0_4px_14px_rgba(0,0,0,0.25)]">
    <QRCodeCanvas
      value="QR-CONTROL"
      size={34}
      bgColor="#ffffff"
      fgColor="#0f172a"
      level="M"
      includeMargin={false}
    />
  </div>
</div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-sm font-extrabold tracking-[0.16em] text-white sm:text-base">
                    QR CONTROL
                  </h1>

                  <span className="rounded-full border border-sky-400/20 bg-sky-400/10 px-2 py-0.5 text-[9px] font-bold tracking-[0.18em] text-sky-300">
                    GENERATOR
                  </span>
                </div>

                <p className="mt-1 truncate text-[11px] text-slate-500 sm:text-xs">
                  จัดการจุด QR Code สำหรับระบบ Rescue Studio
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start rounded-full border border-emerald-400/10 bg-emerald-400/[0.04] px-3 py-1.5 sm:self-auto">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
              <span className="text-[10px] font-semibold tracking-wide text-emerald-300 sm:text-[11px]">
                ระบบพร้อมใช้งาน
              </span>
            </div>
          </div>
        </header>

        {/* =========================================
            CREATE / OVERVIEW
        ========================================== */}
        <section className="mb-7">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-1 text-[9px] font-semibold tracking-[0.22em] text-sky-400/70">
                QR OPERATIONS
              </p>
              <h2 className="text-lg font-extrabold tracking-tight text-white sm:text-xl">
                จัดการจุดติด QR Code
              </h2>
            </div>

            <div className="text-left sm:text-right">
              <p className="text-[10px] text-slate-600">
                SECURE ENDPOINT
              </p>
              <p className="mt-1 text-[10px] text-slate-500">
                /sos/[point-id]
              </p>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)]">
            {/* Total */}
            <div className="relative overflow-hidden rounded-2xl border border-sky-500/15 bg-[#091120]/90 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-400/50 to-transparent" />

              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold tracking-[0.16em] text-slate-500">
                    TOTAL POINTS
                  </p>

                  <p className="mt-3 text-4xl font-black leading-none tracking-tight text-white">
                    {points.length}
                  </p>

                  <p className="mt-2 text-[10px] text-slate-600">
                    จุด QR ในระบบ
                  </p>
                </div>

                <div className="rounded-xl border border-sky-400/10 bg-sky-400/5 px-2.5 py-2 text-sky-300">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <rect x="3" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="3" width="7" height="7" rx="1" />
                    <rect x="3" y="14" width="7" height="7" rx="1" />
                    <path d="M14 14h3v3h-3zM18 18h3v3h-3zM18 14h3M14 18h1" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Create new point */}
            <div className="overflow-hidden rounded-2xl border border-slate-800 bg-[#091120]/95 shadow-[0_20px_60px_rgba(0,0,0,0.2)]">
              <div className="border-b border-slate-800 px-5 py-4 sm:px-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-sky-400/20 bg-sky-400/10 text-sm text-sky-300">
                    +
                  </div>

                  <div className="min-w-0">
                    <h2 className="text-sm font-bold text-white">
                      สร้างจุดใหม่
                    </h2>

                    <p className="mt-0.5 text-[10px] text-slate-500">
                      กำหนดชื่อและโซนของจุดสำหรับสร้าง QR Code
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
                {/* Name */}
                <label className="block">
                  <span className="mb-2 block text-[10px] font-bold tracking-wide text-slate-400">
                    ชื่อจุด
                  </span>

                  <input
                    type="text"
                    placeholder="ชื่อจุด เช่น ทางเข้าหลัก"
                    className="h-11 w-full rounded-xl border border-slate-700 bg-[#050914] px-4 text-sm text-white outline-none transition placeholder:text-slate-700 focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/10"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>

                {/* Zone */}
                <label className="block">
                  <span className="mb-2 block text-[10px] font-bold tracking-wide text-slate-400">
                    โซน
                  </span>

                  <input
                    type="text"
                    placeholder="โซน เช่น โซน A"
                    className="h-11 w-full rounded-xl border border-slate-700 bg-[#050914] px-4 text-sm text-white outline-none transition placeholder:text-slate-700 focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/10"
                    value={zone}
                    onChange={(e) => setZone(e.target.value)}
                  />
                </label>

                {/* Create */}
                <button
                  onClick={handleCreate}
                  disabled={loading}
                  className="h-11 w-full rounded-xl border border-sky-300/20 bg-sky-500 px-6 text-sm font-extrabold text-white shadow-[0_8px_24px_rgba(14,165,233,0.18)] transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50 lg:min-w-[145px] lg:w-auto"
                >
                  {loading ? 'กำลังสร้าง...' : '+ สร้างจุด'}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================
            QR POINT LIST
        ========================================== */}
        <section>
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <p className="mb-1 text-[9px] font-semibold tracking-[0.22em] text-sky-400/70">
                QR POINT QUEUE
              </p>

              <h2 className="text-lg font-extrabold text-white">
                รายการจุดทั้งหมด
              </h2>
            </div>

            <span className="rounded-full border border-slate-800 bg-[#091120] px-3 py-1 text-[10px] font-semibold text-slate-400">
              {points.length} จุด
            </span>
          </div>

          {points.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {points.map((point) => {
                const sosUrl = `${baseUrl}/sos/${point.id}`;
                const isDeleting = deletingId === point.id;

                return (
                  <article
                    key={point.id}
                    className="group overflow-hidden rounded-2xl border border-slate-800 bg-[#091120]/95 transition hover:-translate-y-0.5 hover:border-sky-400/30 hover:shadow-[0_18px_45px_rgba(0,0,0,0.28)]"
                  >
                    {/* Card Header */}
                    <div className="border-b border-slate-800 px-5 py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="mb-2 flex items-center gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]" />

                            <span className="text-[9px] font-bold tracking-[0.18em] text-emerald-300">
                              ACTIVE POINT
                            </span>
                          </div>

                          <h3 className="truncate text-sm font-extrabold text-white">
                            {point.name}
                          </h3>

                          <p className="mt-1 truncate text-xs text-slate-500">
                            {point.zone}
                          </p>
                        </div>

                        <span className="ml-3 shrink-0 rounded-lg border border-slate-700 bg-slate-900/70 px-2 py-1 text-[9px] font-medium text-slate-500">
                          QR
                        </span>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-5">
                      {/* QR */}
                      <div className="relative mx-auto mb-4 flex w-fit items-center justify-center rounded-2xl border border-slate-700 bg-white p-4 shadow-[0_10px_35px_rgba(0,0,0,0.28)]">
                        <QRCodeCanvas
                          id={`qr-${point.id}`}
                          value={sosUrl}
                          size={150}
                        />
                      </div>

                      {/* Endpoint */}
                      <div className="mb-4 rounded-xl border border-slate-800 bg-[#050914] p-3">
                        <p className="mb-1 text-[9px] font-bold tracking-[0.12em] text-slate-600">
                          ENDPOINT
                        </p>

                        <p className="break-all font-mono text-[10px] leading-5 text-slate-400">
                          {sosUrl}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <button
                          onClick={() =>
                            downloadQR(point.id, point.name)
                          }
                          disabled={isDeleting}
                          className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 text-xs font-bold text-emerald-300 transition hover:bg-emerald-400/15 hover:text-emerald-200 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <span>↓</span>
                          ดาวน์โหลด QR
                        </button>

                        <button
                          onClick={() => {
                            setDeleteError(null);
                            setPointToDelete(point);
                          }}
                          disabled={isDeleting}
                          className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-rose-400/20 bg-rose-400/[0.07] text-xs font-bold text-rose-300 transition hover:bg-rose-400/12 hover:text-rose-200 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <span>{isDeleting ? '…' : '×'}</span>
                          {isDeleting
                            ? 'กำลังลบ...'
                            : 'ลบ QR Code'}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            /* Empty state */
            <div className="rounded-2xl border border-dashed border-slate-800 bg-[#091120]/70 px-6 py-12 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-lg text-slate-600">
                <img
                  src="https://w3.pngaura.com/assets/images/posts/transparent/65fe6bdb8eee3_nazim121_qr_code_icon_digital_symbol_quick_access_tool_flat_thi_d58d493a-b795-4038-8b1a-7a48d418240a.png"
                  alt="QR"
                  className="h-7 w-7 object-contain opacity-40 grayscale"
                />
              </div>

              <p className="text-sm font-semibold text-slate-400">
                ยังไม่มีจุด QR ในระบบ ลองสร้างจุดแรกดูครับ
              </p>

              <p className="mt-1 text-[10px] text-slate-600">
                เมื่อสร้างจุดแล้ว QR Code จะแสดงในรายการนี้
              </p>
            </div>
          )}
        </section>

        {/* =========================================
            FOOTER
        ========================================== */}
        <footer className="py-7 text-center text-[9px] tracking-[0.16em] text-slate-700">
          RESCUE STUDIO • QR CONTROL
        </footer>
      </div>

      {pointToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#020617]/80 p-4 backdrop-blur-md"
          onClick={() => !deletingId && setPointToDelete(null)}
          role="presentation"
        >
          <div
            className="relative w-full max-w-md overflow-hidden rounded-3xl border border-rose-400/20 bg-[#091120] shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-qr-title"
          >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-rose-400/80 to-transparent" />
            <div className="p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-rose-400/25 bg-rose-400/10 text-xl text-rose-300 shadow-[0_0_28px_rgba(251,113,133,0.12)]">
                  !
                </div>
                <button
                  type="button"
                  onClick={() => setPointToDelete(null)}
                  disabled={!!deletingId}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700 text-lg text-slate-500 transition hover:border-slate-600 hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="ปิดหน้าต่างยืนยันการลบ"
                >
                  ×
                </button>
              </div>

              <p className="mt-5 text-[10px] font-bold tracking-[0.2em] text-rose-300/80">
                REMOVE QR POINT
              </p>
              <h2 id="delete-qr-title" className="mt-2 text-xl font-extrabold text-white">
                ยืนยันการลบจุด QR
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                คุณกำลังจะลบ <span className="font-bold text-slate-200">{pointToDelete.name}</span>
                {pointToDelete.zone && <> · {pointToDelete.zone}</>} ออกจากระบบ
              </p>

              <div className="mt-5 rounded-2xl border border-rose-400/15 bg-rose-400/[0.06] p-3.5">
                <p className="text-xs leading-5 text-rose-200/90">
                  การดำเนินการนี้ไม่สามารถย้อนกลับได้ และ QR Code นี้จะใช้งานไม่ได้ทันที
                </p>
                <p className="mt-2 text-xs leading-5 text-slate-400">
                  ประวัติแจ้งเหตุและบันทึกการดำเนินการจะยังคงอยู่ โดยไม่ผูกกับจุด QR ที่ลบแล้ว
                </p>
              </div>

              {deleteError && (
                <p role="alert" className="mt-4 break-words rounded-xl border border-rose-400/25 bg-rose-500/10 p-3 text-sm leading-6 text-rose-200">
                  {deleteError}
                </p>
              )}

              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setPointToDelete(null)}
                  disabled={!!deletingId}
                  className="h-11 rounded-xl border border-slate-700 px-5 text-sm font-bold text-slate-300 transition hover:border-slate-600 hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={!!deletingId}
                  className="h-11 rounded-xl border border-rose-300/20 bg-rose-500 px-5 text-sm font-extrabold text-white shadow-[0_8px_24px_rgba(244,63,94,0.2)] transition hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {deletingId ? 'กำลังลบ...' : 'ลบ QR Code'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
