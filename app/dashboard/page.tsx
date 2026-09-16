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

const STATUS_META: Record<
  string,
  { label: string; dot: string; text: string; bg: string; border: string }
> = {
  pending: {
    label: 'รอดำเนินการ',
    dot: 'bg-red-400',
    text: 'text-red-200',
    bg: 'bg-red-500/10',
    border: 'border-red-400/20',
  },
  in_progress: {
    label: 'กำลังดำเนินการ',
    dot: 'bg-amber-400',
    text: 'text-amber-200',
    bg: 'bg-amber-500/10',
    border: 'border-amber-400/20',
  },
  resolved: {
    label: 'เสร็จสิ้น',
    dot: 'bg-emerald-400',
    text: 'text-emerald-200',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-400/20',
  },
};

const QUICK_ACTIONS: { type: string; label: string; icon: string }[] = [
  { type: 'ambulance', label: 'เรียกรถพยาบาล', icon: '🚑' },
  { type: 'fire', label: 'เรียกดับเพลิง', icon: '🚒' },
  { type: 'police', label: 'เรียกตำรวจ', icon: '🚓' },
  { type: 'on_site_control', label: 'เจ้าหน้าที่ควบคุมเหตุแล้ว', icon: '✅' },
];

function actionMeta(type: string) {
  const found = QUICK_ACTIONS.find((action) => action.type === type);
  if (found) return found;
  return { type, label: 'บันทึกโน้ต', icon: '📝' };
}

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? {
    label: status,
    dot: 'bg-slate-400',
    text: 'text-slate-300',
    bg: 'bg-slate-500/10',
    border: 'border-slate-400/20',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold whitespace-nowrap ${meta.bg} ${meta.text} ${meta.border}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
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
  const [addingAction, setAddingAction] = useState(false);
  const [savingAction, setSavingAction] = useState(false);
  const router = useRouter();

  const openCase = (incident: Incident) => {
    setSelected(incident);
    setAddingAction(false);
    setSelectedActionType(null);
    setNote('');
  };

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

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelected(null);
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (selected) {
      const updated = incidents.find((incident) => incident.id === selected.id);
      if (updated) setSelected(updated);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incidents]);

  const total = incidents.length;
  const pending = incidents.filter((incident) => incident.status === 'pending').length;
  const inProgress = incidents.filter((incident) => incident.status === 'in_progress').length;
  const resolved = incidents.filter((incident) => incident.status === 'resolved').length;

  const filteredIncidents = incidents.filter((incident) => incident.status === filter);

  const searchedAll = incidents.filter((incident) => {
    if (!search.trim()) return true;
    const query = search.toLowerCase();

    return (
      incident.incident_type.toLowerCase().includes(query) ||
      (incident.description || '').toLowerCase().includes(query)
    );
  });

  const latestAction = (incident: Incident) => {
    if (!incident.incident_actions?.length) return null;

    return [...incident.incident_actions].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0];
  };

  const recentActivity = incidents
    .flatMap((incident) =>
      (incident.incident_actions || []).map((action) => ({ ...action, incident }))
    )
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 15);

  const canActNow = !!selected && (selected.status === 'pending' || addingAction);

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
    setSelected(null);
  };

  const summaryCards = [
    {
      label: 'ทั้งหมด',
      value: total,
      icon: '◈',
      accent: 'text-white',
      iconStyle: 'bg-slate-700/70 text-slate-200',
      line: 'bg-slate-400',
    },
    {
      label: 'รอรับเรื่อง',
      value: pending,
      icon: '!',
      accent: 'text-red-300',
      iconStyle: 'bg-red-500/15 text-red-300',
      line: 'bg-red-400',
    },
    {
      label: 'กำลังดำเนินการ',
      value: inProgress,
      icon: '↗',
      accent: 'text-amber-300',
      iconStyle: 'bg-amber-500/15 text-amber-300',
      line: 'bg-amber-400',
    },
    {
      label: 'ปิดเคสแล้ว',
      value: resolved,
      icon: '✓',
      accent: 'text-emerald-300',
      iconStyle: 'bg-emerald-500/15 text-emerald-300',
      line: 'bg-emerald-400',
    },
  ];

  const filterTabs = [
    {
      id: 'pending',
      label: 'รอดำเนินการ',
      count: pending,
      dot: 'bg-red-400',
      active: 'border-red-400/30 bg-red-500/10 text-red-200',
    },
    {
      id: 'in_progress',
      label: 'กำลังดำเนินการ',
      count: inProgress,
      dot: 'bg-amber-400',
      active: 'border-amber-400/30 bg-amber-500/10 text-amber-200',
    },
    {
      id: 'resolved',
      label: 'เสร็จสิ้น',
      count: resolved,
      dot: 'bg-emerald-400',
      active: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200',
    },
  ];

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050914] px-4 py-5 text-white sm:px-6 sm:py-7">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.035)_1px,transparent_1px)] bg-[size:48px_48px]" />
        <div className="absolute left-[-14rem] top-[-14rem] h-[35rem] w-[35rem] rounded-full bg-blue-500/10 blur-[140px]" />
        <div className="absolute right-[-15rem] top-[20rem] h-[32rem] w-[32rem] rounded-full bg-red-500/5 blur-[140px]" />
      </div>

      <div className="relative mx-auto w-full max-w-7xl">
        <nav className="flex flex-col gap-4 rounded-2xl border border-slate-800/90 bg-slate-900/65 p-4 shadow-xl shadow-black/20 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:p-5">
  <div className="flex min-w-0 items-center gap-3">
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-blue-400/20 bg-blue-500/10 text-xl text-blue-200">
      🛡️
    </div>

    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <h1 className="text-sm font-black tracking-[0.12em] text-white">
          RESCUE STUDIO
        </h1>

        <span className="text-[10px] font-semibold tracking-[0.16em] text-blue-300">
          CONSOLE CENTER
        </span>

        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/15 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-200">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          เชื่อมต่อสด
        </span>
      </div>

      <p className="mt-1 text-xs text-slate-400">ระบบติดตามเหตุฉุกเฉิน</p>
    </div>
  </div>

  <div className="flex items-center gap-2 sm:gap-3">
    <Link
      href="/dashboard/points"
      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-blue-400/20 bg-blue-500/10 px-3.5 py-2.5 text-sm font-semibold text-blue-200 transition hover:border-blue-400/40 hover:bg-blue-500/20 hover:text-white sm:flex-none"
    >
      <span>📍</span>
      จัดการจุด QR
    </Link>

    <button
      onClick={() => {
        supabase.auth.signOut();
        router.push('/login');
      }}
      className="rounded-xl px-3.5 py-2.5 text-sm font-semibold text-red-300 transition hover:bg-red-500/10 hover:text-red-200"
    >
      ออกจากระบบ
    </button>
  </div>
</nav>

        <section className="mt-6">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold tracking-[0.16em] text-slate-500">
                OPERATIONAL OVERVIEW
              </p>
              <h2 className="mt-1 text-xl font-bold text-white">ภาพรวมเหตุการณ์</h2>
            </div>
            <p className="text-sm text-slate-500">อัปเดตสถานะเหตุการณ์แบบเรียลไทม์</p>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {summaryCards.map((item) => (
              <div
                key={item.label}
                className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-lg shadow-black/10 backdrop-blur-sm transition hover:-translate-y-0.5 hover:border-slate-700"
              >
                <div className={`absolute left-0 top-0 h-0.5 w-full ${item.line}`} />

                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium text-slate-400">{item.label}</p>
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold ${item.iconStyle}`}
                  >
                    {item.icon}
                  </span>
                </div>

                <p className={`mt-5 text-3xl font-bold tracking-tight ${item.accent}`}>
                  {item.value}
                </p>
                <p className="mt-1 text-xs text-slate-600">เหตุการณ์ในระบบ</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-7">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-2 shadow-xl shadow-black/10 backdrop-blur-sm">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {filterTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setFilter(tab.id)}
                  className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                    filter === tab.id
                      ? tab.active
                      : 'border-transparent text-slate-400 hover:bg-slate-800/70 hover:text-slate-200'
                  }`}
                >
                  <span className={`h-2 w-2 shrink-0 rounded-full ${tab.dot}`} />
                  <span>{tab.label}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      filter === tab.id ? 'bg-white/10' : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-6">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold tracking-[0.16em] text-slate-500">INCIDENT QUEUE</p>
              <h2 className="mt-1 text-xl font-bold text-white">รายการเหตุการณ์</h2>
            </div>
            {!loading && (
              <p className="text-sm text-slate-500">
                แสดง <span className="font-semibold text-slate-300">{filteredIncidents.length}</span> รายการ
              </p>
            )}
          </div>

          <div className="flex flex-col gap-3">
            {loading ? (
              <div className="grid gap-3">
                {[0, 1, 2].map((item) => (
                  <div
                    key={item}
                    className="h-36 animate-pulse rounded-2xl border border-slate-800 bg-slate-900/40"
                  />
                ))}
              </div>
            ) : filteredIncidents.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/35 px-5 py-14 text-center">
                <span className="text-3xl">◌</span>
                <p className="mt-3 font-semibold text-slate-300">ไม่พบข้อมูลในหมวดนี้</p>
                <p className="mt-1 text-sm text-slate-500">เมื่อมีเหตุการณ์ใหม่ ระบบจะแสดงที่นี่</p>
              </div>
            ) : (
              filteredIncidents.map((incident) => {
                const last = latestAction(incident);
                const statusAccent =
                  incident.status === 'pending'
                    ? 'border-l-red-400'
                    : incident.status === 'in_progress'
                      ? 'border-l-amber-400'
                      : 'border-l-emerald-400';

                return (
                  <article
                    key={incident.id}
                    className={`rounded-2xl border border-slate-800 border-l-4 bg-slate-900/60 p-5 shadow-lg shadow-black/10 backdrop-blur-sm transition hover:border-slate-700 ${statusAccent}`}
                  >
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge status={incident.status} />
                          <span className="text-xs text-slate-500">{timeAgo(incident.created_at)}</span>
                        </div>

                        <h3 className="mt-3 text-lg font-bold text-white">
                          {incident.status === 'pending' ? (
                            <span className="text-red-300">⚠️ NEW! ฉุกเฉิน!</span>
                          ) : (
                            incident.incident_type
                          )}
                        </h3>

                        <p className="mt-2 break-words text-sm leading-6 text-slate-300">
                          {incident.description}
                        </p>

                        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span className="rounded-full border border-slate-700 bg-slate-950/40 px-2.5 py-1">
                            {new Date(incident.created_at).toLocaleString('th-TH')}
                          </span>

                          {last && (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-950/40 px-2.5 py-1">
                              <span>{actionMeta(last.action_type).icon}</span>
                              {actionMeta(last.action_type).label} โดย {last.handled_by}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 lg:w-auto lg:justify-end">
                        <button
                          onClick={() => openCase(incident)}
                          className="rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-sm font-bold text-slate-200 transition hover:border-slate-600 hover:bg-slate-700"
                        >
                          {incident.status === 'pending' ? 'ดำเนินการ' : 'ดูสรุป'}
                        </button>

                        {incident.status === 'pending' && (
                          <button
                            onClick={() => updateStatus(incident.id, 'in_progress')}
                            className="rounded-xl border border-amber-400/20 bg-amber-500/15 px-4 py-2.5 text-sm font-bold text-amber-200 transition hover:bg-amber-500/25"
                          >
                            รับเรื่อง
                          </button>
                        )}

                        {incident.status !== 'resolved' && (
                          <button
                            onClick={() => updateStatus(incident.id, 'resolved')}
                            className="rounded-xl border border-emerald-400/20 bg-emerald-500/15 px-4 py-2.5 text-sm font-bold text-emerald-200 transition hover:bg-emerald-500/25"
                          >
                            ปิดเคส
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>

        <section className="mt-8 grid gap-6 pb-8 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl shadow-black/10 backdrop-blur-sm">
            <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <p className="text-xs font-semibold tracking-[0.16em] text-slate-500">ACTIVITY LOG</p>
                <h2 className="mt-1 font-bold text-white">Log ล่าสุด</h2>
              </div>
              <span className="rounded-full border border-slate-700 bg-slate-950/40 px-2.5 py-1 text-xs text-slate-500">
                {recentActivity.length} รายการ
              </span>
            </div>

            {recentActivity.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm text-slate-500">ยังไม่มีการบันทึก action</p>
              </div>
            ) : (
              <div className="mt-4 flex max-h-[420px] flex-col gap-3 overflow-y-auto pr-1">
                {recentActivity.map((action) => {
                  const meta = actionMeta(action.action_type);

                  return (
                    <div
                      key={action.id}
                      className="flex items-start gap-3 rounded-xl border border-transparent p-2 transition hover:border-slate-800 hover:bg-slate-950/30"
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800 text-base">
                        {meta.icon}
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="text-sm leading-6 text-slate-300">
                          <span className="font-bold text-white">{action.handled_by}</span> {meta.label}
                          <span className="text-slate-500"> · {action.incident.incident_type}</span>
                        </p>

                        {action.note && <p className="truncate text-sm text-slate-500">{action.note}</p>}

                        <p className="mt-1 text-[11px] text-slate-600">{timeAgo(action.created_at)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl shadow-black/10 backdrop-blur-sm">
            <div className="flex flex-col gap-3 border-b border-slate-800 pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold tracking-[0.16em] text-slate-500">INCIDENT ARCHIVE</p>
                <h2 className="mt-1 font-bold text-white">เคสทั้งหมด ({searchedAll.length})</h2>
              </div>

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="ค้นหา..."
                className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3.5 py-2 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 sm:w-48"
              />
            </div>

            <div className="max-h-[420px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-900">
                  <tr className="text-left text-[11px] font-semibold tracking-[0.12em] text-slate-500">
                    <th className="pb-3 pt-4">เหตุการณ์</th>
                    <th className="pb-3 pt-4">สถานะ</th>
                    <th className="pb-3 pt-4 text-right">เวลา</th>
                  </tr>
                </thead>

                <tbody>
                  {searchedAll.map((incident) => (
                    <tr
                      key={incident.id}
                      onClick={() => openCase(incident)}
                      className="cursor-pointer border-t border-slate-800/80 transition hover:bg-slate-800/45"
                    >
                      <td className="max-w-[160px] truncate py-3 pr-2 font-medium text-slate-200">
                        {incident.incident_type}
                      </td>
                      <td className="py-3">
                        <StatusBadge status={incident.status} />
                      </td>
                      <td className="whitespace-nowrap py-3 text-right text-xs text-slate-500">
                        {timeAgo(incident.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#020617]/85 p-4 backdrop-blur-md"
          onClick={() => {
            setSelected(null);
            setAddingAction(false);
            setSelectedActionType(null);
          }}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-slate-700 bg-[#0b1222] p-5 shadow-2xl shadow-black/50 sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-5">
              <div className="min-w-0">
                <p className="text-xs font-semibold tracking-[0.16em] text-blue-300">INCIDENT DETAIL</p>
                <h3 className="mt-2 break-words text-lg font-bold text-white">{selected.incident_type}</h3>
                <p className="mt-1 text-xs text-slate-500">
                  {new Date(selected.created_at).toLocaleString('th-TH')}
                </p>
              </div>

              <button
                onClick={() => {
                  setSelected(null);
                  setAddingAction(false);
                  setSelectedActionType(null);
                }}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-700 text-lg text-slate-500 transition hover:border-slate-600 hover:bg-slate-800 hover:text-white"
                aria-label="ปิดหน้าต่าง"
              >
                ✕
              </button>
            </div>

            <div className="mt-5">
              <StatusBadge status={selected.status} />
            </div>

            {selected.description && (
              <p className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/45 p-4 text-sm leading-6 text-slate-300">
                {selected.description}
              </p>
            )}

            {canActNow ? (
              <div className="mt-6">
                <p className="text-xs font-semibold tracking-[0.14em] text-slate-500">
                  บันทึกการดำเนินการ
                </p>

                <input
                  value={handledBy}
                  onChange={(event) => setHandledBy(event.target.value)}
                  placeholder="ชื่อผู้ดำเนินการ"
                  className="mt-3 w-full rounded-xl border border-slate-700 bg-slate-950/60 p-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
                />

                <p className="mb-2 mt-4 text-[11px] font-medium text-slate-500">
                  เลือกประเภทการดำเนินการ
                </p>

                <div className="grid grid-cols-2 gap-2">
                  {QUICK_ACTIONS.map((action) => (
                    <button
                      key={action.type}
                      type="button"
                      onClick={() => setSelectedActionType(action.type)}
                      className={`flex items-center gap-2 rounded-xl border p-3 text-left text-sm font-bold transition ${
                        selectedActionType === action.type
                          ? 'border-blue-400/50 bg-blue-500/20 text-blue-100 ring-2 ring-blue-400/20'
                          : 'border-slate-700 bg-slate-800/70 text-slate-300 hover:border-slate-600 hover:bg-slate-800'
                      }`}
                    >
                      <span>{action.icon}</span>
                      <span>{action.label}</span>
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => setSelectedActionType('note')}
                    className={`col-span-2 flex items-center gap-2 rounded-xl border p-3 text-left text-sm font-bold transition ${
                      selectedActionType === 'note'
                        ? 'border-blue-400/50 bg-blue-500/20 text-blue-100 ring-2 ring-blue-400/20'
                        : 'border-slate-700 bg-slate-800/70 text-slate-300 hover:border-slate-600 hover:bg-slate-800'
                    }`}
                  >
                    <span>📝</span>
                    <span>บันทึกโน้ตอย่างเดียว (ไม่มีการเรียกหน่วยงาน)</span>
                  </button>
                </div>

                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="หมายเหตุ (ถ้ามี)"
                  className="mt-3 h-20 w-full rounded-xl border border-slate-700 bg-slate-950/60 p-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
                />

                <button
                  type="button"
                  disabled={savingAction || !selectedActionType || !handledBy.trim()}
                  onClick={handleSaveAction}
                  className="mt-3 w-full rounded-xl bg-blue-400 py-3 text-sm font-bold text-slate-950 transition hover:bg-blue-300 disabled:cursor-not-allowed disabled:opacity-40"
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
                    className="mt-3 w-full text-center text-xs text-slate-500 underline transition hover:text-slate-300"
                  >
                    ยกเลิก กลับไปดูสรุป
                  </button>
                )}
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/35 p-4">
                <p className="text-xs font-semibold tracking-[0.14em] text-slate-500">สรุปเหตุการณ์</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {selected.incident_actions?.length
                    ? `เคสนี้ถูกดำเนินการไปแล้ว ${selected.incident_actions.length} รายการ ดูประวัติทั้งหมดด้านล่าง`
                    : 'ยังไม่มีการบันทึกการดำเนินการสำหรับเคสนี้'}
                </p>
                <button
                  type="button"
                  onClick={() => setAddingAction(true)}
                  className="mt-3 text-sm font-semibold text-blue-300 underline transition hover:text-blue-200"
                >
                  + เพิ่มบันทึกการดำเนินการ
                </button>
              </div>
            )}

            <div className="mt-7 border-t border-slate-800 pt-5">
              <p className="text-xs font-semibold tracking-[0.14em] text-slate-500">
                ประวัติการดำเนินการ
              </p>

              {!selected.incident_actions?.length ? (
                <p className="py-7 text-center text-sm text-slate-600">ยังไม่มีการบันทึก</p>
              ) : (
                <div className="mt-4 flex flex-col gap-3">
                  {[...selected.incident_actions]
                    .sort(
                      (a, b) =>
                        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                    )
                    .map((action) => {
                      const meta = actionMeta(action.action_type);

                      return (
                        <div
                          key={action.id}
                          className="flex items-start gap-3 rounded-xl border border-slate-800/80 bg-slate-950/25 p-3"
                        >
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-800">
                            {meta.icon}
                          </span>

                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-slate-200">
                              <span className="font-bold text-white">{action.handled_by}</span> —{' '}
                              {meta.label}
                            </p>
                            {action.note && <p className="mt-1 text-sm text-slate-500">{action.note}</p>}
                            <p className="mt-1 text-[11px] text-slate-600">{timeAgo(action.created_at)}</p>
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
    </main>
  );
}