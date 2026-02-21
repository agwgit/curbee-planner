import React, { useState, useEffect } from 'react';
import { Plus, Archive, MoveUpRight, Edit3, Save, CheckCircle2, ArrowRight, ExternalLink, X, ArrowLeft } from 'lucide-react';
import { supabase } from './lib/supabase';
import { v4 as uuidv4 } from 'uuid';

const TABS = {
  CHAPTER: '01_THIS_CHAPTER',
  BACKLOG: '02_BACKLOG',
  ARCHIVE: '03_ARCHIVE'
};

const BUCKETS = ['1.0 Polish', '2.0 Experience', 'Brand / Narrative', 'Sales Collateral', 'Maintenance'];
const EFFORTS = ['S', 'M', 'L'];
const STATUSES = ['Planned', 'Ongoing', 'In Progress', 'Done', 'Blocked'];

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  componentDidCatch(error, info) {
    this.setState({ error, info });
    console.error("ErrorBoundary Caught:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', background: 'red', color: 'white' }}>
          <h1>App Crashed!</h1>
          <p>{this.state.error && this.state.error.toString()}</p>
          <pre>{this.state.info && this.state.info.componentStack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

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

function MainApp() {
  const [activeTab, setActiveTab] = useState(TABS.CHAPTER);
  const [animationDir, setAnimationDir] = useState('right');
  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleTabChange = (newTab) => {
    if (newTab === activeTab) return;

    const tabsArray = Object.values(TABS);
    const currentIndex = tabsArray.indexOf(activeTab);
    const newIndex = tabsArray.indexOf(newTab);

    setAnimationDir(newIndex > currentIndex ? 'right' : 'left');
    setIsTransitioning(true);

    setTimeout(() => {
      setActiveTab(newTab);
      setIsTransitioning(false);
    }, 150);
  };

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('curbeePlannerAuth') === 'true';
  });
  const [passwordInput, setPasswordInput] = useState('');

  const [tasks, setTasks] = useState([]);
  const [dbLoading, setDbLoading] = useState(true);

  // Fetch from Supabase on mount
  useEffect(() => {
    fetchTasks();

    // Subscribe to live DB changes
    const channel = supabase
      .channel('tasks_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, payload => {
        fetchTasks(); // Resync on remote broadcast
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase.from('tasks').select('*').order('id', { ascending: true });
      if (error) throw error;
      if (data && data.length > 0) {
        setTasks(data);
      } else {
        // Fallback to initial seed if DB is utterly empty
        setTasks(initialData);
        // Optional: you could bulk-insert them here to seed
      }
    } catch (err) {
      console.error('Error fetching tasks from DB:', err);
      // Fallback to emergency local state if network completely fails or DB isn't built
      try {
        const savedTasks = localStorage.getItem('curbeePlannerTasks');
        if (savedTasks) {
          setTasks(JSON.parse(savedTasks));
        } else {
          setTasks(initialData);
        }
      } catch (parseErr) {
        console.warn('Fallback local state corrupted', parseErr);
        setTasks(initialData);
      }
    } finally {
      setDbLoading(false);
    }
  };

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [passwordFieldShake, setPasswordFieldShake] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);

  // Synchronous local backup (useful for aggressive offline recovery if needed)
  useEffect(() => {
    if (tasks.length > 0) {
      localStorage.setItem('curbeePlannerTasks', JSON.stringify(tasks));
    }
  }, [tasks]);

  const generateId = () => {
    const maxId = tasks.reduce((max, task) => {
      const num = parseInt(String(task.id).replace('C-', '').replace('A-', '')) || 0;
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
      link: '',
      notes: '',
      date: new Date().toISOString().split('T')[0],
      whoAsked: 'Amit',
      bucketGuess: '1.0 Polish',
      priorityGuess: 'Medium'
    };

    // Optistic UI Update
    setTasks([...tasks, newTask]);
    startEditing(newTask);

    // Background DB Sync
    supabase.from('tasks').insert([newTask]).then(({ error }) => {
      if (error) console.error("Error inserting task:", error);
    });
  };

  const updateTask = async (id, field, value) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, [field]: value } : t));
    const { error } = await supabase.from('tasks').update({ [field]: value }).eq('id', id);
    if (error) console.error("Error updating DB:", error);
  };

  const moveTask = (id, newTab) => {
    const updatedTasks = tasks.map(t => {
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
    });

    setTasks(updatedTasks);

    // Sync the specific targeted task mutation to the DB
    const mutatedTask = updatedTasks.find(t => t.id === id);
    if (mutatedTask) {
      supabase.from('tasks').update(mutatedTask).eq('id', id).then(({ error }) => {
        if (error) console.error("Error moving task in DB:", error);
      });
    }
  };

  const startEditing = (task) => {
    setEditingId(task.id);
    setEditForm(task);
  };

  const saveEdit = async () => {
    const activeEditTask = tasks.find(t => t.id === editingId);
    const updatedTask = { ...activeEditTask, ...editForm };

    setTasks(tasks.map(t => t.id === editingId ? updatedTask : t));
    setEditingId(null);

    const { error } = await supabase.from('tasks').update(updatedTask).eq('id', updatedTask.id);
    if (error) console.error("Error saving edits to DB:", error);
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

  const uploadToSupabase = async (file) => {
    try {
      // 1. Generate unique file name
      const fileExt = file.name ? file.name.split('.').pop() : 'png';
      const fileName = `${uuidv4()}.${fileExt}`;
      const filePath = `uploads/${fileName}`;

      // 2. Upload to Supabase Storage 'proofs' bucket
      const { error: uploadError } = await supabase.storage
        .from('proofs')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 3. Get the public URL for the newly uploaded file
      const { data } = supabase.storage
        .from('proofs')
        .getPublicUrl(filePath);

      // 4. Update the local editForm state with the new URL
      setEditForm(prev => ({
        ...prev,
        media: [...(prev.media || []), data.publicUrl]
      }));

    } catch (error) {
      console.error('Error uploading image to Supabase Storage:', error);
      alert('Failed to upload image. Make sure the "proofs" Storage bucket exists and is public.');
    }
  };

  const handleMediaUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      await uploadToSupabase(file);
    }
  };

  const handlePaste = async (e) => {
    if (!editingId) return;
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          await uploadToSupabase(file);
        }
      }
    }
  };

  // Setup paste listener
  useEffect(() => {
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [editingId, editForm]);

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

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 selection:bg-white selection:text-black">
        {/* Background ambient light */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-curbee-teal-500/20 rounded-full blur-[100px]" />
          <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-curbee-orange-500/10 rounded-full blur-[80px]" />
        </div>

        <div className="relative z-10 w-full max-w-sm">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-[2rem] shadow-2xl text-center">
            <div className="mb-8 flex justify-center h-16 w-auto">
              {/* Use the logo in dark mode context */}
              <img src="/logo.png" alt="Curbee" className="h-full w-auto object-contain brightness-0 invert opacity-90" />
            </div>

            <h2 className="text-2xl text-white font-light tracking-tight mb-6">Restricted Access</h2>

            <form onSubmit={(e) => {
              e.preventDefault();
              if (passwordInput === '2026') {
                setIsAuthenticated(true);
                sessionStorage.setItem('curbeePlannerAuth', 'true');
              } else {
                setPasswordFieldShake(true);
                setTimeout(() => setPasswordFieldShake(false), 500);
                setPasswordInput('');
              }
            }}>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Enter Password"
                className="w-full bg-black/40 border border-white/10 text-white placeholder:text-white/30 rounded-xl p-4 outline-none focus:ring-2 focus:ring-curbee-teal-500 focus:border-transparent transition-all text-center tracking-[0.2em] font-mono text-xl mb-4"
                autoFocus
              />
              <button
                type="submit"
                className="w-full bg-white text-black font-semibold rounded-xl p-4 hover:bg-slate-200 transition-colors"
              >
                Enter
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (dbLoading) {
    return (
      <div className="min-h-screen bg-[#F5F5F0] flex flex-col items-center justify-center p-6">
        <div className="mb-8 h-12 w-auto animate-pulse">
          <img src="/logo.png" alt="Curbee" className="h-full w-auto object-contain" />
        </div>
        <div className="flex gap-2">
          <div className="w-2 h-2 rounded-full bg-curbee-teal-500 animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 rounded-full bg-curbee-orange-500 animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 rounded-full bg-curbee-amber-500 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-[#F5F5F0] text-slate-900 font-sans p-6 md:p-12 selection:bg-black selection:text-white overflow-x-hidden">

      {/* Header */}
      <header className="max-w-[1400px] mx-auto mb-16 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="mb-8 h-20 w-auto">
            {/* Use the logo in light mode context */}
            <img src="/logo.png" alt="Curbee" className="h-full w-auto object-contain object-left" />
          </div>
          <h1 className="text-5xl md:text-7xl font-sans font-medium tracking-tighter mb-4">Roadmap & Retainer</h1>
          <p className="text-lg md:text-xl text-slate-600 max-w-2xl leading-relaxed">
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
      {/* Main Content Area */}
      <main className="max-w-[1400px] mx-auto overflow-x-hidden">

        {/* Navigation Tabs */}
        <div className="flex overflow-x-auto snap-x scrollbar-hide whitespace-nowrap gap-6 md:gap-8 mb-12 border-b border-black/10 pb-4 relative z-20">
          {Object.values(TABS).map(tab => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={`pb-4 px-2 -mb-[17px] text-sm md:text-base font-semibold tracking-widest uppercase transition-colors relative
                ${activeTab === tab ? 'text-black' : 'text-slate-400 hover:text-slate-600'}`}
            >
              {tab}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 w-full h-[2px] bg-black" />
              )}
            </button>
          ))}
        </div>

        {filteredTasks.length === 0 && (
          <div className="py-24 text-center border-2 border-dashed border-slate-300 rounded-[2rem]">
            <p className="text-xl text-slate-400 font-light">No items in this view.</p>
          </div>
        )}

        {/* Board / Grid with Animation Wrapper */}
        <div className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 auto-rows-auto transition-opacity duration-150 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
          {filteredTasks.map(task => {
            const isEditing = editingId === task.id;
            const bgStyle = getBucketStyle(activeTab === TABS.BACKLOG ? task.bucketGuess : task.bucket);
            const isDarkBg = bgStyle.includes('text-white');

            // Animation class for individual cards
            const animationClass = isTransitioning ? '' : (animationDir === 'right' ? 'animate-slide-in-right' : 'animate-slide-in-left');

            return (
              <div
                key={task.id}
                className={`group relative rounded-[2rem] p-8 flex flex-col justify-between overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 ${bgStyle} ${animationClass}`}
                style={{ minHeight: '320px', animationFillMode: 'both' }}
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

                    <div className="mt-4">
                      <label className="text-xs uppercase tracking-wider opacity-60 mb-1 block">External Link</label>
                      <input type="text" value={editForm.link || ''} onChange={e => setEditForm({ ...editForm, link: e.target.value })} className="w-full bg-black/10 rounded-lg p-2 text-sm outline-none placeholder:text-black/30" placeholder="https://" />
                    </div>
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

                        {activeTab === TABS.ARCHIVE && (
                          <button
                            onClick={() => moveTask(task.id, TABS.CHAPTER)}
                            className={`p-2 rounded-full backdrop-blur-md border ${isDarkBg ? 'bg-white/10 border-white/20 hover:bg-white/20' : 'bg-black/5 border-black/10 hover:bg-black/10'} transition-all`}
                            title="Restore to Active"
                          >
                            <ArrowLeft size={16} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Middle: Title & Huge Metric styling */}
                    <div className="mt-8 z-10 flex-grow">
                      <h3 className="text-2xl md:text-3xl font-medium leading-tight tracking-tight mb-4 flex items-start gap-2">
                        <span>{task.item}</span>
                        {task.link && (
                          <a href={task.link.startsWith('http') ? task.link : `https://${task.link}`} target="_blank" rel="noopener noreferrer" className="mt-1 opacity-50 hover:opacity-100 transition-opacity flex-shrink-0" onClick={e => e.stopPropagation()}>
                            <ExternalLink size={20} />
                          </a>
                        )}
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
                      {String(task.id).includes('-') ? String(task.id).split('-')[1] : task.id}
                    </div>
                  </>
                )}

                {/* Timeline Media Carousel Drawer - Display Mode (Absolute Positioned Bottom) */}
                {!isEditing && task.media && task.media.length > 0 && (
                  <div className={`absolute z-20 bottom-0 left-0 right-0 p-6 pt-4 rounded-t-3xl backdrop-blur-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.15)] transform transition-transform duration-300 translate-y-full group-hover:translate-y-0 ${isDarkBg ? 'bg-white/20 border-t border-white/30' : 'bg-black/10 border-t border-black/10'}`}>
                    <span className="text-xs uppercase tracking-widest opacity-80 font-bold mb-3 block">Visual Proof ({task.media.length})</span>
                    <div className="flex gap-3 overflow-x-auto pb-2 snap-x scrollbar-hide">
                      {task.media.map((item, idx) => (
                        <img key={idx} src={item} alt="Proof" onClick={() => setLightboxImage(item)} className="cursor-pointer h-24 w-auto rounded-lg shadow-sm border border-black/10 snap-start object-cover flex-shrink-0 hover:scale-105 transition-transform" />
                      ))}
                    </div>
                  </div>
                )}

                {/* Media Uploader / Manager - Edit Mode */}
                {isEditing && (
                  <div className={`mt-6 pt-4 border-t ${isDarkBg ? 'border-white/20' : 'border-black/20'}`}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs uppercase tracking-wider opacity-60 font-semibold">Timeline Media</span>
                      <label className="cursor-pointer text-xs font-semibold px-3 py-1 bg-black/10 rounded-full hover:bg-black/20 transition-colors">
                        Add Image
                        <input type="file" accept="image/*" onChange={handleMediaUpload} className="hidden" />
                      </label>
                    </div>
                    {/* Make sure we instruct them about pasting */}
                    {(!editForm.media || editForm.media.length === 0) && (
                      <p className="text-xs opacity-50 italic mb-2">Or paste (Cmd+V) directly anywhere on this card.</p>
                    )}

                    {editForm.media && editForm.media.length > 0 && (
                      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        {editForm.media.map((m, i) => (
                          <div key={i} className="relative group/media flex-shrink-0">
                            <img src={m} alt="" className="h-16 w-16 object-cover rounded shadow-sm opacity-90 group-hover/media:opacity-100" />
                            <button
                              onClick={() => setEditForm(prev => ({ ...prev, media: prev.media.filter((_, index) => index !== i) }))}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center shadow hover:scale-110 opacity-0 group-hover/media:opacity-100 transition-all text-xs z-10"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Lightbox Modal */}
        {lightboxImage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm" onClick={() => setLightboxImage(null)}>
            <button className="absolute top-6 right-6 text-white/70 hover:text-white transition-colors" onClick={() => setLightboxImage(null)}>
              <X size={32} />
            </button>
            <img src={lightboxImage} alt="Fullscreen Proof" className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl border border-white/10" onClick={e => e.stopPropagation()} />
          </div>
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <MainApp />
    </ErrorBoundary>
  );
}
