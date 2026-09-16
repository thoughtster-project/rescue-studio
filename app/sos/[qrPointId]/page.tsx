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
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-black text-white flex flex-col items-center px-4 py-8 sm:py-12">
      <div className="w-full max-w-md">
        <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-800 rounded-2xl shadow-2xl shadow-black/40 p-6 sm:p-8">
          {/* หัวข้อแสดงชื่อจุด และ UUID แบบ Censor */}
          <div className="mb-8 text-center">
            <div
              className={`inline-flex items-center justify-center w-14 h-14 rounded-full mb-3 text-2xl ${
                isPointError
                  ? 'bg-red-500/10 ring-1 ring-red-500/30'
                  : 'bg-blue-500/10 ring-1 ring-blue-500/30'
              }`}
            >
              📍
            </div>

            {!isPointReady && !isPointError && (
              <div className="h-7 w-40 mx-auto rounded-md bg-gray-800 animate-pulse mb-2" />
            )}

            {isPointReady && (
              <h1 className="text-2xl font-bold text-blue-400">{pointName}</h1>
            )}

            {isPointError && (
              <h1 className="text-2xl font-bold text-red-400">{pointName}</h1>
            )}

            <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full bg-gray-800/80 border border-gray-700/50">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-600" />
              <p className="text-xs text-gray-500 font-mono tracking-wide">
                ID: {censorId(id) || '—'}
              </p>
            </div>
          </div>

          {submitted ? (
            /* หน้าจอยืนยันหลังส่งสำเร็จ แสดงในหน้าเดียวกัน ไม่มี popup */
            <div className="text-center py-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 ring-1 ring-green-500/30 mb-4 text-3xl">
                ✅
              </div>
              <h2 className="text-xl font-bold text-green-400 mb-2">ส่งเรื่องสำเร็จแล้ว</h2>
              <p className="text-sm text-gray-400 mb-6">
                ทีมช่วยเหลือได้รับแจ้งเหตุของคุณแล้ว
              </p>
              <button
                onClick={() => setSubmitted(false)}
                className="text-sm text-blue-400 hover:text-blue-300 underline"
              >
                แจ้งเหตุเพิ่มเติมอีกครั้ง
              </button>
            </div>
          ) : (
            <>
              {/* ส่วนเลือกประเภท */}
              <div className="mb-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
                  เลือกประเภทเหตุการณ์
                </p>
                <div className="grid gap-3">
                  {incidentOptions.map(({ label, icon }) => (
                    <button
                      key={label}
                      onClick={() => setIncidentType(label)}
                      className={`flex items-center gap-3 p-4 rounded-xl font-bold text-left transition duration-200 ${
                        incidentType === label
                          ? 'bg-blue-600 ring-2 ring-blue-300'
                          : 'bg-gray-800 hover:bg-gray-700'
                      }`}
                    >
                      <span className="text-xl leading-none">{icon}</span>
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* ส่วนกรอกรายละเอียด */}
              <div className="mb-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
                  รายละเอียดเพิ่มเติม (ถ้ามี)
                </p>
                <textarea
                  placeholder="กรอกรายละเอียดเพิ่มเติม..."
                  className="w-full p-4 bg-gray-900 border border-gray-700 rounded-xl text-white h-32 focus:ring-2 focus:ring-blue-500 outline-none transition placeholder:text-gray-600"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {/* ปุ่มส่ง */}
              <button
                onClick={handleSubmit}
                disabled={loading || !incidentType}
                className="w-full bg-green-600 hover:bg-green-500 py-4 rounded-xl font-bold text-lg transition disabled:opacity-50 disabled:bg-gray-600 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    กำลังส่ง...
                  </>
                ) : (
                  'ส่งเรื่อง'
                )}
              </button>

              <p className="text-center text-[11px] text-gray-600 mt-4">
                ข้อมูลของคุณจะถูกส่งไปยังทีมช่วยเหลือทันทีที่กดส่งเรื่อง
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}