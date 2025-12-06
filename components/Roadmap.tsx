import React, { useState, useEffect, useMemo } from 'react';
import { RoadmapPhase, UserProfile, RoadmapItem } from '../types';
import { Subscription } from './Subscription';
import { CheckCircle2, Circle, ExternalLink, RefreshCw, Briefcase, Award, Code, Zap, Clock, ChevronDown, ChevronUp, Star, AlertTriangle, CheckCircle, RotateCcw, Lock, Filter, Search, Info, Check, Pencil, Compass, Youtube, PlayCircle } from 'lucide-react';

interface PacingStatus {
    status: 'ahead' | 'behind' | 'on-track' | 'critical';
    days: number;
    message: string;
}

interface RoadmapProps {
  roadmap: RoadmapPhase[] | null;
  user: UserProfile;
  onSubscribe: (plan: 'monthly' | 'yearly') => void;
  onUpdateProgress: (itemId: string) => void;
  onReset: () => void;
  onResetPhase: (phaseIndex: number) => void;
  onSwitchCareer: (careerId: string) => void;
  onEditTargetDate: () => void;
  pacing: PacingStatus;
  isLoading?: boolean;
  daysRemaining: number;
}

export const Roadmap: React.FC<RoadmapProps> = ({ 
  roadmap, 
  user, 
  onSubscribe, 
  onUpdateProgress, 
  onReset, 
  onResetPhase,
  onSwitchCareer,
  onEditTargetDate,
  pacing, 
  isLoading = false, 
  daysRemaining 
}) => {
  const [expandedPhase, setExpandedPhase] = useState<number | null>(0);
  const [nextTask, setNextTask] = useState<{item: RoadmapItem, phaseIndex: number} | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [itemToConfirm, setItemToConfirm] = useState<RoadmapItem | null>(null);
  const [resetIntent, setResetIntent] = useState<{type: 'all' | 'phase', index: number} | null>(null);
  const [resetConfirmInput, setResetConfirmInput] = useState('');
  const [showCareerMenu, setShowCareerMenu] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [completionPercentage, setCompletionPercentage] = useState(0);
  
  // Learn More State
  const [expandedLearnMoreItems, setExpandedLearnMoreItems] = useState<Set<string>>(new Set());

  const categories = [
      { id: 'all', label: 'All Tasks' },
      { id: 'pending', label: 'Incomplete' },
      { id: 'completed', label: 'Completed' },
      { id: 'skill', label: 'Skills' },
      { id: 'project', label: 'Projects' },
      { id: 'internship', label: 'Internships' },
      { id: 'certificate', label: 'Certificates' },
  ];

  // Flatten the roadmap to determine strict linear sequence
  const flatRoadmapItems = useMemo(() => {
      if (!roadmap) return [];
      return roadmap.flatMap(phase => phase.items);
  }, [roadmap]);

  // Check if item is locked based on strict linear progression
  const isLocked = (item: RoadmapItem) => {
      if (!flatRoadmapItems.length) return false;
      const index = flatRoadmapItems.findIndex(i => i.id === item.id);
      
      // First item is never locked
      if (index <= 0) return false;
      
      // Locked if previous item is NOT completed
      const prevItem = flatRoadmapItems[index - 1];
      return prevItem.status !== 'completed';
  };

  useEffect(() => {
    if (roadmap && !isLoading) {
        let foundNext = false;
        let activePhaseIndex = 0;
        let totalItems = 0;
        let completedItems = 0;

        // Calculate totals and find next task
        for (let i = 0; i < roadmap.length; i++) {
            const phase = roadmap[i];
            totalItems += phase.items.length;
            completedItems += phase.items.filter(i => i.status === 'completed').length;
        }

        // Find the first pending task in strict sequence
        const firstPending = flatRoadmapItems.find(item => item.status === 'pending');
        
        if (firstPending) {
            // Find which phase this item belongs to
            const phaseIndex = roadmap.findIndex(p => p.items.some(i => i.id === firstPending.id));
            if (phaseIndex !== -1) {
                setNextTask({ item: firstPending, phaseIndex });
                activePhaseIndex = phaseIndex;
                foundNext = true;
            }
        }

        if (totalItems > 0 && completedItems === totalItems) {
            setIsCompleted(true);
            setNextTask(null);
            activePhaseIndex = roadmap.length - 1;
        } else {
            setIsCompleted(false);
            if (!foundNext) setNextTask(null);
        }
        
        setExpandedPhase(activePhaseIndex);
        setCompletionPercentage(totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0);
    }
  }, [roadmap, isLoading, flatRoadmapItems]);

  const togglePhase = (index: number) => {
      setExpandedPhase(expandedPhase === index ? null : index);
  };

  const getActiveCareer = () => {
      return user.activeCareers.find(c => c.careerId === user.currentCareerId);
  }

  const getActiveCareerDate = () => {
      const active = getActiveCareer();
      return active ? active.targetCompletionDate : (user.activeCareers[0]?.targetCompletionDate || 'N/A');
  }

  const getStartDateDisplay = () => {
      const active = getActiveCareer();
      if (!active) return 'N/A';
      return new Date(active.addedAt).toLocaleDateString();
  }

  const handleResetRequest = () => {
      setResetIntent({ type: 'all', index: -1 });
      setResetConfirmInput('');
  };

  const handleResetPhaseRequest = (e: React.MouseEvent, index: number) => {
      e.stopPropagation();
      setResetIntent({ type: 'phase', index });
      setResetConfirmInput(''); 
  };

  const handleTaskClick = (item: RoadmapItem) => {
      if (isLocked(item)) return;

      if (item.status === 'pending') {
          setItemToConfirm(item);
      } else {
          onUpdateProgress(item.id);
      }
  };

  const confirmCompletion = () => {
      if (itemToConfirm) {
          onUpdateProgress(itemToConfirm.id);
          setItemToConfirm(null);
      }
  };

  const confirmReset = () => {
      if (!resetIntent) return;
      
      if (resetIntent.type === 'all' && resetConfirmInput.toUpperCase() !== 'RESET') {
          return;
      }

      if (resetIntent.type === 'all') {
          onReset();
      } else {
          onResetPhase(resetIntent.index);
      }
      setResetIntent(null);
      setResetConfirmInput('');
  };

  const toggleLearnMore = (e: React.MouseEvent, item: RoadmapItem) => {
      e.stopPropagation();
      const newSet = new Set(expandedLearnMoreItems);
      if (newSet.has(item.id)) {
          newSet.delete(item.id);
      } else {
          newSet.add(item.id);
      }
      setExpandedLearnMoreItems(newSet);
  };

  const filterItem = (item: RoadmapItem) => {
      const matchesCategory = () => {
          if (activeCategory === 'all') return true;
          if (activeCategory === 'completed') return item.status === 'completed';
          if (activeCategory === 'pending') return item.status === 'pending';
          return item.type === activeCategory;
      };

      const matchesSearch = () => {
          if (!searchQuery) return true;
          const query = searchQuery.toLowerCase();
          return item.title.toLowerCase().includes(query) || 
                 item.description.toLowerCase().includes(query) ||
                 item.type.toLowerCase().includes(query);
      };

      return matchesCategory() && matchesSearch();
  };

  if (isLoading || !roadmap) return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-fade-in w-full overflow-hidden">
           <div className="relative">
               <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full animate-pulse"></div>
               <div className="relative w-24 h-24 bg-slate-900/90 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-500/30 border border-slate-800 ring-1 ring-white/10">
                   <Compass className="h-12 w-12 text-indigo-400 animate-[spin_4s_linear_infinite]" />
               </div>
           </div>
           <div>
               <h3 className="text-xl font-bold text-white mb-2">Charting Your Path...</h3>
               <p className="text-slate-400 animate-pulse text-sm">Nova is organizing your journey.</p>
           </div>
      </div>
  );

  const isPaid = user.subscriptionStatus !== 'free';
  const currentCareer = getActiveCareer();

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'project': return <Code className="h-4 w-4 text-cyan-400" />;
      case 'internship': return <Briefcase className="h-4 w-4 text-purple-400" />;
      case 'certificate': return <Award className="h-4 w-4 text-orange-400" />;
      default: return <Zap className="h-4 w-4 text-indigo-400" />;
    }
  };

  return (
    <div className="relative min-h-[80vh] pb-10 w-full overflow-x-hidden">
      {!isPaid && <Subscription onSubscribe={onSubscribe} />}
      
      {/* Task Confirmation Modal */}
      {itemToConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-slate-900 border border-indigo-500/50 rounded-3xl p-6 max-w-sm w-full shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
                <div className="flex items-start gap-4 mb-4">
                    <div className="p-3 bg-indigo-500/20 rounded-xl text-indigo-400 shrink-0">
                        <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">Complete Task?</h3>
                        <p className="text-slate-400 text-sm mt-1">
                            Are you sure you want to mark <span className="text-white font-medium">"{itemToConfirm.title}"</span> as completed?
                        </p>
                    </div>
                </div>
                <div className="flex gap-3 mt-6">
                    <button 
                        onClick={() => setItemToConfirm(null)}
                        className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl transition-colors text-sm"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={confirmCompletion}
                        className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/20 transition-all text-sm flex items-center justify-center gap-2"
                    >
                        Confirm <CheckCircle className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {resetIntent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-slate-900 border border-red-500/30 rounded-3xl p-6 max-w-sm w-full shadow-2xl relative overflow-hidden">
                <div className="flex items-start gap-4 mb-4">
                    <div className="p-3 bg-red-500/20 rounded-xl text-red-400 shrink-0">
                        <AlertTriangle className="h-6 w-6" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">Reset Progress?</h3>
                        <p className="text-slate-400 text-sm mt-1">
                            {resetIntent.type === 'all' 
                                ? "This will wipe ALL progress for this roadmap. Cannot be undone."
                                : "This will reset all tasks in this phase."
                            }
                        </p>
                    </div>
                </div>
                
                {resetIntent.type === 'all' && (
                    <div className="mb-6">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                            Type <span className="text-white">RESET</span> to confirm
                        </label>
                        <input 
                            type="text" 
                            className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-red-500 outline-none text-center font-bold uppercase"
                            value={resetConfirmInput}
                            onChange={(e) => setResetConfirmInput(e.target.value)}
                            placeholder="RESET"
                            autoFocus
                        />
                    </div>
                )}

                <div className="flex gap-3 mt-2">
                    <button 
                        onClick={() => setResetIntent(null)}
                        className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl transition-colors text-sm"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={confirmReset}
                        disabled={resetIntent.type === 'all' && resetConfirmInput.toUpperCase() !== 'RESET'}
                        className="flex-1 py-3 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl shadow-lg shadow-red-900/20 transition-all text-sm flex items-center justify-center gap-2"
                    >
                        Yes, Reset <RotateCcw className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
      )}

      <div className={`p-4 md:p-6 space-y-6 ${!isPaid ? 'blur-sm select-none h-[80vh] overflow-hidden' : ''}`}>
        
        {/* Header & Controls */}
        <div className="flex flex-col gap-6 bg-slate-900/50 p-6 rounded-3xl border border-slate-800 w-full overflow-hidden">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-2 relative z-20">
                        {user.activeCareers.length > 1 ? (
                            <div className="relative">
                                <button 
                                    onClick={() => setShowCareerMenu(!showCareerMenu)}
                                    className="flex items-center gap-2 text-2xl font-bold text-white hover:text-indigo-300 transition-colors"
                                >
                                    {currentCareer?.title || "Career Roadmap"}
                                    <ChevronDown className="h-5 w-5 text-slate-400" />
                                </button>
                                {showCareerMenu && (
                                    <div className="absolute left-0 top-full mt-2 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50 animate-fade-in">
                                        <div className="p-2 space-y-1">
                                            {user.activeCareers.map(c => (
                                                <button 
                                                    key={c.careerId}
                                                    onClick={() => {
                                                        onSwitchCareer(c.careerId);
                                                        setShowCareerMenu(false);
                                                    }}
                                                    className={`w-full text-left px-3 py-3 rounded-lg text-sm flex items-center justify-between ${c.careerId === user.currentCareerId ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
                                                >
                                                    <span className="truncate font-medium">{c.title}</span>
                                                    {c.careerId === user.currentCareerId && <Check className="h-4 w-4" />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <h2 className="text-2xl font-bold text-white">{currentCareer?.title || "Adaptive Roadmap"}</h2>
                        )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-400">
                        <span className="flex items-center gap-2"><Zap className="h-4 w-4 text-yellow-400" /> AI Optimized</span>
                        <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                        <span>{user.activeCareers.length} Active Path{user.activeCareers.length !== 1 ? 's' : ''}</span>
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                    {/* Search Bar */}
                    <div className="relative group w-full sm:w-64">
                        <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                        <input 
                            type="text" 
                            placeholder="Search tasks, skills..." 
                            className="w-full pl-9 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-indigo-500 outline-none transition-all text-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    
                    <button 
                        onClick={handleResetRequest}
                        className="flex items-center gap-2 bg-slate-900 hover:bg-red-900/20 text-slate-400 hover:text-red-400 px-4 py-3 rounded-xl transition-all text-sm font-bold border border-slate-800 whitespace-nowrap"
                        title="Reset all progress in this roadmap"
                    >
                        <RotateCcw className="h-4 w-4" /> Reset
                    </button>
                </div>
            </div>

            {/* Quick Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t border-slate-800/50">
                <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800 text-center">
                    <div className="text-2xl font-bold text-white">{daysRemaining}</div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold flex items-center justify-center gap-1"><Clock className="h-3 w-3" /> Days Left</div>
                </div>
                
                {/* Progress Bar Stat */}
                <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800 flex flex-col justify-center px-4">
                     <div className="flex justify-between items-end mb-1">
                         <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Progress</div>
                         <div className="text-sm font-bold text-emerald-400">{completionPercentage}%</div>
                     </div>
                     <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                         <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${completionPercentage}%` }}></div>
                     </div>
                </div>

                <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800 flex items-center justify-between px-4 md:px-6 col-span-2 md:col-span-1">
                    <div className="text-left">
                         <div className="text-sm font-bold text-slate-300">Start Date</div>
                         <div className="text-xs text-slate-500">{getStartDateDisplay()}</div>
                    </div>
                </div>

                <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800 flex items-center justify-between px-4 md:px-6 group relative cursor-pointer hover:border-indigo-500/50 transition-colors col-span-2 md:col-span-1" onClick={onEditTargetDate}>
                    <div className="text-left">
                         <div className="text-sm font-bold text-slate-300">Target Date</div>
                         <div className="text-xs text-slate-500">{getActiveCareerDate()}</div>
                    </div>
                    <div className="p-2 bg-slate-800 rounded-lg text-slate-400 group-hover:text-white group-hover:bg-indigo-600 transition-all">
                        <Pencil className="h-4 w-4" />
                    </div>
                </div>
            </div>
        </div>

        {/* Pacing Alert */}
        {pacing.status !== 'on-track' && !isCompleted && (
             <div className={`p-4 rounded-2xl border flex items-center gap-4 ${pacing.status === 'behind' ? 'bg-red-900/10 border-red-500/30 text-red-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'}`}>
                 {pacing.status === 'behind' ? <AlertTriangle className="h-5 w-5 text-red-500" /> : <CheckCircle className="h-5 w-5" />}
                 <div>
                    <div className="font-bold">{pacing.message}</div>
                    <div className={`text-xs opacity-80 ${pacing.status === 'behind' ? 'text-red-300' : 'text-emerald-200'}`}>
                        {pacing.status === 'behind' ? "Try to complete extra modules today to catch up!" : "Great job! You are learning faster than planned."}
                    </div>
                 </div>
             </div>
        )}

        {/* Current Focus Card */}
        {nextTask && activeCategory === 'all' && !searchQuery && (
            <div className="bg-gradient-to-r from-indigo-900/40 to-slate-900 p-6 rounded-3xl border border-indigo-500/30 shadow-lg shadow-indigo-900/10 animate-fade-in w-full overflow-hidden">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <div className="flex items-center gap-2 text-indigo-400 mb-1">
                            <Star className="h-4 w-4 fill-indigo-400" />
                            <span className="text-xs font-bold uppercase tracking-wider">Current Focus</span>
                        </div>
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            {nextTask.item.title}
                            <span className="text-sm font-normal text-slate-400 font-mono bg-slate-950/50 px-2 py-0.5 rounded border border-slate-800">
                                {nextTask.item.duration}
                            </span>
                        </h3>
                    </div>
                </div>
                <p className="text-slate-300 text-sm mb-6 max-w-2xl">{nextTask.item.description}</p>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                    <button 
                        onClick={() => handleTaskClick(nextTask.item)}
                        disabled={isLocked(nextTask.item)}
                        className={`w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${isLocked(nextTask.item) ? 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 active:scale-95'}`}
                        title={isLocked(nextTask.item) ? "Complete prior dependencies first" : ""}
                    >
                         {isLocked(nextTask.item) ? <Lock className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
                        {isLocked(nextTask.item) ? "Locked by Dependency" : "Mark as Completed"}
                    </button>
                    {nextTask.item.link && (
                         <a 
                            href={nextTask.item.link} 
                            target="_blank" 
                            rel="noreferrer"
                            className="w-full sm:w-auto justify-center px-4 py-3 rounded-xl border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 transition-all text-sm font-medium flex items-center gap-2"
                         >
                            Open Resource <ExternalLink className="h-4 w-4" />
                         </a>
                    )}
                </div>
            </div>
        )}

        {/* Category Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {categories.map(cat => (
                <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all border ${
                        activeCategory === cat.id 
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' 
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                    }`}
                >
                    {cat.label}
                </button>
            ))}
        </div>

        {/* LIST VIEW (Accordion) */}
        <div className="space-y-4">
            {roadmap.map((phase, pIndex) => {
                const isExpanded = expandedPhase === pIndex || activeCategory !== 'all' || searchQuery !== '';
                const completedCount = phase.items.filter(i => i.status === 'completed').length;
                const totalCount = phase.items.length;
                const isPhaseDone = completedCount === totalCount;
                const isPhaseStarted = completedCount > 0;
                
                const visibleItems = phase.items.filter(filterItem);
                
                if (visibleItems.length === 0 && (activeCategory !== 'all' || searchQuery !== '')) return null;

                return (
                    <div key={pIndex} className={`relative bg-slate-900 border transition-all duration-300 rounded-2xl overflow-hidden ${isExpanded ? 'border-indigo-500/50 shadow-xl shadow-indigo-900/10' : 'border-slate-800 hover:border-slate-700'}`}>
                        
                        <div className="flex items-center justify-between p-5">
                             <button 
                                onClick={() => togglePhase(pIndex)}
                                className="flex-1 flex items-center gap-4 text-left focus:outline-none"
                            >
                                <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 text-xs font-bold shrink-0 ${isPhaseDone ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                                    {isPhaseDone ? <CheckCircle2 className="h-4 w-4" /> : pIndex + 1}
                                </div>
                                <div>
                                    <h3 className={`font-bold text-base md:text-lg ${isPhaseDone ? 'text-emerald-400' : 'text-slate-200'}`}>
                                        {phase.phaseName}
                                    </h3>
                                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                                        <span>{completedCount}/{totalCount} Completed</span>
                                        <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                                        <span>Phase {pIndex + 1}</span>
                                    </div>
                                </div>
                            </button>

                            <div className="flex items-center gap-3">
                                {isPhaseStarted && (
                                    <button 
                                        onClick={(e) => handleResetPhaseRequest(e, pIndex)}
                                        className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                                        title="Reset this phase"
                                    >
                                        <RotateCcw className="h-4 w-4" />
                                    </button>
                                )}

                                <div className="hidden md:block h-2 w-24 bg-slate-800 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full rounded-full ${isPhaseDone ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                                        style={{ width: `${(completedCount / totalCount) * 100}%` }}
                                    ></div>
                                </div>
                                <button onClick={() => togglePhase(pIndex)}>
                                    {isExpanded ? <ChevronUp className="h-5 w-5 text-slate-500" /> : <ChevronDown className="h-5 w-5 text-slate-500" />}
                                </button>
                            </div>
                        </div>

                        {isExpanded && (
                            <div className="border-t border-slate-800 bg-slate-950/30 p-4 space-y-2 animate-fade-in">
                                {visibleItems.map((item) => {
                                    const showDetails = expandedLearnMoreItems.has(item.id);
                                    const locked = isLocked(item);

                                    return (
                                        <div 
                                            key={item.id} 
                                            className={`relative rounded-xl border transition-all group/item overflow-hidden ${item.status === 'completed' ? 'bg-slate-900 border-slate-800/50 opacity-60' : locked ? 'bg-slate-900/50 border-slate-800 opacity-50 grayscale' : 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800 hover:border-indigo-500/30'}`}
                                        >
                                            <div className="flex items-center gap-4 p-3">
                                                <button 
                                                    onClick={() => !locked && handleTaskClick(item)} 
                                                    disabled={locked || item.status === 'completed'}
                                                    className={`shrink-0 focus:outline-none p-1 transition-transform ${locked ? 'cursor-not-allowed opacity-50' : 'hover:scale-110'}`}
                                                >
                                                    {item.status === 'completed' 
                                                        ? <CheckCircle2 className="h-6 w-6 text-emerald-500" /> 
                                                        : locked 
                                                            ? <Lock className="h-5 w-5 text-slate-600" />
                                                            : <Circle className="h-6 w-6 text-slate-600 group-hover/item:text-indigo-400 transition-colors" />}
                                                </button>
                                                
                                                <div className={`flex-1 min-w-0 ${locked ? 'cursor-not-allowed' : 'cursor-pointer'}`} onClick={() => !locked && handleTaskClick(item)}>
                                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                                        {getTypeIcon(item.type)}
                                                        <span className={`font-medium text-sm truncate ${item.status === 'completed' ? 'text-slate-500 line-through' : locked ? 'text-slate-500' : 'text-slate-200'}`}>
                                                            {item.title}
                                                        </span>
                                                        <span className="text-xs font-mono text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                                                            {item.duration}
                                                        </span>
                                                        {item.isAIAdaptation && (
                                                            <span className="text-[9px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/30 uppercase tracking-wide">
                                                                New
                                                            </span>
                                                        )}
                                                        {locked && (
                                                             <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700 uppercase tracking-wide flex items-center gap-1">
                                                                <Lock className="h-2 w-2" /> Locked
                                                             </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-slate-400 line-clamp-1">{item.description}</p>
                                                </div>

                                                <div className="flex items-center gap-2 shrink-0">
                                                    {item.link && !locked && (
                                                        <a 
                                                            href={item.link} 
                                                            target="_blank" 
                                                            rel="noreferrer" 
                                                            className="p-2 rounded-lg text-indigo-400 hover:bg-indigo-500/10 transition-colors hidden md:block"
                                                            title="Open Resource"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <ExternalLink className="h-4 w-4" />
                                                        </a>
                                                    )}
                                                    <button 
                                                        onClick={(e) => toggleLearnMore(e, item)}
                                                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${showDetails ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-300' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-600'}`}
                                                    >
                                                        <Info className="h-3 w-3" />
                                                        <span className="hidden sm:inline">Learn More</span>
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Expandable Details Panel */}
                                            {showDetails && (
                                                <div className="border-t border-slate-800 bg-slate-950/50 p-4 animate-fade-in">
                                                     <div className="space-y-4">
                                                        {item.explanation && (
                                                            <div className="text-sm text-slate-300 leading-relaxed border-l-2 border-indigo-500 pl-4">
                                                                <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">Concept Explained</h4>
                                                                <div className="whitespace-pre-line">{item.explanation}</div>
                                                            </div>
                                                        )}
                                                        
                                                        {/* Suggested Resources (YouTube) */}
                                                        {item.suggestedResources && item.suggestedResources.length > 0 && (
                                                            <div>
                                                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                                                                    <Youtube className="h-3 w-3 text-red-500" /> Recommended Tutorials
                                                                </h4>
                                                                <div className="grid gap-2 sm:grid-cols-2">
                                                                    {item.suggestedResources.map((res, idx) => (
                                                                        <a 
                                                                            key={idx}
                                                                            href={res.url}
                                                                            target="_blank"
                                                                            rel="noreferrer"
                                                                            className="flex items-center gap-3 p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-red-500/30 hover:bg-slate-800 transition-all group"
                                                                        >
                                                                            <div className="w-8 h-8 rounded-full bg-red-900/10 flex items-center justify-center shrink-0 group-hover:bg-red-600 transition-colors">
                                                                                <PlayCircle className="h-4 w-4 text-red-500 group-hover:text-white" />
                                                                            </div>
                                                                            <span className="text-xs text-slate-300 group-hover:text-white truncate flex-1">{res.title}</span>
                                                                            <ExternalLink className="h-3 w-3 text-slate-600 group-hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all" />
                                                                        </a>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Internship/Certificate Link (if not already shown prominently or just to reinforce) */}
                                                        {item.link && (item.type === 'internship' || item.type === 'certificate') && (
                                                            <div>
                                                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                                                                    <Briefcase className="h-3 w-3 text-emerald-500" /> Opportunity Link
                                                                </h4>
                                                                <a 
                                                                    href={item.link}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="flex items-center gap-3 p-3 rounded-lg bg-emerald-900/10 border border-emerald-500/20 hover:bg-emerald-900/20 hover:border-emerald-500/40 transition-all group"
                                                                >
                                                                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                                                                        <ExternalLink className="h-4 w-4 text-emerald-400" />
                                                                    </div>
                                                                    <div className="flex-1">
                                                                        <div className="text-sm font-bold text-emerald-400 group-hover:text-emerald-300">
                                                                            {item.type === 'internship' ? 'Apply for Internship' : 'View Certification'}
                                                                        </div>
                                                                        <div className="text-xs text-slate-400 truncate">{item.link}</div>
                                                                    </div>
                                                                </a>
                                                            </div>
                                                        )}
                                                     </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
      </div>
    </div>
  );
};