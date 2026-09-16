'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams } from 'next/navigation';

export default function SOSPage() {
  const params = useParams();
  // ดึง id ออกมาให้ชัวร์ — โฟลเดอร์จริงในโปรเจกต์คือ app/sos/[qrPointId]/page.tsx
  // ดังนั้น key ของ params ต้องเป็น "qrPointId" ไม่ใช่ "id"
  const id = params?.qrPointId as string;

  const [pointName, setPointName] = useState('กำลังโหลด...');
  const [incidentType, setIncidentType] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    // ตรวจสอบค่า id ใน console
    console.log('Current ID from URL:', id);

    if (!id) {
      setPointName('ไม่พบรหัสจุด');
      return;
    }

    const fetchPoint = async () => {
      const { data, error } = await supabase
        .from('qr_points')
        .select('name, id')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Supabase Error:', error);
        setPointName('ไม่พบข้อมูลจุด');
      } else if (data) {
        setPointName(data.name);
      }
    };
    fetchPoint();
  }, [id]);

  const censorId = (uuid: string) => {
    if (!uuid) return '';
    return `${uuid.substring(0, 4)}****${uuid.substring(uuid.length - 4)}`;
  };

  const handleSubmit = async () => {
    if (!incidentType) return alert('กรุณาเลือกประเภทเหตุการณ์');
    setLoading(true);
    const { error } = await supabase.from('incidents').insert({
      qr_point_id: id,
      incident_type: incidentType,
      description: description,
      status: 'pending',
    });
    setLoading(false);
    if (error) alert('เกิดข้อผิดพลาด: ' + error.message);
    else {
      setSubmitted(true);
      setIncidentType('');
      setDescription('');
    }
  };

  // ---- ส่วนตกแต่ง (ไม่กระทบ logic ด้านบน) ----
  const incidentOptions = [
    { label: 'เหตุฉุกเฉิน มีผู้ป่วย', icon: '🚑' },
    { label: 'คนหาย', icon: '🧭' },
    { label: 'เหตุร้ายแรงอื่น ๆ', icon: '⚠️' },
  ];

  const isPointReady =
    pointName !== 'กำลังโหลด...' &&
    pointName !== 'ไม่พบรหัสจุด' &&
    pointName !== 'ไม่พบข้อมูลจุด';
  const isPointError =
    pointName === 'ไม่พบรหัสจุด' || pointName === 'ไม่พบข้อมูลจุด';

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050914] px-3 py-4 text-slate-100 sm:px-6 sm:py-8">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.035)_1px,transparent_1px)] bg-[size:48px_48px]" />
        <div className="absolute -left-48 -top-48 h-[32rem] w-[32rem] rounded-full bg-blue-500/10 blur-[120px]" />
        <div className="absolute -right-48 top-80 h-[28rem] w-[28rem] rounded-full bg-rose-500/[0.06] blur-[120px]" />
      </div>

      <div className="relative mx-auto w-full max-w-lg">
        <header className="mb-4 flex items-center justify-between gap-3 px-2 sm:mb-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-400/20 bg-blue-500/10 text-blue-300">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-6 w-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3.5c2.2 1.8 4.8 2.8 7.5 3v5.1c0 4.3-2.8 7.7-7.5 8.9-4.7-1.2-7.5-4.6-7.5-8.9V6.5c2.7-.2 5.3-1.2 7.5-3Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h2l1-3 2 6 1-3h2" />
              </svg>
            </span>
            <div>
              <p className="text-xs font-extrabold tracking-[0.14em] text-white sm:text-sm">RESCUE STUDIO</p>
              <p className="mt-1 text-[9px] font-semibold tracking-[0.18em] text-slate-500 sm:text-[10px]">EMERGENCY ASSISTANCE</p>
            </div>
          </div>
          <span className="shrink-0 rounded-lg border border-rose-400/20 bg-rose-500/10 px-3 py-1.5 text-xs font-bold tracking-widest text-rose-300">SOS</span>
        </header>

        <section className="relative overflow-hidden rounded-2xl border border-slate-800 bg-[#091120]/95 shadow-[0_24px_70px_rgba(0,0,0,0.3)] sm:rounded-3xl" aria-label="แบบฟอร์มแจ้งเหตุ">
          <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/50 to-transparent" />
          <div className="px-5 pt-5 text-center sm:px-7 sm:pt-7">
            <h1 className="text-lg font-extrabold tracking-tight text-white sm:text-xl">แจ้งเหตุขอความช่วยเหลือ</h1>
          {/* หัวข้อแสดงชื่อจุด และ UUID แบบ Censor */}
          <div className="mt-4 border-b border-slate-800 pb-5 sm:mt-5 sm:pb-6">
            <div className="flex flex-col items-center gap-2.5">
            <div
              className={`relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border ${
                isPointError
                  ? 'border-rose-400/20 bg-rose-500/10 text-rose-300'
                  : 'border-blue-400/20 bg-blue-500/10 text-blue-300'
              }`}
            >
              {isPointReady && (
                <span aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-full border border-blue-400/20 motion-safe:animate-[ping_2.5s_ease-out_infinite]" />
              )}
              <span aria-hidden="true" className="relative text-2xl leading-none">📍</span>
            </div>
            <div className="min-w-0 w-full" aria-live="polite">
              <p className="mb-1 text-[10px] font-semibold tracking-wide text-slate-500">จุดแจ้งเหตุของคุณ</p>
            {!isPointReady && !isPointError && (
              <div className="mx-auto h-6 w-32 max-w-full animate-pulse rounded-md bg-slate-800" aria-label={pointName} />
            )}

            {isPointReady && (
              <h2 className="break-words text-lg font-bold text-blue-300 sm:text-xl">{pointName}</h2>
            )}

            {isPointError && (
              <h2 className="break-words text-lg font-bold text-rose-300">{pointName}</h2>
            )}
            <div className="mt-2 inline-flex items-center gap-2 rounded-md border border-slate-800 bg-slate-950/50 px-2 py-1">
              <span className="h-1 w-1 rounded-full bg-slate-500" />
              <p className="font-mono text-[10px] tracking-wide text-slate-500">
                ID: {censorId(id) || '—'}
              </p>
            </div>
            </div>
            </div>
          </div>
          </div>
          {submitted ? (
            /* หน้าจอยืนยันหลังส่งสำเร็จ แสดงในหน้าเดียวกัน ไม่มี popup */
            <div className="px-5 py-12 text-center sm:px-8 sm:py-16" role="status">
              <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-3xl border border-emerald-400/25 bg-emerald-500/10 text-emerald-300 shadow-[0_0_45px_rgba(52,211,153,0.08)]">
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-9 w-9"><path strokeLinecap="round" strokeLinejoin="round" d="m5 12 4 4L19 6" /></svg>
              </div>
              <p className="mb-3 text-[10px] font-bold tracking-[0.2em] text-emerald-300">REQUEST SENT</p>
              <h2 className="mb-3 text-2xl font-extrabold text-white">ส่งเรื่องสำเร็จแล้ว</h2>
              <p className="mb-8 text-sm leading-6 text-slate-400">
                ทีมช่วยเหลือได้รับแจ้งเหตุของคุณแล้ว
              </p>
              <button
                onClick={() => setSubmitted(false)}
                className="min-h-11 rounded-xl border border-blue-400/20 bg-blue-500/10 px-5 py-3 text-sm font-bold text-blue-200 transition hover:border-blue-400/40 hover:bg-blue-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
              >
                แจ้งเหตุเพิ่มเติมอีกครั้ง
              </button>
            </div>
          ) : (
            <div>
              <div className="p-5 sm:p-7">
              {/* ส่วนเลือกประเภท */}
              <div className="mb-5">
                <p id="incident-type-label" className="mb-3 flex items-center gap-2.5 text-sm font-semibold text-slate-200">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg border border-blue-400/15 bg-blue-500/10 font-mono text-[10px] text-blue-300">01</span>
                  เลือกประเภทเหตุการณ์ <span className="text-rose-300" aria-hidden="true">*</span>
                </p>
                <div className="grid gap-2.5" role="group" aria-labelledby="incident-type-label">
                  {incidentOptions.map(({ label, icon }) => (
                    <button
                      key={label}
                      onClick={() => setIncidentType(label)}
                      aria-pressed={incidentType === label}
                      className={`flex min-h-14 items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm font-bold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 sm:px-4 sm:py-3 ${
                        incidentType === label
                          ? 'border-blue-300/70 bg-blue-600 text-white shadow-[0_4px_18px_rgba(37,99,235,0.2)]'
                          : 'border-slate-800 bg-[#050914]/50 text-slate-300 hover:border-slate-600 hover:bg-slate-800/50'
                      }`}
                    >
                      <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center text-xl">{icon}</span>
                      <span className="flex-1">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* ส่วนกรอกรายละเอียด */}
              <div className="mb-5">
                <label htmlFor="sos-description" className="mb-3 flex items-center gap-2.5 text-sm font-semibold text-slate-200">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg border border-blue-400/15 bg-blue-500/10 font-mono text-[10px] text-blue-300">02</span>
                  รายละเอียดเพิ่มเติม (ถ้ามี)
                </label>
                <textarea
                  id="sos-description"
                  placeholder="กรอกรายละเอียดเพิ่มเติม..."
                  className="block h-24 w-full resize-y rounded-xl border border-slate-700/80 bg-[#050914]/70 p-3 text-base leading-6 text-white outline-none transition placeholder:text-slate-600 focus:border-blue-400/60 focus:ring-4 focus:ring-blue-500/10 sm:h-28 sm:p-4"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {/* ปุ่มส่ง */}
              <button
                onClick={handleSubmit}
                disabled={loading || !incidentType}
                className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl border border-rose-300/20 bg-rose-500 px-4 py-3.5 text-base font-extrabold text-white shadow-[0_8px_24px_rgba(244,63,94,0.18)] transition hover:bg-rose-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#091120] disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-800 disabled:text-slate-500 disabled:shadow-none"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    กำลังส่ง...
                  </>
                ) : (
                  'ส่งคำร้องแจ้งเหตุฉุกเฉิน'
                )}
              </button>

              <p className="mt-4 text-center text-[11px] leading-5 text-slate-500">
                ข้อมูลของคุณจะถูกส่งไปยังทีมช่วยเหลือทันทีที่กดส่งคำร้อง
              </p>
              </div>
            </div>
          )}
          </section>
        <footer className="py-5 text-center text-[9px] font-medium tracking-[0.18em] text-slate-600">RESCUE STUDIO · SOS ASSISTANCE</footer>
      </div>
    </main>
  );
}
