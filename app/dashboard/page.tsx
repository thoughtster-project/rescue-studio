'use client';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type IncidentAction = {
  id: string;
  action_type: string;
  handled_by: string;
  note: string | null;
  created_at: string;
};

type Incident = {
  id: string;
  incident_type: string;
  description: string;
  status: string;
  created_at: string;
  incident_actions: IncidentAction[];
};

// ---- ค่าคงที่ / helper ที่ใช้ร่วมกันหลายจุด (กันเขียนซ้ำ, สีตรงกันทั้งหน้า) ----
const STATUS_META: Record<string, { label: string; dot: string; text: string; bg: string }> = {
  pending: { label: 'รอดำเนินการ', dot: 'bg-red-500', text: 'text-red-400', bg: 'bg-red-500/10' },
  in_progress: { label: 'กำลังทำ', dot: 'bg-yellow-500', text: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  resolved: { label: 'เสร็จสิ้น', dot: 'bg-green-500', text: 'text-green-400', bg: 'bg-green-500/10' },
};

const QUICK_ACTIONS: { type: string; label: string; icon: string }[] = [
  { type: 'ambulance', label: 'เรียกรถพยาบาล', icon: '🚑' },
  { type: 'fire', label: 'เรียกดับเพลิง', icon: '🚒' },
  { type: 'police', label: 'เรียกตำรวจ', icon: '🚓' },
  { type: 'on_site_control', label: 'เจ้าหน้าที่ควบคุมเหตุแล้ว', icon: '✅' },
];

function actionMeta(type: string) {
  const found = QUICK_ACTIONS.find((a) => a.type === type);
  if (found) return found;
  return { type, label: 'บันทึกโน้ต', icon: '📝' };
}

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? {
    label: status,
    dot: 'bg-gray-500',
    text: 'text-gray-400',
    bg: 'bg-gray-500/10',
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap ${meta.bg} ${meta.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return 'เมื่อสักครู่';
  if (min < 60) return `${min} นาทีที่แล้ว`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} ชม.ที่แล้ว`;
  return new Date(iso).toLocaleString('th-TH');
}

export default function DashboardPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Incident | null>(null);
  const [handledBy, setHandledBy] = useState('');
  const [note, setNote] = useState('');
  const [selectedActionType, setSelectedActionType] = useState<string | null>(null);
  const [addingAction, setAddingAction] = useState(false); // opt-in ให้แก้ไข action ต่อ แม้เคสจะพ้น pending แล้ว
  const [savingAction, setSavingAction] = useState(false);
  const router = useRouter();

  // เปิด modal ของเคสหนึ่งๆ พร้อมล้างฟอร์มค้างของเคสก่อนหน้าเสมอ
  // (handledBy ไม่ล้าง เพราะอยากให้จำชื่อผู้ดำเนินการข้ามเคสไว้ เป็น convenience)
  const openCase = (incident: Incident) => {
    setSelected(incident);
    setAddingAction(false);
    setSelectedActionType(null);
    setNote('');
  };

  // ดึง incidents พร้อม "join" ประวัติ action ของแต่ละเคสมาในคำสั่งเดียว
  // (กัน N+1 query — ถ้าแยกยิง fetch ประวัติทีละเคสจะช้ามากเมื่อเคสเยอะขึ้น)
  const fetchIncidents = useCallback(async () => {
    const { data, error } = await supabase
      .from('incidents')
      .select('*, incident_actions(id, action_type, handled_by, note, created_at)')
      .order('created_at', { ascending: false });
    if (error) console.error('Fetch incidents error:', error);
    if (data) setIncidents(data as unknown as Incident[]);
    setLoading(false);
  }, []);

  const updateStatus = async (id: string, newStatus: string) => {
    await supabase.from('incidents').update({ status: newStatus }).eq('id', id);
  };

  useEffect(() => {
    fetchIncidents();

    const savedName =
      typeof window !== 'undefined' ? window.localStorage.getItem('admin_handled_by') : '';
    if (savedName) setHandledBy(savedName);

    const incidentsChannel = supabase
      .channel('incidents-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, fetchIncidents)
      .subscribe();

    const actionsChannel = supabase
      .channel('incident-actions-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'incident_actions' },
        fetchIncidents
      )
      .subscribe();

    return () => {
      supabase.removeChannel(incidentsChannel);
      supabase.removeChannel(actionsChannel);
    };
  }, [fetchIncidents]);

  // ปิด modal ด้วยปุ่ม Esc (มาตรฐาน UX ของ dialog ทั่วไป)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelected(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ถ้า modal เปิดอยู่ และข้อมูล incidents ถูก refetch (realtime) ให้ sync ตัวที่เปิดอยู่ด้วย
  useEffect(() => {
    if (selected) {
      const updated = incidents.find((i) => i.id === selected.id);
      if (updated) setSelected(updated);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incidents]);

  const total = incidents.length;
  const pending = incidents.filter((i) => i.status === 'pending').length;
  const inProgress = incidents.filter((i) => i.status === 'in_progress').length;
  const resolved = incidents.filter((i) => i.status === 'resolved').length;

  const filteredIncidents = incidents.filter((i) => i.status === filter);

  const searchedAll = incidents.filter((i) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      i.incident_type.toLowerCase().includes(q) ||
      (i.description || '').toLowerCase().includes(q)
    );
  });

  const latestAction = (incident: Incident) => {
    if (!incident.incident_actions?.length) return null;
    return [...incident.incident_actions].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0];
  };

  // รวม action ทุกเคสเป็น feed เดียว เรียงเวลาล่าสุดก่อน — คือ "สรุป log" ที่ขอมา
  const recentActivity = incidents
    .flatMap((i) => (i.incident_actions || []).map((a) => ({ ...a, incident: i })))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 15);

  // เคสยัง pending = ทำงานอยู่ ให้ log action ได้เลย
  // เคสพ้น pending แล้ว = ล็อกเป็นสรุป เว้นแต่ผู้ใช้กด "+ เพิ่มบันทึก" ยืนยันเจตนาก่อน
  const canActNow = !!selected && (selected.status === 'pending' || addingAction);

  // บันทึกจริงแค่จุดเดียว ถูกเรียกจากปุ่ม "บันทึกการดำเนินการ" เท่านั้น
  // (แยกจากการ "เลือก" ประเภท action เพื่อกัน insert ซ้ำจากการกดพลาด)
  const handleSaveAction = async () => {
    if (!selected || !selectedActionType || savingAction) return;
    if (!handledBy.trim()) {
      alert('กรุณาระบุชื่อผู้ดำเนินการก่อนบันทึก');
      return;
    }
    setSavingAction(true);
    const { error } = await supabase.from('incident_actions').insert({
      incident_id: selected.id,
      action_type: selectedActionType,
      handled_by: handledBy.trim(),
      note: note.trim() || null,
    });
    setSavingAction(false);
    if (error) {
      alert('บันทึก action ไม่สำเร็จ: ' + error.message);
      return;
    }
    window.localStorage.setItem('admin_handled_by', handledBy.trim());
    setNote('');
    setSelectedActionType(null);
    setAddingAction(false);
    setSelected(null); // บันทึกสำเร็จ -> ปิดหน้าต่างไปเลย (เปลี่ยนสถานะทำที่การ์ดด้านนอกแทน)
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      {/* Navigation Bar */}
      <nav className="flex justify-between items-center mb-8 bg-gray-900 p-4 rounded-xl border border-gray-800">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold">🛡️ ระบบติดตามเหตุฉุกเฉิน</h1>
          <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 bg-gray-800/70 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            เชื่อมต่อสด
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/points"
            className="bg-blue-600 px-4 py-2 rounded-lg font-bold hover:bg-blue-500"
          >
            📍 จัดการจุด QR
          </Link>
          <button
            onClick={() => {
              supabase.auth.signOut();
              router.push('/login');
            }}
            className="text-red-400 underline"
          >
            ออกจากระบบ
          </button>
        </div>
      </nav>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'ทั้งหมด', val: total, color: 'text-white', icon: '🗂️' },
          { label: 'รอรับเรื่อง', val: pending, color: 'text-red-400', icon: '🔴' },
          { label: 'กำลังทำ', val: inProgress, color: 'text-yellow-400', icon: '🟡' },
          { label: 'ปิดเคสแล้ว', val: resolved, color: 'text-green-400', icon: '🟢' },
        ].map((item, idx) => (
          <div
            key={idx}
            className="bg-gray-900 p-4 rounded-xl border border-gray-800 hover:border-gray-700 transition"
          >
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm text-gray-400">{item.label}</p>
              <span className="text-base opacity-70">{item.icon}</span>
            </div>
            <p className={`text-3xl font-bold ${item.color}`}>{item.val}</p>
          </div>
        ))}
      </div>

      {/* Filter Tabs (มีจำนวนกำกับแต่ละแท็บ) */}
      <div className="flex gap-2 mb-6 bg-gray-900 p-1 rounded-lg border border-gray-800">
        {[
          { id: 'pending', label: '🔴 รอดำเนินการ', count: pending },
          { id: 'in_progress', label: '🟡 กำลังทำ', count: inProgress },
          { id: 'resolved', label: '🟢 เสร็จสิ้น', count: resolved },
        ].map((s) => (
          <button
            key={s.id}
            onClick={() => setFilter(s.id)}
            className={`flex-1 py-2 rounded-md font-bold transition flex items-center justify-center gap-2 ${
              filter === s.id ? 'bg-blue-600' : 'hover:bg-gray-800'
            }`}
          >
            {s.label}
            <span
              className={`text-xs px-1.5 py-0.5 rounded-full ${
                filter === s.id ? 'bg-white/20' : 'bg-gray-800'
              }`}
            >
              {s.count}
            </span>
          </button>
        ))}
      </div>

      {/* รายการเหตุการณ์ (work queue ที่ filter ตาม tab) */}
      <div className="flex flex-col gap-4 mb-10">
        {loading ? (
          <p className="text-center text-gray-500 py-10">กำลังโหลด...</p>
        ) : filteredIncidents.length === 0 ? (
          <p className="text-center text-gray-500 py-10">ไม่พบข้อมูลในหมวดนี้</p>
        ) : (
          filteredIncidents.map((i) => {
            const last = latestAction(i);
            return (
              <div
                key={i.id}
                className="bg-gray-900 p-6 rounded-xl border-l-4 border-blue-500 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 shadow-lg w-full"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xl font-bold mb-1 text-white">
                    {i.status === 'pending' ? (
                      <span className="text-red-500">⚠️ NEW! ฉุกเฉิน!</span>
                    ) : (
                      i.incident_type
                    )}
                  </p>
                  <p className="text-gray-300 mb-3 break-words">{i.description}</p>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                    <span>{new Date(i.created_at).toLocaleString('th-TH')}</span>
                    {last && (
                      <span className="inline-flex items-center gap-1 bg-gray-800/70 px-2 py-0.5 rounded-full">
                        {actionMeta(last.action_type).icon} {actionMeta(last.action_type).label} โดย{' '}
                        {last.handled_by}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => openCase(i)}
                    className="bg-gray-800 px-4 py-2 rounded-lg font-bold text-sm hover:bg-gray-700"
                  >
                    {i.status === 'pending' ? 'ดำเนินการ' : 'ดูสรุป'}
                  </button>
                  {i.status === 'pending' && (
                    <button
                      onClick={() => updateStatus(i.id, 'in_progress')}
                      className="bg-yellow-600 px-4 py-2 rounded-lg font-bold text-sm hover:bg-yellow-500"
                    >
                      รับเรื่อง
                    </button>
                  )}
                  {i.status !== 'resolved' && (
                    <button
                      onClick={() => updateStatus(i.id, 'resolved')}
                      className="bg-green-700 px-4 py-2 rounded-lg font-bold text-sm hover:bg-green-600"
                    >
                      ปิดเคส
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ---- ด้านล่าง: log สรุป + เคสทั้งหมดที่ไม่ filter ---- */}
      <div className="grid lg:grid-cols-2 gap-6 pb-10">
        {/* Activity feed: ใคร ทำอะไร เมื่อไหร่ กับเคสไหน */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <h2 className="font-bold mb-4 flex items-center gap-2">📜 Log ล่าสุด</h2>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-gray-500 py-6 text-center">ยังไม่มีการบันทึก action</p>
          ) : (
            <div className="flex flex-col gap-3 max-h-[420px] overflow-y-auto pr-1">
              {recentActivity.map((a) => {
                const meta = actionMeta(a.action_type);
                return (
                  <div
                    key={a.id}
                    className="flex items-start gap-3 text-sm border-b border-gray-800 pb-3 last:border-0"
                  >
                    <span className="text-lg leading-none">{meta.icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-gray-200">
                        <span className="font-bold">{a.handled_by}</span> {meta.label}
                        <span className="text-gray-500"> · {a.incident.incident_type}</span>
                      </p>
                      {a.note && <p className="text-gray-500 truncate">{a.note}</p>}
                      <p className="text-[11px] text-gray-600 mt-0.5">{timeAgo(a.created_at)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ตารางเคสทั้งหมด ไม่ผูกกับ filter ด้านบน */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <div className="flex items-center justify-between mb-4 gap-3">
            <h2 className="font-bold flex items-center gap-2">🗂️ เคสทั้งหมด ({searchedAll.length})</h2>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหา..."
              className="text-sm bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500 w-32 sm:w-48"
            />
          </div>
          <div className="max-h-[420px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-900">
                <tr className="text-left text-gray-500 text-xs uppercase tracking-wide">
                  <th className="pb-2 font-semibold">เหตุการณ์</th>
                  <th className="pb-2 font-semibold">สถานะ</th>
                  <th className="pb-2 font-semibold text-right">เวลา</th>
                </tr>
              </thead>
              <tbody>
                {searchedAll.map((i) => (
                  <tr
                    key={i.id}
                    onClick={() => openCase(i)}
                    className="cursor-pointer border-t border-gray-800/70 hover:bg-gray-800/50"
                  >
                    <td className="py-2.5 pr-2 max-w-[160px] truncate">{i.incident_type}</td>
                    <td className="py-2.5">
                      <StatusBadge status={i.status} />
                    </td>
                    <td className="py-2.5 text-right text-gray-500 text-xs whitespace-nowrap">
                      {timeAgo(i.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ---- Modal รายละเอียด + บันทึก action ---- */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => {
            setSelected(null);
            setAddingAction(false);
            setSelectedActionType(null);
          }}
        >
          <div
            className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold">{selected.incident_type}</h3>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(selected.created_at).toLocaleString('th-TH')}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelected(null);
                  setAddingAction(false);
                  setSelectedActionType(null);
                }}
                className="text-gray-500 hover:text-white text-xl leading-none"
              >
                ✕
              </button>
            </div>

            <div className="mb-4">
              <StatusBadge status={selected.status} />
            </div>

            {selected.description && (
              <p className="text-gray-300 bg-gray-800/50 rounded-lg p-3 mb-5">
                {selected.description}
              </p>
            )}

            {/* ฟอร์มบันทึก action: โหมด actionable (เลือกแล้วค่อยกดบันทึก 1 ครั้ง)
                หรือโหมดสรุป read-only เมื่อเคสพ้น pending ไปแล้วและยังไม่ได้กด "+ เพิ่มบันทึก" */}
            {canActNow ? (
              <div className="mb-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                  บันทึกการดำเนินการ
                </p>
                <input
                  value={handledBy}
                  onChange={(e) => setHandledBy(e.target.value)}
                  placeholder="ชื่อผู้ดำเนินการ"
                  className="w-full mb-2 p-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />

                <p className="text-[11px] text-gray-500 mb-1.5">เลือกประเภทการดำเนินการ</p>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  {QUICK_ACTIONS.map((a) => (
                    <button
                      key={a.type}
                      type="button"
                      onClick={() => setSelectedActionType(a.type)}
                      className={`flex items-center gap-2 p-2.5 rounded-lg text-sm font-bold text-left transition ${
                        selectedActionType === a.type
                          ? 'bg-blue-600 ring-2 ring-blue-300'
                          : 'bg-gray-800 hover:bg-gray-700'
                      }`}
                    >
                      <span>{a.icon}</span>
                      <span>{a.label}</span>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setSelectedActionType('note')}
                    className={`col-span-2 p-2.5 rounded-lg text-sm font-bold text-left transition flex items-center gap-2 ${
                      selectedActionType === 'note'
                        ? 'bg-blue-600 ring-2 ring-blue-300'
                        : 'bg-gray-800 hover:bg-gray-700'
                    }`}
                  >
                    <span>📝</span>
                    <span>บันทึกโน้ตอย่างเดียว (ไม่มีการเรียกหน่วยงาน)</span>
                  </button>
                </div>

                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="หมายเหตุ (ถ้ามี)"
                  className="w-full mb-3 p-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm h-16 outline-none focus:ring-2 focus:ring-blue-500"
                />

                <button
                  type="button"
                  disabled={savingAction || !selectedActionType || !handledBy.trim()}
                  onClick={handleSaveAction}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed py-2.5 rounded-lg font-bold text-sm"
                >
                  {savingAction ? 'กำลังบันทึก...' : '💾 บันทึกการดำเนินการ'}
                </button>

                {selected.status !== 'pending' && addingAction && (
                  <button
                    type="button"
                    onClick={() => {
                      setAddingAction(false);
                      setSelectedActionType(null);
                    }}
                    className="w-full text-center text-xs text-gray-500 hover:text-gray-300 underline mt-2"
                  >
                    ยกเลิก กลับไปดูสรุป
                  </button>
                )}
              </div>
            ) : (
              <div className="mb-6 bg-gray-800/40 border border-gray-800 rounded-lg p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
                  สรุปเหตุการณ์
                </p>
                <p className="text-sm text-gray-400">
                  {selected.incident_actions?.length
                    ? `เคสนี้ถูกดำเนินการไปแล้ว ${selected.incident_actions.length} รายการ ดูประวัติทั้งหมดด้านล่าง`
                    : 'ยังไม่มีการบันทึกการดำเนินการสำหรับเคสนี้'}
                </p>
                <button
                  type="button"
                  onClick={() => setAddingAction(true)}
                  className="text-sm text-blue-400 hover:text-blue-300 underline mt-2"
                >
                  + เพิ่มบันทึกการดำเนินการ
                </button>
              </div>
            )}

            {/* ประวัติการดำเนินการ */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                ประวัติการดำเนินการ
              </p>
              {!selected.incident_actions?.length ? (
                <p className="text-sm text-gray-600 py-4 text-center">ยังไม่มีการบันทึก</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {[...selected.incident_actions]
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .map((a) => {
                      const meta = actionMeta(a.action_type);
                      return (
                        <div key={a.id} className="flex items-start gap-3 text-sm">
                          <span className="text-lg leading-none">{meta.icon}</span>
                          <div className="min-w-0 flex-1">
                            <p className="text-gray-200">
                              <span className="font-bold">{a.handled_by}</span> — {meta.label}
                            </p>
                            {a.note && <p className="text-gray-500">{a.note}</p>}
                            <p className="text-[11px] text-gray-600 mt-0.5">{timeAgo(a.created_at)}</p>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}