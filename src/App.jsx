import React, { useState, useEffect, useMemo } from "react";
import {
  Home, Search, FileText, Users, CalendarDays, User, X, Plus, Play, Square,
  Check, Trash2, Send, DollarSign, MessageCircle, Paperclip, ShieldCheck,
  MapPin, ChevronLeft, ChevronRight, Palette, Link2, Image as ImageIcon, Bell, ChevronRight as Chev,
  Car, Receipt, AlertTriangle, CheckCircle2, StickyNote, ArrowLeft,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";

// ---------------- helpers ----------------
const uid = () => Math.random().toString(36).slice(2, 10);
const todayStr = () => new Date().toISOString().slice(0, 10);
const fmtDate = (d) => new Date(d + "T00:00:00").toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });
const fmtShort = (d) => new Date(d + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short" });
const fmtTime = (t) => { if (!t) return "--:--"; const [h, m] = t.split(":"); const hour = ((+h + 11) % 12) + 1; return `${hour}:${m}${+h < 12 ? "am" : "pm"}`; };
const fmtMoney = (n) => (n || 0).toLocaleString("en-AU", { style: "currency", currency: "AUD" });
function shiftHours(s) {
  const start = s.actualStart || s.plannedStart, end = s.actualEnd || s.plannedEnd;
  if (!start || !end) return 0;
  const [sh, sm] = start.split(":").map(Number), [eh, em] = end.split(":").map(Number);
  let mins = (eh * 60 + em) - (sh * 60 + sm); if (mins < 0) mins += 1440;
  return mins / 60;
}
async function loadKey(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
async function saveKey(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // best effort
  }
}

const CLIENT_COLORS = ["#0f766e", "#b45309", "#7c3aed", "#be123c", "#0369a1", "#4d7c0f", "#a21caf"];
const colorFor = (clients, id) => CLIENT_COLORS[Math.max(0, clients.findIndex((c) => c.id === id)) % CLIENT_COLORS.length];

const THEMES = {
  sky: { active: "text-blue-600", btn: "bg-blue-600", chip: "bg-blue-50 text-blue-700", ring: "focus:ring-blue-500 focus:border-blue-500", hero: "bg-blue-600" },
  rose: { active: "text-rose-600", btn: "bg-rose-600", chip: "bg-rose-50 text-rose-700", ring: "focus:ring-rose-500 focus:border-rose-500", hero: "bg-rose-500" },
  emerald: { active: "text-emerald-600", btn: "bg-emerald-600", chip: "bg-emerald-50 text-emerald-700", ring: "focus:ring-emerald-500 focus:border-emerald-500", hero: "bg-emerald-600" },
  violet: { active: "text-violet-600", btn: "bg-violet-600", chip: "bg-violet-50 text-violet-700", ring: "focus:ring-violet-500 focus:border-violet-500", hero: "bg-violet-600" },
  amber: { active: "text-amber-600", btn: "bg-amber-600", chip: "bg-amber-50 text-amber-700", ring: "focus:ring-amber-500 focus:border-amber-500", hero: "bg-amber-500" },
  slate: { active: "text-slate-700", btn: "bg-slate-700", chip: "bg-slate-100 text-slate-700", ring: "focus:ring-slate-500 focus:border-slate-500", hero: "bg-slate-700" },
};
const TILES = [
  { key: "notes", label: "Notes", icon: StickyNote, bg: "bg-blue-50", fg: "text-blue-600" },
  { key: "mileage", label: "Mileage", icon: Car, bg: "bg-rose-50", fg: "text-rose-600" },
  { key: "expenses", label: "Expenses", icon: Receipt, bg: "bg-amber-50", fg: "text-amber-600" },
  { key: "outstanding", label: "Outstanding", icon: AlertTriangle, bg: "bg-violet-50", fg: "text-violet-600" },
];
function greeting() { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"; }

const SAMPLE_JOBS = [
  { id: "j1", clientName: "Margaret H.", suburb: "Noosaville, QLD", distanceKm: 4, bio: "Looking for companionship and light domestic help, two mornings a week. Love a good chat and a cup of tea.", support: "Companionship · Domestic assistance" },
  { id: "j2", clientName: "Robert T.", suburb: "Noosa Heads, QLD", distanceKm: 7, bio: "Need help with personal care and transport to appointments. Easygoing, retired teacher.", support: "Personal care · Transport" },
  { id: "j3", clientName: "The Nguyen family", suburb: "Tewantin, QLD", distanceKm: 9, bio: "Support for our father recovering from surgery, overnight shifts preferred for the next month.", support: "Overnight care · Mobility support" },
  { id: "j4", clientName: "Elaine P.", suburb: "Sunshine Beach, QLD", distanceKm: 12, bio: "Weekend respite care so family can take a break. Loves the garden and short walks.", support: "Respite · Community access" },
];

const inputCls = (theme) => `w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-1 ${THEMES[theme].ring}`;

function Field({ label, children }) {
  return <label className="mb-3 block"><span className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-500">{label}</span>{children}</label>;
}
function Empty({ label }) { return <div className="py-10 text-center text-sm text-stone-400">{label}</div>; }
function Modal({ title, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-stone-900/40 sm:items-center">
      <div className={`max-h-[90vh] w-full ${wide ? "max-w-lg" : "max-w-md"} overflow-y-auto rounded-t-2xl bg-white p-5 sm:rounded-2xl`}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-stone-900">{title}</h2>
          <button onClick={onClose} className="rounded-full p-1 text-stone-400 hover:bg-stone-100"><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
function StatusChip({ status, theme }) {
  const map = { valid: "bg-emerald-100 text-emerald-800", expiring: "bg-amber-100 text-amber-800", expired: "bg-rose-100 text-rose-700" };
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${map[status]}`}>{status}</span>;
}
function docStatus(expiry) {
  if (!expiry) return "valid";
  const days = (new Date(expiry) - new Date()) / 86400000;
  if (days < 0) return "expired";
  if (days < 30) return "expiring";
  return "valid";
}

// ==================================================================
export default function App() {
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState("home");
  const [theme, setTheme] = useState("sky");
  const [workerName, setWorkerName] = useState("");
  const [clients, setClients] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [applications, setApplications] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [compliance, setCompliance] = useState([]);
  const [mileage, setMileage] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [radiusKm, setRadiusKm] = useState(20);

  const [shiftDetail, setShiftDetail] = useState(null);
  const [clientDetail, setClientDetail] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [shiftModal, setShiftModal] = useState(null);
  const [clientModal, setClientModal] = useState(null);
  const [invoiceModal, setInvoiceModal] = useState(null);
  const [viewInvoice, setViewInvoice] = useState(null);
  const [dayModal, setDayModal] = useState(null);
  const [noteClient, setNoteClient] = useState(null);
  const [mileageModal, setMileageModal] = useState(null);
  const [expenseModal, setExpenseModal] = useState(null);

  useEffect(() => { (async () => {
    const [c, s, i, a, b, cp, mi, ex, prefs] = await Promise.all([
      loadKey("clients", []), loadKey("shifts", []), loadKey("invoices", []),
      loadKey("applications", []), loadKey("blocks", []), loadKey("compliance", []),
      loadKey("mileage", []), loadKey("expenses", []),
      loadKey("prefs", { theme: "sky", radiusKm: 20, workerName: "" }),
    ]);
    setClients(c); setShifts(s); setInvoices(i); setApplications(a); setBlocks(b); setCompliance(cp);
    setMileage(mi); setExpenses(ex);
    setTheme(prefs.theme || "sky"); setRadiusKm(prefs.radiusKm || 20); setWorkerName(prefs.workerName || "");
    setReady(true);
  })(); }, []);

  const persist = { clients: (v) => { setClients(v); saveKey("clients", v); }, shifts: (v) => { setShifts(v); saveKey("shifts", v); },
    invoices: (v) => { setInvoices(v); saveKey("invoices", v); }, applications: (v) => { setApplications(v); saveKey("applications", v); },
    blocks: (v) => { setBlocks(v); saveKey("blocks", v); }, compliance: (v) => { setCompliance(v); saveKey("compliance", v); },
    mileage: (v) => { setMileage(v); saveKey("mileage", v); }, expenses: (v) => { setExpenses(v); saveKey("expenses", v); },
    prefs: (t, r, n) => { saveKey("prefs", { theme: t, radiusKm: r, workerName: n }); } };

  const client = (id) => clients.find((c) => c.id === id);
  const clientName = (id) => client(id)?.name || "Unknown client";

  function clockAction(shift, action) {
    const now = new Date().toTimeString().slice(0, 5);
    const next = shifts.map((s) => s.id === shift.id ? { ...s, status: action === "start" ? "active" : "completed", ...(action === "start" ? { actualStart: now } : { actualEnd: now }) } : s);
    persist.shifts(next);
    if (shiftDetail?.id === shift.id) setShiftDetail(next.find((s) => s.id === shift.id));
  }
  function saveShiftNote(shiftId, text, visibleToClient) {
    const next = shifts.map((s) => s.id === shiftId ? { ...s, note: { text, visibleToClient, savedAt: new Date().toISOString() } } : s);
    persist.shifts(next);
    setShiftDetail(next.find((s) => s.id === shiftId));
  }
  function saveShift(form) {
    if (form.id) persist.shifts(shifts.map((s) => s.id === form.id ? { ...s, ...form } : s));
    else persist.shifts([...shifts, { ...form, id: uid(), status: "scheduled" }]);
    setShiftModal(null);
  }
  function saveClient(form) {
    if (form.id) persist.clients(clients.map((c) => c.id === form.id ? { ...c, ...form } : c));
    else persist.clients([...clients, { ...form, id: uid(), documents: [], messages: [], generalNotes: [] }]);
    setClientModal(null);
  }
  function addClientDoc(clientId, doc) {
    persist.clients(clients.map((c) => c.id === clientId ? { ...c, documents: [...(c.documents || []), { ...doc, id: uid() }] } : c));
  }
  function addGeneralNote(clientId, text, visibleToClient) {
    persist.clients(clients.map((c) => c.id === clientId ? { ...c, generalNotes: [...(c.generalNotes || []), { id: uid(), text, visibleToClient, date: todayStr() }] } : c));
  }
  function sendMessage(clientId, text) {
    const next = clients.map((c) => c.id === clientId ? { ...c, messages: [...(c.messages || []), { id: uid(), from: "worker", text, ts: new Date().toISOString() }] } : c);
    persist.clients(next);
    setClientDetail(next.find((c) => c.id === clientId));
  }
  function apply(jobId) { if (!applications.includes(jobId)) persist.applications([...applications, jobId]); }
  function addBlock(b) { persist.blocks([...blocks, { ...b, id: uid() }]); }
  function removeBlock(id) { persist.blocks(blocks.filter((b) => b.id !== id)); }
  function saveCompliance(list) { persist.compliance(list); }
  function addMileage(entry) { persist.mileage([...mileage, { ...entry, id: uid() }]); }
  function deleteMileage(id) { persist.mileage(mileage.filter((m) => m.id !== id)); }
  function addExpense(entry) { persist.expenses([...expenses, { ...entry, id: uid() }]); }
  function deleteExpense(id) { persist.expenses(expenses.filter((e) => e.id !== id)); }
  function changeTheme(t) { setTheme(t); persist.prefs(t, radiusKm, workerName); }
  function changeRadius(r) { setRadiusKm(r); persist.prefs(theme, r, workerName); }
  function changeName(n) { setWorkerName(n); persist.prefs(theme, radiusKm, n); }

  function billable(clientId) { return shifts.filter((s) => s.clientId === clientId && s.status === "completed"); }
  function generateInvoice(clientId, lineItems, gst) {
    const subtotal = lineItems.reduce((sum, li) => sum + li.qty * li.rate, 0);
    const total = gst ? subtotal * 1.1 : subtotal;
    const inv = { id: uid(), number: `INV-${String(invoices.length + 1).padStart(4, "0")}`, clientId, dateIssued: todayStr(),
      lineItems, subtotal, gst, total, status: "draft", recipientEmail: client(clientId)?.email || "" };
    persist.invoices([...invoices, inv]);
    const billed = billable(clientId).map((s) => s.id);
    persist.shifts(shifts.map((s) => billed.includes(s.id) ? { ...s, status: "invoiced" } : s));
    setInvoiceModal(null); setViewInvoice(inv);
  }
  function setInvoiceStatus(id, status) { persist.invoices(invoices.map((i) => i.id === id ? { ...i, status } : i)); }

  const th = THEMES[theme];
  if (!ready) return <div className="flex h-screen items-center justify-center bg-stone-100 text-stone-400">Loading…</div>;

  const todaysShifts = shifts.filter((s) => s.plannedDate === todayStr());
  const weekHours = shifts.filter((s) => s.status === "completed" || s.status === "invoiced").reduce((sum, s) => sum + shiftHours(s), 0);
  const unpaidTotal = invoices.filter((i) => i.status !== "paid").reduce((sum, i) => sum + i.total, 0);

  const titles = { home: "Today", find: "Find clients", invoices: "Invoices", clients: "My clients", calendar: "Calendar", notes: "Notes", mileage: "Mileage", expenses: "Expenses", outstanding: "Outstanding" };
  const subPages = ["notes", "mileage", "expenses", "outstanding"];
  function notesStatus(clientId) {
    const pending = shifts.some((s) => s.clientId === clientId && (s.status === "completed" || s.status === "invoiced") && !s.note?.text);
    return pending ? "pending" : "done";
  }
  const expiringDocs = compliance.filter((d) => d.expiry && docStatus(d.expiry) !== "valid");
  const pendingNoteClients = clients.filter((c) => notesStatus(c.id) === "pending");
  const unpaidInvoices = invoices.filter((i) => i.status !== "paid");
  const outstandingCount = unpaidInvoices.length + expiringDocs.length + pendingNoteClients.length + applications.length;
  const nextShift = todaysShifts.find((s) => s.status !== "completed" && s.status !== "invoiced");
  const weekStrip = (() => {
    const now = new Date(); const day = now.getDay();
    const monday = new Date(now); monday.setDate(now.getDate() - ((day + 6) % 7));
    return Array.from({ length: 7 }, (_, i) => { const d = new Date(monday); d.setDate(monday.getDate() + i); return d; });
  })();
  const dateKey = (d) => d.toISOString().slice(0, 10);

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-white font-sans">
      <header className="flex items-center justify-between border-b border-stone-100 px-5 pb-4 pt-6">
        {tab === "home" ? (
          <button onClick={() => setShowProfile(true)} className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-stone-100 text-stone-400 overflow-hidden">
              {workerName ? <span className="font-bold text-stone-500">{workerName[0].toUpperCase()}</span> : <User size={20} />}
            </div>
            <p className="text-lg font-bold text-stone-900">{greeting()}{workerName ? `, ${workerName}` : ""} 👋</p>
          </button>
        ) : subPages.includes(tab) ? (
          <button onClick={() => setTab("home")} className="flex items-center gap-2 text-xl font-bold text-stone-900">
            <ArrowLeft size={20} className="text-stone-400" /> {titles[tab]}
          </button>
        ) : (
          <h1 className="text-xl font-bold text-stone-900">{titles[tab]}</h1>
        )}
        <button onClick={() => setTab("outstanding")} className="relative rounded-full bg-stone-50 p-2.5">
          <Bell size={19} className="text-stone-400" />
          {outstandingCount > 0 && <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">{outstandingCount}</span>}
        </button>
      </header>

      <main className="flex-1 overflow-y-auto bg-stone-50 px-4 pb-24 pt-4">
        {tab === "home" && (
          <div>
            <div className="mb-5 grid grid-cols-4 gap-2">
              {TILES.map((t) => (
                <button key={t.key} onClick={() => setTab(t.key)} className={`flex flex-col items-center gap-1.5 rounded-2xl ${t.bg} py-3.5`}>
                  <t.icon size={20} className={t.fg} />
                  <span className="text-[10px] font-medium leading-tight text-stone-600 text-center px-0.5">{t.label}</span>
                </button>
              ))}
            </div>

            <div className="mb-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-stone-100 bg-white p-4"><p className="text-xs text-stone-500">Hours logged</p><p className="text-2xl font-bold tabular-nums text-stone-900">{weekHours.toFixed(1)}</p></div>
              <div className="rounded-2xl border border-stone-100 bg-white p-4"><p className="text-xs text-stone-500">Awaiting payment</p><p className="text-2xl font-bold tabular-nums text-amber-600">{fmtMoney(unpaidTotal)}</p></div>
            </div>

            {nextShift && (
              <button onClick={() => setShiftDetail(nextShift)} className={`mb-5 block w-full rounded-3xl ${th.hero} p-5 text-left text-white`}>
                <p className="text-xs font-medium uppercase tracking-wide text-white/70">Next up today</p>
                <p className="mt-1 text-xl font-bold">{clientName(nextShift.clientId)}</p>
                <p className="mt-1 text-sm text-white/90">{fmtTime(nextShift.plannedStart)} – {fmtTime(nextShift.plannedEnd)} · {shiftHours(nextShift).toFixed(1)} hrs</p>
                {nextShift.status === "scheduled" && <span onClick={(e) => { e.stopPropagation(); clockAction(nextShift, "start"); }} className="mt-3 inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1.5 text-xs font-semibold"><Play size={12} /> Clock in</span>}
                {nextShift.status === "active" && <span onClick={(e) => { e.stopPropagation(); clockAction(nextShift, "stop"); }} className="mt-3 inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1.5 text-xs font-semibold"><Square size={12} /> Clock out</span>}
              </button>
            )}

            <div className="mb-4 flex justify-between rounded-2xl border border-stone-100 bg-white px-2 py-3">
              {weekStrip.map((d) => {
                const has = shifts.some((s) => s.plannedDate === dateKey(d));
                const isToday = dateKey(d) === todayStr();
                return (
                  <div key={d.toISOString()} className="flex flex-1 flex-col items-center gap-1">
                    <span className="text-[10px] text-stone-400">{["M","T","W","T","F","S","S"][(d.getDay() + 6) % 7]}</span>
                    <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs ${isToday ? `${th.btn} font-bold text-white` : "text-stone-600"}`}>{d.getDate()}</span>
                    <span className={`h-1.5 w-1.5 rounded-full ${has ? th.btn : "bg-transparent"}`} />
                  </div>
                );
              })}
            </div>

            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-500">Today's shifts</h3>
              <button onClick={() => setShiftModal({})} className={`flex items-center gap-1 text-xs font-semibold ${th.active}`}><Plus size={14} /> Add</button>
            </div>
            <div className="rounded-2xl border border-stone-100 bg-white px-3">
              {todaysShifts.length === 0 && <Empty label="Nothing on today." />}
              {todaysShifts.map((s) => (
                <div key={s.id} className="flex items-center gap-3 border-b border-stone-100 py-3 px-1 last:border-b-0">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: colorFor(clients, s.clientId) }} />
                  <div className="min-w-0 flex-1" onClick={() => setShiftDetail(s)}>
                    <div className="truncate text-sm font-semibold text-stone-900">{clientName(s.clientId)}</div>
                    <div className="text-xs tabular-nums text-stone-500">{fmtTime(s.plannedStart)}–{fmtTime(s.plannedEnd)} · {shiftHours(s).toFixed(1)} hrs scheduled</div>
                  </div>
                  {s.status === "scheduled" && <button onClick={() => clockAction(s, "start")} className={`flex items-center gap-1 rounded-full ${th.btn} px-3 py-1.5 text-xs font-semibold text-white`}><Play size={12} /> Start</button>}
                  {s.status === "active" && <button onClick={() => clockAction(s, "stop")} className="flex items-center gap-1 rounded-full bg-rose-500 px-3 py-1.5 text-xs font-semibold text-white"><Square size={12} /> Stop</button>}
                  {(s.status === "completed" || s.status === "invoiced") && <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600"><Check size={14} /> Done</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "find" && (
          <FindClientsView jobs={SAMPLE_JOBS} applications={applications} onApply={apply} radiusKm={radiusKm} onRadius={changeRadius} theme={theme} th={th} />
        )}

        {tab === "invoices" && (
          <InvoicesView invoices={invoices} clients={clients} billable={billable} clientName={clientName} onNew={() => setInvoiceModal(true)} onView={setViewInvoice} th={th} />
        )}

        {tab === "clients" && (
          <ClientsListView clients={clients} onAdd={() => setClientModal({})} onOpen={setClientDetail} th={th} />
        )}

        {tab === "calendar" && (
          <CalendarView shifts={shifts} clients={clients} blocks={blocks} onDay={setDayModal} th={th} />
        )}

        {tab === "notes" && (
          <NotesView clients={clients} notesStatus={notesStatus} onOpen={setNoteClient} th={th} />
        )}

        {tab === "mileage" && (
          <MileageView mileage={mileage} clients={clients} clientName={clientName} onAdd={() => setMileageModal({})} onDelete={deleteMileage} th={th} />
        )}

        {tab === "expenses" && (
          <ExpensesView expenses={expenses} mileage={mileage} invoices={invoices} onAdd={() => setExpenseModal({})} onDelete={deleteExpense} th={th} theme={theme} />
        )}

        {tab === "outstanding" && (
          <OutstandingView unpaidInvoices={unpaidInvoices} expiringDocs={expiringDocs} pendingNoteClients={pendingNoteClients} applications={applications} jobs={SAMPLE_JOBS}
            todaysShifts={todaysShifts} clientName={clientName} onOpenInvoice={setViewInvoice} onOpenProfile={() => setShowProfile(true)} onOpenClient={(id) => setNoteClient(client(id))} th={th} />
        )}
      </main>

      <nav className="fixed bottom-0 left-1/2 flex w-full max-w-md -translate-x-1/2 border-t border-stone-200 bg-white">
        {[["home", "Home", Home], ["find", "Find", Search], ["invoices", "Invoices", FileText], ["clients", "Clients", Users], ["calendar", "Calendar", CalendarDays]].map(([key, label, Icon]) => (
          <button key={key} onClick={() => setTab(key)} className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] ${tab === key ? th.active : "text-stone-400"}`}>
            <Icon size={19} strokeWidth={tab === key ? 2.4 : 1.8} />{label}
          </button>
        ))}
      </nav>

      {shiftDetail && (
        <ShiftDetailModal shift={shiftDetail} client={client(shiftDetail.clientId)} onClose={() => setShiftDetail(null)} onSaveNote={saveShiftNote} onClock={clockAction} th={th} theme={theme} />
      )}
      {shiftModal !== null && <ShiftModal shift={shiftModal} clients={clients} onSave={saveShift} onClose={() => setShiftModal(null)} theme={theme} />}
      {clientModal !== null && <ClientEditModal clientData={clientModal} onSave={saveClient} onClose={() => setClientModal(null)} theme={theme} />}
      {clientDetail && (
        <ClientDetailModal clientData={clientDetail} shifts={shifts.filter((s) => s.clientId === clientDetail.id)}
          onClose={() => setClientDetail(null)} onAddDoc={addClientDoc} onSendMessage={sendMessage} onEdit={() => { setClientModal(clientDetail); setClientDetail(null); }} th={th} theme={theme} />
      )}
      {invoiceModal && <NewInvoiceModal clients={clients} billable={billable} onGenerate={generateInvoice} onClose={() => setInvoiceModal(null)} theme={theme} />}
      {viewInvoice && <InvoiceDetailModal invoice={viewInvoice} clientName={clientName} client={client(viewInvoice.clientId)} onClose={() => setViewInvoice(null)} onStatus={(s) => { setInvoiceStatus(viewInvoice.id, s); setViewInvoice({ ...viewInvoice, status: s }); }} th={th} />}
      {dayModal && <DayModal date={dayModal} shifts={shifts} blocks={blocks} clients={clients} clientName={clientName} onAddBlock={addBlock} onRemoveBlock={removeBlock} onClose={() => setDayModal(null)} theme={theme} />}
      {showProfile && <ProfileModal compliance={compliance} onSave={saveCompliance} theme={theme} onTheme={changeTheme} onClose={() => setShowProfile(false)} workerName={workerName} onName={changeName} />}
      {noteClient && (
        <ClientNotesModal clientData={noteClient} shifts={shifts.filter((s) => s.clientId === noteClient.id)} onClose={() => setNoteClient(null)} onAddNote={addGeneralNote} th={th} theme={theme} />
      )}
      {mileageModal !== null && <MileageModal clients={clients} onSave={(entry) => { addMileage(entry); setMileageModal(null); }} onClose={() => setMileageModal(null)} theme={theme} />}
      {expenseModal !== null && <ExpenseModal onSave={(entry) => { addExpense(entry); setExpenseModal(null); }} onClose={() => setExpenseModal(null)} theme={theme} />}
    </div>
  );
}

// ---------------- Shift detail ----------------
function ShiftDetailModal({ shift, client, onClose, onSaveNote, onClock, th, theme }) {
  const [note, setNote] = useState(shift.note?.text || "");
  const [visible, setVisible] = useState(shift.note?.visibleToClient ?? false);
  if (!client) return null;
  return (
    <Modal title={client.name} onClose={onClose} wide>
      <div className="mb-4 flex gap-3">
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full bg-stone-100">
          {client.photoUrl ? <img src={client.photoUrl} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-stone-300"><ImageIcon size={20} /></div>}
        </div>
        <div className="text-sm text-stone-600">
          <div>{client.address}</div>
          <div>{client.phone}</div>
          <div className="tabular-nums">{fmtMoney(client.rate)}/hr · {client.careType}</div>
        </div>
      </div>

      <div className="mb-4 rounded-lg bg-stone-50 p-3 text-sm">
        <div className="flex justify-between"><span>Scheduled</span><span className="tabular-nums">{fmtTime(shift.plannedStart)}–{fmtTime(shift.plannedEnd)} ({shiftHours(shift).toFixed(1)} hrs)</span></div>
        <div className="mt-1 flex justify-between"><span>Status</span><span className="font-medium capitalize">{shift.status}</span></div>
      </div>
      <div className="mb-4 flex gap-2">
        {shift.status === "scheduled" && <button onClick={() => onClock(shift, "start")} className={`flex-1 rounded-lg ${th.btn} py-2 text-sm font-medium text-white`}>Clock in</button>}
        {shift.status === "active" && <button onClick={() => onClock(shift, "stop")} className="flex-1 rounded-lg bg-rose-700 py-2 text-sm font-medium text-white">Clock out</button>}
      </div>

      {client.selfReportedNotes && (
        <div className="mb-4 rounded-lg border border-stone-200 p-3">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-stone-500">From client's profile (read-only)</p>
          <p className="text-sm text-stone-700">{client.selfReportedNotes}</p>
        </div>
      )}

      <Field label="Shift notes">
        <textarea className={inputCls(theme)} rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What happened this shift…" />
      </Field>
      <label className="mb-4 flex items-center gap-2 text-sm text-stone-700">
        <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} /> Make visible to client
      </label>
      <button onClick={() => onSaveNote(shift.id, note, visible)} className={`w-full rounded-lg ${th.btn} py-2.5 text-sm font-medium text-white`}>Save note to client</button>
    </Modal>
  );
}

// ---------------- Shift add/edit ----------------
function ShiftModal({ shift, clients, onSave, onClose, theme }) {
  const [form, setForm] = useState({ clientId: clients[0]?.id || "", plannedDate: todayStr(), plannedStart: "09:00", plannedEnd: "12:00", ...shift });
  return (
    <Modal title={shift.id ? "Edit shift" : "Add shift"} onClose={onClose}>
      <Field label="Client">
        <select className={inputCls(theme)} value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })}>
          {clients.length === 0 && <option value="">Add a client first</option>}
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>
      <Field label="Date"><input type="date" className={inputCls(theme)} value={form.plannedDate} onChange={(e) => setForm({ ...form, plannedDate: e.target.value })} /></Field>
      <div className="flex gap-3">
        <Field label="Start"><input type="time" className={inputCls(theme)} value={form.plannedStart} onChange={(e) => setForm({ ...form, plannedStart: e.target.value })} /></Field>
        <Field label="End"><input type="time" className={inputCls(theme)} value={form.plannedEnd} onChange={(e) => setForm({ ...form, plannedEnd: e.target.value })} /></Field>
      </div>
      <button onClick={() => onSave(form)} disabled={!form.clientId} className={`w-full rounded-lg ${THEMES[theme].btn} py-2.5 text-sm font-medium text-white disabled:opacity-40`}>Save shift</button>
    </Modal>
  );
}

// ---------------- Find clients ----------------
function FindClientsView({ jobs, applications, onApply, radiusKm, onRadius, th }) {
  const visible = jobs.filter((j) => j.distanceKm <= radiusKm);
  return (
    <div>
      <div className="mb-4 rounded-2xl bg-white p-4">
        <div className="mb-1 flex items-center justify-between text-sm"><span className="font-medium text-stone-700">Working radius</span><span className="tabular-nums text-stone-500">{radiusKm} km</span></div>
        <input type="range" min={5} max={100} step={5} value={radiusKm} onChange={(e) => onRadius(+e.target.value)} className="w-full accent-current" />
        <p className="mt-1 text-xs text-stone-400">Only postings within this distance are shown below.</p>
      </div>
      <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-stone-500">Nearby postings</h3>
      <div className="space-y-3">
        {visible.length === 0 && <Empty label="No postings within your radius right now." />}
        {visible.map((j) => {
          const applied = applications.includes(j.id);
          return (
            <div key={j.id} className="rounded-2xl bg-white p-4">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm font-semibold text-stone-900">{j.clientName}</span>
                <span className="flex items-center gap-1 text-xs text-stone-400"><MapPin size={12} /> {j.distanceKm} km</span>
              </div>
              <p className="mb-1 text-xs text-stone-500">{j.suburb} · {j.support}</p>
              <p className="mb-3 text-sm text-stone-700">{j.bio}</p>
              <button onClick={() => onApply(j.id)} disabled={applied} className={`w-full rounded-lg py-2 text-sm font-medium ${applied ? "bg-stone-100 text-stone-400" : `${th.btn} text-white`}`}>
                {applied ? "Applied" : "Apply for this client"}
              </button>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-center text-xs text-stone-400">Sample postings shown for preview — connecting to real client listings needs a live marketplace backend.</p>
    </div>
  );
}

// ---------------- Invoices ----------------
function InvoicesView({ invoices, clients, billable, clientName, onNew, onView, th }) {
  const anyBillable = clients.some((c) => billable(c.id).length > 0);
  const sorted = [...invoices].sort((a, b) => b.dateIssued.localeCompare(a.dateIssued));
  return (
    <div>
      <button onClick={onNew} disabled={!anyBillable} className={`mb-4 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed py-2.5 text-sm font-medium disabled:opacity-40 ${th.active} border-current`}>
        <Plus size={16} /> New invoice
      </button>
      {!anyBillable && <p className="mb-4 -mt-2 text-center text-xs text-stone-400">Complete a shift to make it billable.</p>}
      <div className="rounded-2xl bg-white px-3">
        {sorted.length === 0 && <Empty label="No invoices yet." />}
        {sorted.map((inv) => (
          <div key={inv.id} onClick={() => onView(inv)} className="flex cursor-pointer items-center justify-between border-b border-stone-200 py-3 px-1 last:border-b-0">
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-stone-900">{inv.number} · {clientName(inv.clientId)}</div>
              <div className="text-xs text-stone-500">Issued {fmtShort(inv.dateIssued)} · {inv.status}</div>
            </div>
            <span className="shrink-0 text-sm font-semibold tabular-nums text-stone-800">{fmtMoney(inv.total)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
function NewInvoiceModal({ clients, billable, onGenerate, onClose, theme }) {
  const eligible = clients.filter((c) => billable(c.id).length > 0);
  const [clientId, setClientId] = useState(eligible[0]?.id || "");
  const [gst, setGst] = useState(false);
  const c = clients.find((x) => x.id === clientId);
  const shifts = clientId ? billable(clientId) : [];
  const [items, setItems] = useState([]);
  useEffect(() => {
    if (!c) return;
    setItems(shifts.map((s) => ({ id: uid(), desc: `${fmtShort(s.plannedDate)} shift`, code: "", qty: +shiftHours(s).toFixed(2), rate: c.rate })));
    // eslint-disable-next-line
  }, [clientId]);
  const subtotal = items.reduce((sum, li) => sum + li.qty * li.rate, 0);
  function updateItem(id, patch) { setItems(items.map((li) => li.id === id ? { ...li, ...patch } : li)); }
  return (
    <Modal title="New invoice" onClose={onClose} wide>
      <Field label="Client">
        <select className={inputCls(theme)} value={clientId} onChange={(e) => setClientId(e.target.value)}>
          {eligible.map((cl) => <option key={cl.id} value={cl.id}>{cl.name}</option>)}
        </select>
      </Field>
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-stone-500">Line items — add service codes &amp; adjust rates</p>
      <div className="mb-3 space-y-2">
        {items.map((li) => (
          <div key={li.id} className="grid grid-cols-12 gap-1.5 rounded-lg border border-stone-200 p-2">
            <input className="col-span-5 rounded border border-stone-200 px-1.5 py-1 text-xs" value={li.desc} onChange={(e) => updateItem(li.id, { desc: e.target.value })} placeholder="Description" />
            <input className="col-span-3 rounded border border-stone-200 px-1.5 py-1 text-xs" value={li.code} onChange={(e) => updateItem(li.id, { code: e.target.value })} placeholder="Code" />
            <input type="number" className="col-span-2 rounded border border-stone-200 px-1.5 py-1 text-xs tabular-nums" value={li.qty} onChange={(e) => updateItem(li.id, { qty: +e.target.value })} />
            <input type="number" className="col-span-2 rounded border border-stone-200 px-1.5 py-1 text-xs tabular-nums" value={li.rate} onChange={(e) => updateItem(li.id, { rate: +e.target.value })} />
          </div>
        ))}
      </div>
      <div className="mb-3 flex justify-between text-sm font-medium text-stone-700"><span>Subtotal</span><span className="tabular-nums">{fmtMoney(subtotal)}</span></div>
      <label className="mb-4 flex items-center gap-2 text-sm text-stone-700"><input type="checkbox" checked={gst} onChange={(e) => setGst(e.target.checked)} /> Add 10% GST</label>
      <button onClick={() => onGenerate(clientId, items, gst)} disabled={!clientId || items.length === 0} className={`w-full rounded-lg ${THEMES[theme].btn} py-2.5 text-sm font-medium text-white disabled:opacity-40`}>Generate invoice</button>
    </Modal>
  );
}
function InvoiceDetailModal({ invoice, clientName, client, onClose, onStatus, th }) {
  function mailtoLink() {
    const body = invoice.lineItems.map((li) => `${li.desc} (${li.code || "-"}): ${li.qty} x ${fmtMoney(li.rate)}`).join("%0A");
    const subject = encodeURIComponent(`Invoice ${invoice.number}`);
    return `mailto:${invoice.recipientEmail}?subject=${subject}&body=${body}%0A%0ATotal:%20${encodeURIComponent(fmtMoney(invoice.total))}`;
  }
  return (
    <Modal title={invoice.number} onClose={onClose} wide>
      <p className="mb-1 text-sm text-stone-500">{clientName(invoice.clientId)} · {client?.email || "no email on file"}</p>
      <p className="mb-4 text-xs text-stone-400">Issued {fmtShort(invoice.dateIssued)}</p>
      <div className="mb-4 space-y-1 rounded-lg bg-stone-50 p-3 text-sm">
        {invoice.lineItems.map((li) => (
          <div key={li.id} className="flex justify-between"><span>{li.desc} {li.code && `(${li.code})`}</span><span className="tabular-nums">{li.qty} × {fmtMoney(li.rate)}</span></div>
        ))}
        <div className="flex justify-between border-t border-stone-200 pt-1"><span>Subtotal</span><span className="tabular-nums">{fmtMoney(invoice.subtotal)}</span></div>
        {invoice.gst && <div className="flex justify-between"><span>GST (10%)</span><span className="tabular-nums">{fmtMoney(invoice.subtotal * 0.1)}</span></div>}
        <div className="flex justify-between text-base font-semibold"><span>Total</span><span className="tabular-nums">{fmtMoney(invoice.total)}</span></div>
      </div>
      <a href={mailtoLink()} onClick={() => onStatus("sent")} className={`mb-2 flex w-full items-center justify-center gap-2 rounded-lg ${th.btn} py-2.5 text-sm font-medium text-white`}><Send size={14} /> Send to client's email</a>
      <button onClick={() => onStatus("paid")} className={`flex w-full items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium ${invoice.status === "paid" ? "bg-emerald-100 text-emerald-800" : "bg-stone-100 text-stone-600"}`}><DollarSign size={14} /> Mark paid</button>
    </Modal>
  );
}

// ---------------- Clients list & detail ----------------
function ClientsListView({ clients, onAdd, onOpen, th }) {
  return (
    <div>
      <button onClick={onAdd} className={`mb-4 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed py-2.5 text-sm font-medium border-current ${th.active}`}><Plus size={16} /> Add client</button>
      <div className="rounded-2xl bg-white px-3">
        {clients.length === 0 && <Empty label="No clients yet." />}
        {clients.map((c) => (
          <div key={c.id} onClick={() => onOpen(c)} className="flex cursor-pointer items-center gap-3 border-b border-stone-200 py-3 px-1 last:border-b-0">
            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-stone-100">
              {c.photoUrl ? <img src={c.photoUrl} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-stone-300"><ImageIcon size={16} /></div>}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-stone-900">{c.name}</div>
              <div className="truncate text-xs text-stone-500">{(c.documents || []).length} documents · {(c.messages || []).length} messages</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
function ClientEditModal({ clientData, onSave, onClose, theme }) {
  const [form, setForm] = useState({ name: "", careType: "", rate: "", phone: "", email: "", address: "", photoUrl: "", selfReportedNotes: "", ...clientData });
  return (
    <Modal title={clientData.id ? "Edit client" : "Add client"} onClose={onClose}>
      <Field label="Name"><input className={inputCls(theme)} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
      <Field label="Care type"><input className={inputCls(theme)} value={form.careType} onChange={(e) => setForm({ ...form, careType: e.target.value })} /></Field>
      <Field label="Rate ($/hour)"><input type="number" className={inputCls(theme)} value={form.rate} onChange={(e) => setForm({ ...form, rate: +e.target.value })} /></Field>
      <Field label="Phone"><input className={inputCls(theme)} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
      <Field label="Email"><input className={inputCls(theme)} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
      <Field label="Address"><input className={inputCls(theme)} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
      <Field label="Photo URL (optional)"><input className={inputCls(theme)} placeholder="https://…" value={form.photoUrl} onChange={(e) => setForm({ ...form, photoUrl: e.target.value })} /></Field>
      <button onClick={() => onSave(form)} className={`w-full rounded-lg ${THEMES[theme].btn} py-2.5 text-sm font-medium text-white`}>Save client</button>
    </Modal>
  );
}
function ClientDetailModal({ clientData, shifts, onClose, onAddDoc, onSendMessage, onEdit, th, theme }) {
  const [subtab, setSubtab] = useState("info");
  const [docForm, setDocForm] = useState({ title: "", category: "Contract", date: todayStr(), note: "" });
  const [msg, setMsg] = useState("");
  const notedShifts = shifts.filter((s) => s.note?.text);
  return (
    <Modal title={clientData.name} onClose={onClose} wide>
      <div className="mb-4 flex gap-2 border-b border-stone-200 text-sm">
        {["info", "documents", "messages", "notes"].map((t) => (
          <button key={t} onClick={() => setSubtab(t)} className={`-mb-px border-b-2 px-2 pb-2 capitalize ${subtab === t ? `${th.active} border-current font-medium` : "border-transparent text-stone-400"}`}>{t}</button>
        ))}
      </div>

      {subtab === "info" && (
        <div className="text-sm text-stone-700">
          <p className="mb-1">{clientData.careType}</p>
          <p className="mb-1">{clientData.phone} · {clientData.email}</p>
          <p className="mb-1">{clientData.address}</p>
          <p className="mb-3 tabular-nums">{fmtMoney(clientData.rate)}/hr</p>
          <button onClick={onEdit} className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-600">Edit details</button>
        </div>
      )}

      {subtab === "documents" && (
        <div>
          <div className="mb-3 space-y-2">
            {(clientData.documents || []).length === 0 && <Empty label="No documents saved yet." />}
            {(clientData.documents || []).map((d) => (
              <div key={d.id} className="flex items-center gap-2 rounded-lg border border-stone-200 p-2 text-sm">
                <Paperclip size={14} className="shrink-0 text-stone-400" />
                <div className="min-w-0 flex-1"><div className="truncate font-medium">{d.title}</div><div className="text-xs text-stone-500">{d.category} · {fmtShort(d.date)}</div></div>
              </div>
            ))}
          </div>
          <div className="rounded-lg border border-dashed border-stone-300 p-3">
            <div className="mb-2 grid grid-cols-2 gap-2">
              <input className={inputCls(theme)} placeholder="Title (e.g. Bowel chart)" value={docForm.title} onChange={(e) => setDocForm({ ...docForm, title: e.target.value })} />
              <select className={inputCls(theme)} value={docForm.category} onChange={(e) => setDocForm({ ...docForm, category: e.target.value })}>
                {["Contract", "Bowel chart", "Food chart", "Care plan", "Other"].map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <button onClick={() => { if (docForm.title) { onAddDoc(clientData.id, docForm); setDocForm({ title: "", category: "Contract", date: todayStr(), note: "" }); } }} className={`w-full rounded-lg ${th.btn} py-2 text-sm font-medium text-white`}>Add record</button>
            <p className="mt-2 text-xs text-stone-400">Stores a record of the document (title, type, date) — actual file storage needs a real backend.</p>
          </div>
        </div>
      )}

      {subtab === "messages" && (
        <div>
          <div className="mb-3 max-h-60 space-y-2 overflow-y-auto">
            {(clientData.messages || []).length === 0 && <Empty label="No messages yet." />}
            {(clientData.messages || []).map((m) => (
              <div key={m.id} className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${m.from === "worker" ? `ml-auto ${th.chip}` : "bg-stone-100 text-stone-700"}`}>{m.text}</div>
            ))}
          </div>
          <div className="flex gap-2">
            <input className={inputCls(theme)} placeholder="Write a message…" value={msg} onChange={(e) => setMsg(e.target.value)} />
            <button onClick={() => { if (msg.trim()) { onSendMessage(clientData.id, msg.trim()); setMsg(""); } }} className={`rounded-lg ${th.btn} px-3 text-white`}><MessageCircle size={16} /></button>
          </div>
          <p className="mt-2 text-xs text-stone-400">Kept in-app so you're not exchanging personal phone numbers.</p>
        </div>
      )}

      {subtab === "notes" && (
        <div className="space-y-2">
          {notedShifts.length === 0 && <Empty label="No shift notes recorded yet." />}
          {notedShifts.map((s) => (
            <div key={s.id} className="rounded-lg border border-stone-200 p-3 text-sm">
              <div className="mb-1 flex items-center justify-between text-xs text-stone-500"><span>{fmtDate(s.plannedDate)}</span><span className={`rounded-full px-2 py-0.5 ${s.note.visibleToClient ? "bg-emerald-100 text-emerald-800" : "bg-stone-100 text-stone-500"}`}>{s.note.visibleToClient ? "Visible to client" : "Private"}</span></div>
              <p className="text-stone-700">{s.note.text}</p>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

// ---------------- Calendar ----------------
function CalendarView({ shifts, clients, blocks, onDay, th }) {
  const [cursor, setCursor] = useState(new Date());
  const year = cursor.getFullYear(), month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const startWeekday = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [...Array(startWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  function dateStr(day) { return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`; }
  function shiftsOn(day) { const d = dateStr(day); return shifts.filter((s) => s.plannedDate === d); }
  function blockedOn(day) { const d = dateStr(day); return blocks.some((b) => d >= b.startDate && d <= b.endDate); }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between rounded-2xl bg-white p-3">
        <button onClick={() => setCursor(new Date(year, month - 1, 1))}><ChevronLeft size={18} /></button>
        <span className="text-sm font-semibold">{cursor.toLocaleDateString("en-AU", { month: "long", year: "numeric" })}</span>
        <button onClick={() => setCursor(new Date(year, month + 1, 1))}><ChevronRight size={18} /></button>
      </div>
      <div className="grid grid-cols-7 gap-1 rounded-2xl bg-white p-3">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <div key={i} className="pb-1 text-center text-[10px] font-medium text-stone-400">{d}</div>)}
        {cells.map((day, idx) => {
          if (!day) return <div key={idx} />;
          const dShifts = shiftsOn(day), blocked = blockedOn(day);
          return (
            <button key={idx} onClick={() => onDay(dateStr(day))} className={`flex h-12 flex-col items-center justify-start rounded-lg pt-1 text-xs ${blocked ? "bg-stone-100" : "hover:bg-stone-50"}`}>
              <span className="text-stone-700">{day}</span>
              <div className="mt-0.5 flex gap-0.5">
                {dShifts.slice(0, 3).map((s) => <span key={s.id} className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: colorFor(clients, s.clientId) }} />)}
                {blocked && <span className="h-1.5 w-1.5 rounded-full bg-stone-400" />}
              </div>
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {clients.map((c) => <span key={c.id} className="flex items-center gap-1 text-xs text-stone-500"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: colorFor(clients, c.id) }} />{c.name}</span>)}
      </div>
      <button disabled className={`mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-stone-200 py-2.5 text-sm font-medium text-stone-400`}>
        <Link2 size={14} /> Connect Google Calendar (needs backend setup)
      </button>
    </div>
  );
}
function DayModal({ date, shifts, blocks, clientName, onAddBlock, onRemoveBlock, onClose, theme }) {
  const dShifts = shifts.filter((s) => s.plannedDate === date);
  const dBlocks = blocks.filter((b) => date >= b.startDate && date <= b.endDate);
  const [form, setForm] = useState({ startDate: date, endDate: date, label: "Unavailable" });
  return (
    <Modal title={fmtDate(date)} onClose={onClose}>
      {dShifts.length > 0 && (
        <div className="mb-3 space-y-1">
          {dShifts.map((s) => <div key={s.id} className="rounded-lg bg-stone-50 p-2 text-sm">{clientName(s.clientId)} · {fmtTime(s.plannedStart)}–{fmtTime(s.plannedEnd)}</div>)}
        </div>
      )}
      {dBlocks.length > 0 && (
        <div className="mb-3 space-y-1">
          {dBlocks.map((b) => (
            <div key={b.id} className="flex items-center justify-between rounded-lg bg-rose-50 p-2 text-sm text-rose-700">
              <span>{b.label} ({fmtShort(b.startDate)}–{fmtShort(b.endDate)})</span>
              <button onClick={() => onRemoveBlock(b.id)}><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      )}
      {dShifts.length === 0 && dBlocks.length === 0 && <Empty label="Nothing scheduled." />}
      <div className="mt-3 rounded-lg border border-dashed border-stone-300 p-3">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-stone-500">Block out time</p>
        <div className="mb-2 flex gap-2">
          <input type="date" className={inputCls(theme)} value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
          <input type="date" className={inputCls(theme)} value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
        </div>
        <input className={`${inputCls(theme)} mb-2`} value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Label (e.g. Away)" />
        <button onClick={() => { onAddBlock(form); onClose(); }} className={`w-full rounded-lg ${THEMES[theme].btn} py-2 text-sm font-medium text-white`}>Save unavailable time</button>
      </div>
    </Modal>
  );
}

// ---------------- Profile ----------------
function ProfileModal({ compliance, onSave, theme, onTheme, onClose, workerName, onName }) {
  const [list, setList] = useState(compliance.length ? compliance : [
    { id: uid(), name: "First Aid", expiry: "" }, { id: uid(), name: "CPR", expiry: "" },
    { id: uid(), name: "Driver's Licence", expiry: "" }, { id: uid(), name: "Blue Card", expiry: "" },
    { id: uid(), name: "Working with Vulnerable People", expiry: "" }, { id: uid(), name: "Car Insurance", expiry: "" },
    { id: uid(), name: "Vehicle Registration", expiry: "" }, { id: uid(), name: "Public Liability Insurance", expiry: "" },
  ]);
  function update(id, expiry) { const next = list.map((d) => d.id === id ? { ...d, expiry } : d); setList(next); onSave(next); }
  return (
    <Modal title="Profile & compliance" onClose={onClose} wide>
      <div className={`mb-4 rounded-2xl ${THEMES[theme].hero} p-4 text-white`}>
        <p className="text-xs uppercase tracking-wide text-white/70">Support worker</p>
        <input className="mt-1 w-full border-none bg-transparent text-lg font-bold text-white placeholder-white/50 focus:outline-none" placeholder="Your name" value={workerName} onChange={(e) => onName(e.target.value)} />
      </div>
      <p className="mb-3 flex items-center gap-1 text-xs text-stone-400"><ShieldCheck size={14} /> Clients can see these are current, never the documents themselves.</p>
      <div className="mb-5 space-y-2">
        {list.map((d) => (
          <div key={d.id} className="flex items-center justify-between gap-2 rounded-lg border border-stone-200 p-2">
            <span className="text-sm text-stone-700">{d.name}</span>
            <div className="flex items-center gap-2">
              <input type="date" className="rounded border border-stone-200 px-2 py-1 text-xs" value={d.expiry} onChange={(e) => update(d.id, e.target.value)} />
              <StatusChip status={docStatus(d.expiry)} />
            </div>
          </div>
        ))}
      </div>
      <p className="mb-2 flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-stone-500"><Palette size={13} /> App colour</p>
      <div className="flex gap-2">
        {Object.keys(THEMES).map((t) => (
          <button key={t} onClick={() => onTheme(t)} className={`h-8 w-8 rounded-full ${THEMES[t].btn} ${theme === t ? "ring-2 ring-offset-2 ring-stone-400" : ""}`} />
        ))}
      </div>
    </Modal>
  );
}

// ---------------- Notes ----------------
function NotesView({ clients, notesStatus, onOpen, th }) {
  return (
    <div>
      <p className="mb-3 text-xs text-stone-400">Tap a client to review past shift notes or write a new one.</p>
      <div className="rounded-2xl border border-stone-100 bg-white px-3">
        {clients.length === 0 && <Empty label="Add a client to start keeping notes." />}
        {clients.map((c) => {
          const pending = notesStatus(c.id) === "pending";
          return (
            <button key={c.id} onClick={() => onOpen(c)} className="flex w-full items-center gap-3 border-b border-stone-100 py-3 px-1 last:border-b-0 text-left">
              <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-stone-100">
                {c.photoUrl ? <img src={c.photoUrl} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-stone-300"><ImageIcon size={14} /></div>}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-stone-900">{c.name}</div>
                <div className="truncate text-xs text-stone-500">{(c.generalNotes || []).length} general notes</div>
              </div>
              {pending ? (
                <span className="flex items-center gap-1 rounded-full bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-600"><AlertTriangle size={12} /> Due</span>
              ) : (
                <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-600"><CheckCircle2 size={12} /> Done</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ClientNotesModal({ clientData, shifts, onClose, onAddNote, th, theme }) {
  const [text, setText] = useState("");
  const [visible, setVisible] = useState(false);
  const entries = [
    ...shifts.filter((s) => s.note?.text).map((s) => ({ id: s.id, date: s.plannedDate, text: s.note.text, visibleToClient: s.note.visibleToClient, source: "Shift note" })),
    ...(clientData.generalNotes || []).map((n) => ({ ...n, source: "General note" })),
  ].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <Modal title={`${clientData.name}'s notes`} onClose={onClose} wide>
      <div className="mb-4 max-h-72 space-y-2 overflow-y-auto">
        {entries.length === 0 && <Empty label="No notes recorded yet." />}
        {entries.map((n) => (
          <div key={n.id} className="rounded-2xl border border-stone-200 p-3 text-sm">
            <div className="mb-1 flex items-center justify-between text-xs text-stone-500">
              <span>{fmtDate(n.date)} · {n.source}</span>
              <span className={`rounded-full px-2 py-0.5 ${n.visibleToClient ? "bg-emerald-50 text-emerald-700" : "bg-stone-100 text-stone-500"}`}>{n.visibleToClient ? "Visible to client" : "Private"}</span>
            </div>
            <p className="text-stone-700">{n.text}</p>
          </div>
        ))}
      </div>
      <Field label="Write a new note">
        <textarea className={inputCls(theme)} rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a note for this client…" />
      </Field>
      <label className="mb-3 flex items-center gap-2 text-sm text-stone-700">
        <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} /> Make visible to client
      </label>
      <button onClick={() => { if (text.trim()) { onAddNote(clientData.id, text.trim(), visible); setText(""); setVisible(false); } }} className={`w-full rounded-2xl ${th.btn} py-2.5 text-sm font-semibold text-white`}>Save note</button>
    </Modal>
  );
}

// ---------------- Mileage ----------------
function MileageView({ mileage, clients, clientName, onAdd, onDelete, th }) {
  const sorted = [...mileage].sort((a, b) => b.date.localeCompare(a.date));
  const totalKm = mileage.reduce((sum, m) => sum + (+m.km || 0), 0);
  return (
    <div>
      <div className="mb-4 rounded-2xl border border-stone-100 bg-white p-4">
        <p className="text-xs text-stone-500">Total distance logged</p>
        <p className="text-2xl font-bold tabular-nums text-stone-900">{totalKm.toFixed(1)} km</p>
      </div>
      <button onClick={onAdd} className={`mb-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed py-2.5 text-sm font-semibold border-current ${th.active}`}><Plus size={16} /> Log a trip</button>
      <div className="rounded-2xl border border-stone-100 bg-white px-3">
        {sorted.length === 0 && <Empty label="No trips logged yet." />}
        {sorted.map((m) => (
          <div key={m.id} className="flex items-center gap-3 border-b border-stone-100 py-3 px-1 last:border-b-0">
            <Car size={16} className="shrink-0 text-stone-400" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-stone-900">{m.fromLabel} → {m.toLabel}</div>
              <div className="truncate text-xs text-stone-500">{fmtShort(m.date)}{m.clientId ? ` · ${clientName(m.clientId)}` : ""} {m.receiptUrl && "· receipt attached"}</div>
            </div>
            <span className="shrink-0 text-sm font-semibold tabular-nums text-stone-700">{(+m.km).toFixed(1)} km</span>
            <button onClick={() => onDelete(m.id)} className="text-stone-300"><Trash2 size={14} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}
function MileageModal({ clients, onSave, onClose, theme }) {
  const [form, setForm] = useState({ date: todayStr(), clientId: "", fromLabel: "Home", toLabel: "", km: "", purpose: "", receiptUrl: "" });
  return (
    <Modal title="Log a trip" onClose={onClose}>
      <Field label="Date"><input type="date" className={inputCls(theme)} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
      <Field label="Client (optional)">
        <select className={inputCls(theme)} value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })}>
          <option value="">Not linked to a client</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>
      <div className="flex gap-3">
        <Field label="From"><input className={inputCls(theme)} value={form.fromLabel} onChange={(e) => setForm({ ...form, fromLabel: e.target.value })} /></Field>
        <Field label="To"><input className={inputCls(theme)} value={form.toLabel} onChange={(e) => setForm({ ...form, toLabel: e.target.value })} /></Field>
      </div>
      <Field label="Distance (km)"><input type="number" className={inputCls(theme)} value={form.km} onChange={(e) => setForm({ ...form, km: e.target.value })} /></Field>
      <Field label="Purpose"><input className={inputCls(theme)} placeholder="e.g. Drive to client shift" value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} /></Field>
      <Field label="Receipt photo URL (optional)"><input className={inputCls(theme)} placeholder="https://…" value={form.receiptUrl} onChange={(e) => setForm({ ...form, receiptUrl: e.target.value })} /></Field>
      <button onClick={() => onSave(form)} disabled={!form.toLabel || !form.km} className={`w-full rounded-2xl ${THEMES[theme].btn} py-2.5 text-sm font-semibold text-white disabled:opacity-40`}>Save trip</button>
    </Modal>
  );
}

// ---------------- Expenses ----------------
const RANGES = ["Week", "Month", "Financial year", "Year to date"];
function rangeWindow(range) {
  const now = new Date();
  if (range === "Week") { const d = new Date(now); d.setDate(now.getDate() - 7); return { start: d, end: now, bucket: "day" }; }
  if (range === "Month") { const d = new Date(now.getFullYear(), now.getMonth(), 1); return { start: d, end: now, bucket: "week" }; }
  if (range === "Financial year") { const fyStartYear = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1; return { start: new Date(fyStartYear, 6, 1), end: now, bucket: "month" }; }
  return { start: new Date(now.getFullYear(), 0, 1), end: now, bucket: "month" };
}
function buildBuckets({ start, end, bucket }) {
  const buckets = [];
  if (bucket === "day") {
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) buckets.push({ label: d.toLocaleDateString("en-AU", { weekday: "short" }), start: new Date(d), end: new Date(new Date(d).setDate(d.getDate() + 1)) });
  } else if (bucket === "week") {
    let d = new Date(start);
    while (d <= end) { const e = new Date(d); e.setDate(e.getDate() + 7); buckets.push({ label: `${d.getDate()}/${d.getMonth() + 1}`, start: new Date(d), end: e }); d = e; }
  } else {
    let d = new Date(start);
    while (d <= end) { const e = new Date(d.getFullYear(), d.getMonth() + 1, 1); buckets.push({ label: d.toLocaleDateString("en-AU", { month: "short" }), start: new Date(d), end: e }); d = e; }
  }
  return buckets;
}
function ExpensesView({ expenses, mileage, invoices, onAdd, onDelete, th, theme }) {
  const [range, setRange] = useState("Financial year");
  const win = rangeWindow(range);
  const buckets = buildBuckets(win);
  const inWindow = (dateStr, b) => { const d = new Date(dateStr); return d >= b.start && d < b.end; };
  const chartData = buckets.map((b) => ({
    label: b.label,
    Earned: invoices.filter((i) => i.status === "paid" && inWindow(i.dateIssued, b)).reduce((s, i) => s + i.total, 0),
    Outstanding: invoices.filter((i) => i.status !== "paid" && inWindow(i.dateIssued, b)).reduce((s, i) => s + i.total, 0),
    Expenses: expenses.filter((e) => inWindow(e.date, b)).reduce((s, e) => s + (+e.amount || 0), 0),
  }));
  const totalExpenses = expenses.filter((e) => new Date(e.date) >= win.start).reduce((s, e) => s + (+e.amount || 0), 0);
  const sortedExpenses = [...expenses].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {RANGES.map((r) => (
          <button key={r} onClick={() => setRange(r)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${range === r ? `${th.btn} text-white` : "bg-white border border-stone-200 text-stone-500"}`}>{r}</button>
        ))}
      </div>
      <div className="mb-4 h-56 rounded-2xl border border-stone-100 bg-white p-3">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip formatter={(v) => fmtMoney(v)} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="Earned" fill="#059669" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Outstanding" fill="#d97706" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Expenses" fill="#e11d48" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mb-4 rounded-2xl border border-stone-100 bg-white p-4">
        <p className="text-xs text-stone-500">Expenses this period</p>
        <p className="text-xl font-bold tabular-nums text-rose-600">{fmtMoney(totalExpenses)}</p>
      </div>
      <button onClick={onAdd} className={`mb-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed py-2.5 text-sm font-semibold border-current ${th.active}`}><Plus size={16} /> Add expense</button>
      <div className="rounded-2xl border border-stone-100 bg-white px-3">
        {sortedExpenses.length === 0 && <Empty label="No expenses logged yet." />}
        {sortedExpenses.map((e) => (
          <div key={e.id} className="flex items-center gap-3 border-b border-stone-100 py-3 px-1 last:border-b-0">
            <Receipt size={16} className="shrink-0 text-stone-400" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-stone-900">{e.description || e.category}</div>
              <div className="truncate text-xs text-stone-500">{fmtShort(e.date)} · {e.category} {e.receiptUrl && "· receipt attached"}</div>
            </div>
            <span className="shrink-0 text-sm font-semibold tabular-nums text-stone-700">{fmtMoney(+e.amount)}</span>
            <button onClick={() => onDelete(e.id)} className="text-stone-300"><Trash2 size={14} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}
function ExpenseModal({ onSave, onClose, theme }) {
  const [form, setForm] = useState({ date: todayStr(), category: "Fuel", description: "", amount: "", receiptUrl: "" });
  return (
    <Modal title="Add expense" onClose={onClose}>
      <Field label="Date"><input type="date" className={inputCls(theme)} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
      <Field label="Category">
        <select className={inputCls(theme)} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
          {["Fuel", "Supplies", "Training", "Uniform", "Insurance", "Other"].map((c) => <option key={c}>{c}</option>)}
        </select>
      </Field>
      <Field label="Description"><input className={inputCls(theme)} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
      <Field label="Amount ($)"><input type="number" className={inputCls(theme)} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
      <Field label="Receipt photo URL (optional)"><input className={inputCls(theme)} placeholder="https://…" value={form.receiptUrl} onChange={(e) => setForm({ ...form, receiptUrl: e.target.value })} /></Field>
      <button onClick={() => onSave(form)} disabled={!form.amount} className={`w-full rounded-2xl ${THEMES[theme].btn} py-2.5 text-sm font-semibold text-white disabled:opacity-40`}>Save expense</button>
    </Modal>
  );
}

// ---------------- Outstanding ----------------
function OutstandingView({ unpaidInvoices, expiringDocs, pendingNoteClients, applications, jobs, todaysShifts, clientName, onOpenInvoice, onOpenProfile, onOpenClient, th }) {
  const items = [
    ...unpaidInvoices.map((i) => ({ id: `inv-${i.id}`, urgent: true, icon: DollarSign, text: `${i.number} · ${clientName(i.clientId)} — ${fmtMoney(i.total)} outstanding`, onClick: () => onOpenInvoice(i) })),
    ...expiringDocs.map((d) => ({ id: `doc-${d.id}`, urgent: docStatus(d.expiry) === "expired", icon: ShieldCheck, text: `${d.name} ${docStatus(d.expiry) === "expired" ? "has expired" : "is expiring soon"}`, onClick: onOpenProfile })),
    ...pendingNoteClients.map((c) => ({ id: `note-${c.id}`, urgent: true, icon: StickyNote, text: `Shift notes still needed for ${c.name}`, onClick: () => onOpenClient(c.id) })),
    ...applications.map((jobId) => { const j = jobs.find((x) => x.id === jobId); return j ? { id: `app-${jobId}`, urgent: false, icon: Users, text: `Application to ${j.clientName} — awaiting response`, onClick: null } : null; }).filter(Boolean),
    ...todaysShifts.map((s) => ({ id: `shift-${s.id}`, urgent: false, icon: CalendarDays, text: `Shift with ${clientName(s.clientId)} today at ${fmtTime(s.plannedStart)}`, onClick: null })),
  ];
  return (
    <div>
      {items.length === 0 && <Empty label="You're all caught up." />}
      <div className="space-y-2">
        {items.map((it) => (
          <div key={it.id} onClick={it.onClick || undefined} className={`flex items-center gap-3 rounded-2xl border border-stone-100 bg-white p-3 ${it.onClick ? "cursor-pointer" : ""}`}>
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${it.urgent ? "bg-rose-50 text-rose-600" : "bg-stone-100 text-stone-500"}`}><it.icon size={15} /></span>
            <p className="flex-1 text-sm text-stone-700">{it.text}</p>
            {it.urgent && <AlertTriangle size={14} className="shrink-0 text-rose-500" />}
          </div>
        ))}
      </div>
    </div>
  );
}
