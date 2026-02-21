import React, { useState, useEffect } from 'react';
import { Plus, Archive, MoveUpRight, Edit3, Save, CheckCircle2, ArrowRight } from 'lucide-react';

const TABS = {
  CHAPTER: '01_THIS_CHAPTER',
  BACKLOG: '02_BACKLOG / IDEAS',
  ARCHIVE: '03_ARCHIVE (Done)'
};

const BUCKETS = ['1.0 Polish', '2.0 Experience', 'Brand / Narrative', 'Sales Collateral', 'Maintenance'];
const EFFORTS = ['S', 'M', 'L'];
const STATUSES = ['Planned', 'Ongoing', 'In Progress', 'Done', 'Blocked'];

const initialData = [
  // CHAPTER
  { id: 'C-001', tab: TABS.CHAPTER, item: 'Curbee.com 1.0 Polish (QA + CMS)', bucket: '1.0 Polish', effort: 'M', status: 'In Progress', window: 'Weeks 1–4', owner: 'Ant', notes: 'Completion: End of Month 1' },
  { id: 'C-002', tab: TABS.CHAPTER, item: 'Scrolljacked Hero & "How It Works" Experience', bucket: '2.0 Experience', effort: 'L', status: 'Planned', window: 'Weeks 3–8', owner: 'Ant (+ Dev)', notes: 'Completion: First pass end of Month 2' },
  { id: 'C-003', tab: TABS.CHAPTER, item: 'Narrative Tightening for Dealers & Partners', bucket: 'Brand / Narrative', effort: 'M', status: 'Planned', window: 'Weeks 5–8', owner: 'Ant (Amit/Nicole)', notes: 'Completion: Final copy end of Month 2' },
  { id: 'C-004', tab: TABS.CHAPTER, item: 'Sales One-Pager & Deck Alignment', bucket: 'Sales Collateral', effort: 'M', status: 'Planned', window: 'Weeks 9–12', owner: 'Ant', notes: 'Completion: End of Month 3' },
  { id: 'C-005', tab: TABS.CHAPTER, item: 'Micro-Maintenance & Support', bucket: 'Maintenance', effort: 'S', status: 'Ongoing', window: 'Weeks 1–12', owner: 'Ant', notes: 'Ongoing small fixes' },

  // BACKLOG
  { id: 'C-006', tab: TABS.BACKLOG, item: 'Full MARS UX / Product Design Overhaul', bucketGuess: '2.0 Experience', priorityGuess: 'High', date: new Date().toISOString().split('T')[0], whoAsked: 'Team', notes: '' },
  { id: 'C-007', tab: TABS.BACKLOG, item: '3D Wheelie hero + game-like interactions', bucketGuess: '2.0 Experience', priorityGuess: 'Medium', date: new Date().toISOString().split('T')[0], whoAsked: 'Team', notes: '' },
  { id: 'C-008', tab: TABS.BACKLOG, item: 'Deep brand guideline book 2.0', bucketGuess: 'Brand / Narrative', priorityGuess: 'High', date: new Date().toISOString().split('T')[0], whoAsked: 'Team', notes: '' },
  { id: 'C-009', tab: TABS.BACKLOG, item: 'Campaign-specific landing pages', bucketGuess: 'Sales Collateral', priorityGuess: 'Medium', date: new Date().toISOString().split('T')[0], whoAsked: 'Team', notes: '' },
  { id: 'C-010', tab: TABS.BACKLOG, item: 'Heavier motion / 3D sections beyond the hero + How It Works', bucketGuess: '2.0 Experience', priorityGuess: 'Medium', date: new Date().toISOString().split('T')[0], whoAsked: 'Team', notes: '' },

  // ARCHIVE
  { id: 'A-001', tab: TABS.ARCHIVE, item: 'Curbee Rebrand & NADA Booth System (SOW #1)', bucket: 'Brand / Narrative', effort: 'L', status: 'Done', window: 'Past', owner: 'Ant', notes: 'Billed' },
  { id: 'A-002', tab: TABS.ARCHIVE, item: 'Curbee.com v1.0 Launch (Webflow)', bucket: '1.0 Polish', effort: 'L', status: 'Done', window: 'Past', owner: 'Ant', notes: 'Billed' },
  { id: 'A-003', tab: TABS.ARCHIVE, item: 'Business Cards + Event Merch System', bucket: 'Sales Collateral', effort: 'M', status: 'Done', window: 'Past', owner: 'Ant', notes: 'Billed' }
];

export default function App() {
  const [activeTab, setActiveTab] = useState(TABS.CHAPTER);
  const [tasks, setTasks] = useState(() => {
    try {
      const savedTasks = localStorage.getItem('curbeePlannerTasks');
      return savedTasks ? JSON.parse(savedTasks) : initialData;
    } catch (e) {
      console.warn('Failed to parse tasks from localStorage', e);
      return initialData;
    }
  });

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  // Persist to local storage whenever tasks change
  useEffect(() => {
    localStorage.setItem('curbeePlannerTasks', JSON.stringify(tasks));
  }, [tasks]);

  const generateId = () => {
    const maxId = tasks.reduce((max, task) => {
      const num = parseInt(task.id.replace('C-', ''));
      return num > max ? num : max;
    }, 0);
    return `C-${String(maxId + 1).padStart(3, '0')}`;
  };

  const addTask = () => {
    const newTask = {
      id: generateId(),
      tab: activeTab,
      item: 'New Item...',
      bucket: '1.0 Polish',
      effort: 'S',
      status: 'Planned',
      window: 'TBD',
      owner: 'Me',
      notes: '',
      date: new Date().toISOString().split('T')[0],
      whoAsked: 'Amit',
      bucketGuess: '1.0 Polish',
      priorityGuess: 'Medium'
    };
    setTasks([...tasks, newTask]);
    startEditing(newTask);
  };

  const updateTask = (id, field, value) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const moveTask = (id, newTab) => {
    setTasks(tasks.map(t => {
      if (t.id === id) {
        let updates = { tab: newTab };
        if (newTab === TABS.ARCHIVE) updates.status = 'Done';
        if (newTab === TABS.CHAPTER && t.tab === TABS.BACKLOG) {
          updates.bucket = t.bucketGuess || '1.0 Polish';
          updates.effort = 'M';
          updates.status = 'Planned';
          updates.window = 'TBD';
          updates.owner = 'Me';
        }
        return { ...t, ...updates };
      }
      return t;
    }));
  };

  const startEditing = (task) => {
    setEditingId(task.id);
    setEditForm(task);
  };

  const saveEdit = () => {
    setTasks(tasks.map(t => t.id === editingId ? { ...t, ...editForm } : t));
    setEditingId(null);
  };

  const getBucketStyle = (bucket) => {
    switch (bucket) {
      case '1.0 Polish': return 'bg-curbee-teal-500 text-white';
      case '2.0 Experience': return 'bg-curbee-orange-500 text-white';
      case 'Brand / Narrative': return 'bg-curbee-amber-500 text-slate-900';
      case 'Sales Collateral': return 'bg-curbee-slate-800 text-white';
      case 'Maintenance': return 'bg-curbee-slate-200 text-slate-900';
      default: return 'bg-curbee-slate-200 text-slate-900';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Planned': return <div className="w-3 h-3 rounded-full bg-white/50" title="Planned" />;
      case 'In Progress': return <div className="w-3 h-3 rounded-full bg-yellow-300" title="In Progress" />;
      case 'Blocked': return <div className="w-3 h-3 rounded-full bg-red-400" title="Blocked" />;
      case 'Done': return <CheckCircle2 size={16} className="text-white" title="Done" />;
      default: return null;
    }
  };

  const filteredTasks = tasks.filter(t => t.tab === activeTab);

  return (
    <div className="min-h-screen bg-[#F5F5F0] text-slate-900 font-sans p-6 md:p-12 selection:bg-black selection:text-white">

      {/* Header */}
      <header className="max-w-[1400px] mx-auto mb-16 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="mb-8 h-20 w-auto">
            <img src="/logo.png" alt="Curbee" className="h-full w-auto object-contain object-left" />
          </div>
          <h1 className="text-5xl md:text-7xl font-sans font-light tracking-tighter mb-4">Roadmap & Retainer</h1>
          <p className="text-lg md:text-xl text-slate-600 max-w-2xl leading-relaxed font-light">
            Focus: 90-day chapters. We pull 4–6 items from the backlog per month. Micro-maintenance only.
          </p>
        </div>
        <button
          onClick={addTask}
          className="flex items-center gap-2 bg-black hover:bg-slate-800 text-white px-6 py-4 rounded-full text-lg transition-transform hover:scale-105 active:scale-95 shadow-xl"
        >
          <Plus size={24} />
          <span>New Item</span>
        </button>
      </header>

      {/* Tabs */}
      <div className="max-w-[1400px] mx-auto mb-12 flex flex-wrap gap-4">
        {[
          { id: TABS.CHAPTER, label: '01_THIS_CHAPTER (90 days)' },
          { id: TABS.BACKLOG, label: '02_BACKLOG / IDEAS' },
          { id: TABS.ARCHIVE, label: '03_ARCHIVE (Done)' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-3 text-sm tracking-wide uppercase font-semibold transition-all rounded-full border-2 ${activeTab === tab.id
              ? 'border-black bg-black text-white'
              : 'border-slate-300 text-slate-500 hover:border-slate-400 hover:text-slate-800'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Content Area - Responsive Masonry/Grid Layout */}
      <main className="max-w-[1400px] mx-auto">

        {filteredTasks.length === 0 && (
          <div className="py-24 text-center border-2 border-dashed border-slate-300 rounded-[2rem]">
            <p className="text-2xl text-slate-400 font-light">No items in this view.</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 auto-rows-auto">
          {filteredTasks.map(task => {
            const isEditing = editingId === task.id;
            const bgStyle = getBucketStyle(activeTab === TABS.BACKLOG ? task.bucketGuess : task.bucket);
            const isDarkBg = bgStyle.includes('text-white');

            return (
              <div
                key={task.id}
                className={`group relative rounded-[2rem] p-8 flex flex-col justify-between overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 ${bgStyle}`}
                style={{ minHeight: '320px' }}
              >
                {isEditing ? (
                  // --- EDIT MODE ---
                  <div className={`h-full flex flex-col gap-4 ${isDarkBg ? 'text-white' : 'text-slate-900'}`}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-mono text-sm opacity-60 backdrop-blur-sm bg-black/10 px-3 py-1 rounded-full">{task.id}</span>
                      <button onClick={saveEdit} className="p-2 bg-black text-white rounded-full hover:scale-110 transition-transform"><Save size={18} /></button>
                    </div>

                    <textarea
                      value={editForm.item}
                      onChange={e => setEditForm({ ...editForm, item: e.target.value })}
                      className="text-2xl font-medium bg-black/5 border border-black/10 rounded-xl p-3 outline-none focus:ring-2 focus:ring-black/20 resize-none"
                      rows="2"
                    />

                    {activeTab === TABS.BACKLOG ? (
                      <div className="grid grid-cols-2 gap-3 mt-auto">
                        <div className="col-span-2">
                          <label className="text-xs uppercase tracking-wider opacity-60 mb-2 block">Bucket / Color</label>
                          <div className="flex flex-wrap gap-2">
                            {BUCKETS.map(b => {
                              const bStyle = getBucketStyle(b);
                              const bColor = bStyle.split(' ')[0]; // Gets the bg-... class
                              return (
                                <button
                                  key={b}
                                  type="button"
                                  onClick={() => setEditForm({ ...editForm, bucketGuess: b })}
                                  className={`relative px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider border-2 transition-all ${bColor} ${isDarkBg ? 'text-slate-900' : 'text-slate-900'} ${editForm.bucketGuess === b ? 'border-current scale-105' : 'border-transparent opacity-60 hover:opacity-100'}`}
                                >
                                  {b}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        <div>
                          <label className="text-xs uppercase tracking-wider opacity-60 mb-1 block">Asked By (POC)</label>
                          <input type="text" value={editForm.whoAsked} onChange={e => setEditForm({ ...editForm, whoAsked: e.target.value })} className="w-full bg-black/10 rounded-lg p-2 text-sm outline-none placeholder:text-black/30" placeholder="e.g. Amit" />
                        </div>
                        <div>
                          <label className="text-xs uppercase tracking-wider opacity-60 mb-1 block">Priority</label>
                          <select value={editForm.priorityGuess} onChange={e => setEditForm({ ...editForm, priorityGuess: e.target.value })} className="w-full bg-black/10 rounded-lg p-2 text-sm outline-none">
                            <option className="text-slate-900">Low</option><option className="text-slate-900">Medium</option><option className="text-slate-900">High</option>
                          </select>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3 mt-auto">
                        <div className="col-span-2">
                          <label className="text-xs uppercase tracking-wider opacity-60 mb-2 block">Bucket / Color</label>
                          <div className="flex flex-wrap gap-2">
                            {BUCKETS.map(b => {
                              const bStyle = getBucketStyle(b);
                              const bColor = bStyle.split(' ')[0]; // Gets the bg-... class
                              return (
                                <button
                                  key={b}
                                  type="button"
                                  onClick={() => setEditForm({ ...editForm, bucket: b })}
                                  className={`relative px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider border-2 transition-all ${bColor} ${isDarkBg ? 'text-slate-900' : 'text-slate-900'} ${editForm.bucket === b ? 'border-current scale-105' : 'border-transparent opacity-60 hover:opacity-100'}`}
                                >
                                  {b}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        <div>
                          <label className="text-xs uppercase tracking-wider opacity-60 mb-1 block">Status</label>
                          <select value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })} className="w-full bg-black/10 rounded-lg p-2 text-sm outline-none">
                            {STATUSES.map(s => <option key={s} className="text-slate-900">{s}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs uppercase tracking-wider opacity-60 mb-1 block">Effort</label>
                          <select value={editForm.effort} onChange={e => setEditForm({ ...editForm, effort: e.target.value })} className="w-full bg-black/10 rounded-lg p-2 text-sm outline-none">
                            {EFFORTS.map(e => <option key={e} className="text-slate-900">{e}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs uppercase tracking-wider opacity-60 mb-1 block">Window</label>
                          <input type="text" value={editForm.window} onChange={e => setEditForm({ ...editForm, window: e.target.value })} className="w-full bg-black/10 rounded-lg p-2 text-sm outline-none placeholder:text-black/30" placeholder="e.g. Weeks 1-3" />
                        </div>
                        <div>
                          <label className="text-xs uppercase tracking-wider opacity-60 mb-1 block">POC / Owner</label>
                          <input type="text" value={editForm.owner} onChange={e => setEditForm({ ...editForm, owner: e.target.value })} className="w-full bg-black/10 rounded-lg p-2 text-sm outline-none placeholder:text-black/30" placeholder="e.g. Nicole, Amit" />
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  // --- DISPLAY MODE ---
                  <>
                    {/* Top row: Pill + Action Icon */}
                    <div className="flex justify-between items-start z-10">
                      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-md border ${isDarkBg ? 'bg-white/10 border-white/20' : 'bg-black/5 border-black/10'} text-sm font-medium`}>
                        {activeTab !== TABS.BACKLOG && getStatusIcon(task.status)}
                        {activeTab === TABS.BACKLOG ? task.bucketGuess : task.bucket}
                      </div>

                      {/* Hover Actions */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                        <button
                          onClick={() => startEditing(task)}
                          className={`p-2 rounded-full backdrop-blur-md border ${isDarkBg ? 'bg-white/10 border-white/20 hover:bg-white/20' : 'bg-black/5 border-black/10 hover:bg-black/10'} transition-all`}
                          title="Edit"
                        >
                          <Edit3 size={16} />
                        </button>

                        {activeTab === TABS.CHAPTER && (
                          <button
                            onClick={() => moveTask(task.id, TABS.ARCHIVE)}
                            className={`p-2 rounded-full backdrop-blur-md border ${isDarkBg ? 'bg-white/10 border-white/20 hover:bg-white/20' : 'bg-black/5 border-black/10 hover:bg-black/10'} transition-all`}
                            title="Move to Archive"
                          >
                            <Archive size={16} />
                          </button>
                        )}

                        {activeTab === TABS.BACKLOG && (
                          <button
                            onClick={() => moveTask(task.id, TABS.CHAPTER)}
                            className={`p-2 rounded-full backdrop-blur-md border ${isDarkBg ? 'bg-white/10 border-white/20 hover:bg-white/20' : 'bg-black/5 border-black/10 hover:bg-black/10'} transition-all`}
                            title="Move to Active"
                          >
                            <MoveUpRight size={16} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Middle: Title & Huge Metric styling */}
                    <div className="mt-8 z-10 flex-grow">
                      <h3 className="text-2xl md:text-3xl font-medium leading-tight tracking-tight mb-4">
                        {task.item}
                      </h3>
                    </div>

                    {/* Bottom row: Attributes / Notes */}
                    <div className="relative z-10 mt-6 flex flex-col justify-end">
                      {activeTab === TABS.BACKLOG ? (
                        <div className="flex items-center justify-between border-t border-current border-opacity-20 pt-4">
                          <div className="flex flex-col">
                            <span className="text-xs uppercase tracking-widest opacity-60 font-semibold mb-1">Asked By</span>
                            <span className="text-base font-medium">{task.whoAsked}</span>
                          </div>
                          <div className="flex flex-col text-right">
                            <span className="text-xs uppercase tracking-widest opacity-60 font-semibold mb-1">Priority</span>
                            <span className="text-base font-medium">{task.priorityGuess}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4 border-t border-current border-opacity-20 pt-4">
                          <div className="flex justify-between items-end">
                            <div>
                              <span className="text-[5rem] md:text-[6rem] leading-none font-light tracking-tighter block -ml-1">
                                {task.effort}
                              </span>
                              <span className="text-sm font-semibold uppercase tracking-widest opacity-60">Effort</span>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-medium mb-1">{task.window}</p>
                              <p className="text-sm opacity-80">{task.owner}</p>
                            </div>
                          </div>

                          {/* Inline editable status and notes (micro-maintenance) */}
                          <div className={`mt-4 p-3 rounded-xl backdrop-blur-md ${isDarkBg ? 'bg-black/10' : 'bg-white/40'}`}>
                            {activeTab !== TABS.ARCHIVE ? (
                              <div className="flex items-center gap-2 mb-2">
                                <select
                                  value={task.status}
                                  onChange={(e) => updateTask(task.id, 'status', e.target.value)}
                                  className={`appearance-none bg-transparent font-semibold border-none rounded py-0 px-1 hover:bg-black/5 cursor-pointer outline-none focus:ring-2 focus:ring-black/20`}
                                >
                                  {STATUSES.map(s => <option key={s} className="text-slate-900">{s}</option>)}
                                </select>
                                <ArrowRight size={14} className="opacity-50" />
                              </div>
                            ) : (
                              <p className="font-semibold text-sm mb-2">{task.status}</p>
                            )}

                            {activeTab !== TABS.ARCHIVE ? (
                              <input
                                type="text"
                                value={task.notes}
                                onChange={(e) => updateTask(task.id, 'notes', e.target.value)}
                                placeholder="Add a quick note..."
                                className="w-full bg-transparent border-none placeholder:opacity-50 text-sm italic outline-none focus:ring-2 focus:ring-black/20 rounded px-1 -ml-1"
                              />
                            ) : (
                              <p className="text-sm italic opacity-80">{task.notes || "No notes."}</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Background ID Watermark */}
                    <div className="absolute right-[-10%] bottom-[-10%] text-[8rem] font-black opacity-5 select-none pointer-events-none tracking-tighter z-0">
                      {task.id.split('-')[1]}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

      </main>
    </div>
  );
}
