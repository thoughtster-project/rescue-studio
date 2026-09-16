'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
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
  const [orgId, setOrgId] = useState<string | null>(null);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const fetchPoints = async () => {
    const { data } = await supabase
      .from('qr_points')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setPoints(data);
  };

  const fetchOrg = async () => {
    // ดึง org แรกที่มีในระบบมาใช้ก่อน (ภายหลังค่อยทำระบบเลือก org ได้)
    const { data } = await supabase.from('organizations').select('id').limit(1).single();
    if (data) setOrgId(data.id);
  };

  useEffect(() => {
    fetchPoints();
    fetchOrg();
  }, []);

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

  const downloadQR = (pointId: string, pointName: string) => {
    const canvas = document.getElementById(`qr-${pointId}`) as HTMLCanvasElement;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = url;
    link.download = `QR-${pointName}.png`;
    link.click();
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">📍 จัดการจุดติด QR Code</h1>

      {/* ฟอร์มสร้างจุดใหม่ */}
      <div className="bg-gray-900 p-4 rounded-xl mb-8 space-y-3">
        <h2 className="font-bold">สร้างจุดใหม่</h2>
        <input
          type="text"
          placeholder="ชื่อจุด เช่น ทางเข้าหลัก"
          className="w-full p-3 border rounded-lg text-black"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          type="text"
          placeholder="โซน เช่น โซน A"
          className="w-full p-3 border rounded-lg text-black"
          value={zone}
          onChange={(e) => setZone(e.target.value)}
        />
        <button
          onClick={handleCreate}
          disabled={loading}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg font-bold disabled:opacity-50"
        >
          {loading ? 'กำลังสร้าง...' : '+ สร้างจุด'}
        </button>
      </div>

      {/* รายการจุดทั้งหมด */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {points.map((point) => {
          const sosUrl = `${baseUrl}/sos/${point.id}`;
          return (
            <div key={point.id} className="bg-gray-900 border border-gray-700 rounded-xl p-4 text-center">
              <p className="font-bold mb-1">{point.name}</p>
              <p className="text-sm text-gray-400 mb-3">{point.zone}</p>

              <div className="bg-white p-3 rounded-lg inline-block mb-3">
                <QRCodeCanvas id={`qr-${point.id}`} value={sosUrl} size={150} />
              </div>

              <p className="text-xs text-gray-500 break-all mb-3">{sosUrl}</p>

              <button
                onClick={() => downloadQR(point.id, point.name)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold"
              >
                ⬇ ดาวน์โหลด QR
              </button>
            </div>
          );
        })}
      </div>

      {points.length === 0 && <p className="text-gray-400">ยังไม่มีจุด QR ในระบบ ลองสร้างจุดแรกดูครับ</p>}
    </div>
  );
}