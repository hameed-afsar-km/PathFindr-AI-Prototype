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

  // Flatten the roadmap to determine strict global linear sequence
  const flatRoadmapItems = useMemo(() => {
      if (!roadmap) return [];
      return roadmap.flatMap(phase => phase.items || []);
  }, [roadmap]);

  /**
   * FIX: Strict linear dependency check. 
   * A task is locked if it's not the very first task AND the previous task is not completed.
   */
  const isLocked = (item: RoadmapItem) => {
      if (item.status === 'completed') return false;
      const index = flatRoadmapItems.findIndex(i => i.id === item.id);
      
      // First task in the entire roadmap is never locked
      if (index <= 0) return false;
      
      // Previous task in the sequence
      const prevItem = flatRoadmapItems[index - 1];
      return prevItem.status !== 'completed';
  };

  useEffect(() => {
    if (roadmap && !isLoading) {
        let totalItems = 0;
        let completedItems = 0;
        let firstPendingPhase = 0;
        let foundPending = false;

        roadmap.forEach((phase, idx) => {
            const pItems = phase.items || [];
            totalItems += pItems.length;
            const cCount = pItems.filter(i => i.status === 'completed').length;
            completedItems += cCount;
            
            if (!foundPending && cCount < pItems.length) {
                firstPendingPhase = idx;
                foundPending = true;
            }
        });

        setExpandedPhase(firstPendingPhase);
        setCompletionPercentage(totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0);
    }
  }, [roadmap, isLoading, flatRoadmapItems]);

  const togglePhase = (index: number) => {
      setExpandedPhase(expandedPhase === index ? null : index);
  };

  const getActiveCareer = () => user.activeCareers.find(c => c.careerId === user.currentCareerId);

  const getActiveCareerDate = () => {
      const active = getActiveCareer();
      return active?.targetCompletionDate || 'N/A';
  }

  const getStartDateDisplay = () => {
      const active = getActiveCareer();
      return active ? new Date(active.addedAt).toLocaleDateString() : 'N/A';
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
      if (resetIntent.type === 'all' && resetConfirmInput.toUpperCase() !== 'RESET') return;
      
      if (resetIntent.type === 'all') onReset();
      else onResetPhase(resetIntent.index);
      
      setResetIntent(null);
  };

  const toggleLearnMore = (e: React.MouseEvent, item: RoadmapItem) => {
      e.stopPropagation();
      const newSet = new Set(expandedLearnMoreItems);
      if (newSet.has(item.id)) newSet.delete(item.id);
      else newSet.add(item.id);
      setExpandedLearnMoreItems(newSet);
  };

  const filterItem = (item: RoadmapItem) => {
      const matchesCategory = () => {
          if (activeCategory === 'all') return true;
          if (activeCategory === 'completed') return item.status === 'completed';
          if (activeCategory === 'pending') return item.status !== 'completed';
          return item.type === activeCategory;
      };
      const matchesSearch = () => {
          if (!searchQuery) return true;
          const query = searchQuery.toLowerCase();
          return item.title.toLowerCase().includes(query) || item.description.toLowerCase().includes(query);
      };
      return matchesCategory() && matchesSearch();
  };

  if (isLoading || !roadmap) return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-fade-in w-full">
           <Compass className="h-12 w-12 text-indigo-400 animate-spin" />
           <h3 className="text-xl font-bold text-white mb-2">Architecting Roadmap...</h3>
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
                            Ready to mark <span className="text-white font-medium">"{itemToConfirm.title}"</span> as finished?
                        </p>
                    </div>
                </div>
                <div className="flex gap-3 mt-6">
                    <button onClick={() => setItemToConfirm(null)} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-sm transition-colors">Cancel</button>
                    <button onClick={confirmCompletion} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl shadow-lg transition-all text-sm flex items-center justify-center gap-2">Confirm <CheckCircle className="h-4 w-4" /></button>
                </div>
            </div>
        </div>
      )}

      {resetIntent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-slate-900 border border-red-500/30 rounded-3xl p-6 max-w-sm w-full shadow-2xl relative overflow-hidden">
                <div className="flex items-start gap-4 mb-4">
                    <div className="p-3 bg-red-500/20 rounded-xl text-red-400 shrink-0"><AlertTriangle className="h-6 w-6" /></div>
                    <div>
                        <h3 className="text-lg font-bold text-white">Reset Progress?</h3>
                        <p className="text-slate-400 text-sm mt-1">{resetIntent.type === 'all' ? "Wipe ALL progress for this path? Cannot be undone." : "Reset all tasks in this phase?"}</p>
                    </div>
                </div>
                {resetIntent.type === 'all' && (
                    <div className="mb-6">
                        <label className="text-xs font-bold text-slate-500 uppercase mb-2 block tracking-wider">Type <span className="text-white">RESET</span> to confirm</label>
                        <input type="text" className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-red-500 outline-none text-center font-bold uppercase" value={resetConfirmInput} onChange={(e) => setResetConfirmInput(e.target.value)} placeholder="RESET" autoFocus />
                    </div>
                )}
                <div className="flex gap-3">
                    <button onClick={() => setResetIntent(null)} className="flex-1 py-3 bg-slate-800 text-slate-300 font-semibold rounded-xl text-sm">Cancel</button>
                    <button onClick={confirmReset} disabled={resetIntent.type === 'all' && resetConfirmInput.toUpperCase() !== 'RESET'} className="flex-1 py-3 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2">Yes, Reset <RotateCcw className="h-4 w-4" /></button>
                </div>
            </div>
        </div>
      )}

      <div className={`p-4 md:p-6 space-y-6 ${!isPaid ? 'blur-sm select-none h-[80vh] overflow-hidden' : ''}`}>
        <div className="flex flex-col gap-6 bg-slate-900/50 p-6 rounded-3xl border border-slate-800">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div className="relative z-20">
                    <h2 className="text-2xl font-bold text-white mb-2">{currentCareer?.title || "Your Pathway"}</h2>
                    <div className="flex items-center gap-4 text-sm text-slate-400">
                        <span className="flex items-center gap-2"><Zap className="h-4 w-4 text-yellow-400" /> AI Optimized</span>
                        <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                        <span>{daysRemaining} Tasks Remaining</span>
                    </div>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-500" />
                        <input type="text" placeholder="Search tasks..." className="w-full pl-9 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-indigo-500 outline-none text-sm" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                    </div>
                    <button onClick={handleResetRequest} className="p-3 bg-slate-900 hover:bg-red-900/20 text-slate-400 hover:text-red-400 rounded-xl border border-slate-800 transition-colors"><RotateCcw className="h-4 w-4" /></button>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-800/50">
                <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800 text-center">
                    <div className="text-xl font-bold text-white">{daysRemaining}</div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold"><Clock className="h-3 w-3 inline mr-1" /> Work Days</div>
                </div>
                <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800 px-4 flex flex-col justify-center">
                     <div className="flex justify-between items-end mb-1"><div className="text-[10px] uppercase text-slate-500 font-bold">Progress</div><div className="text-xs font-bold text-emerald-400">{completionPercentage}%</div></div>
                     <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${completionPercentage}%` }}></div></div>
                </div>
                <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800 text-center">
                     <div className="text-xs font-bold text-slate-300">Start</div>
                     <div className="text-[10px] text-slate-500 uppercase">{getStartDateDisplay()}</div>
                </div>
                <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800 flex items-center justify-between px-4 group cursor-pointer hover:border-indigo-500/50" onClick={onEditTargetDate}>
                    <div className="text-left"><div className="text-xs font-bold text-slate-300">Target</div><div className="text-[10px] text-slate-500 uppercase">{getActiveCareerDate()}</div></div>
                    <Pencil className="h-3 w-3 text-slate-600 group-hover:text-indigo-400" />
                </div>
            </div>
        </div>

        <div className="space-y-4">
            {roadmap.map((phase, pIndex) => {
                const isExpanded = expandedPhase === pIndex || activeCategory !== 'all' || searchQuery !== '';
                const phaseItems = phase.items || [];
                const completedCount = phaseItems.filter(i => i.status === 'completed').length;
                const totalCount = phaseItems.length;
                const isPhaseDone = totalCount > 0 && completedCount === totalCount;
                const visibleItems = phaseItems.filter(filterItem);
                
                if (visibleItems.length === 0 && (activeCategory !== 'all' || searchQuery !== '')) return null;

                return (
                    <div key={pIndex} className={`bg-slate-900 border transition-all rounded-2xl overflow-hidden ${isExpanded ? 'border-indigo-500/50 shadow-xl' : 'border-slate-800'}`}>
                        <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => togglePhase(pIndex)}>
                             <div className="flex items-center gap-4">
                                <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 text-xs font-bold ${isPhaseDone ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                                    {isPhaseDone ? <CheckCircle2 className="h-4 w-4" /> : pIndex + 1}
                                </div>
                                <div>
                                    <h3 className={`font-bold text-sm md:text-base ${isPhaseDone ? 'text-emerald-400' : 'text-slate-200'}`}>{phase.phaseName}</h3>
                                    <div className="text-[10px] text-slate-500 uppercase font-bold">{completedCount}/{totalCount} Completed</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {completedCount > 0 && <button onClick={(e) => handleResetPhaseRequest(e, pIndex)} className="p-2 text-slate-500 hover:text-red-400"><RotateCcw className="h-3 w-3" /></button>}
                                {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-600" /> : <ChevronDown className="h-4 w-4 text-slate-600" />}
                            </div>
                        </div>

                        {isExpanded && (
                            <div className="border-t border-slate-800 bg-slate-950/20 p-3 space-y-2">
                                {visibleItems.map((item) => {
                                    const showDetails = expandedLearnMoreItems.has(item.id);
                                    const locked = isLocked(item);
                                    const done = item.status === 'completed';

                                    return (
                                        <div key={item.id} className={`rounded-xl border transition-all overflow-hidden ${done ? 'bg-slate-900 border-slate-800/50 opacity-60' : locked ? 'bg-slate-950 border-slate-800 opacity-40 grayscale' : 'bg-slate-800/30 border-slate-700/50 hover:border-indigo-500/30'}`}>
                                            <div className="flex items-center gap-4 p-3">
                                                <button onClick={() => !locked && handleTaskClick(item)} disabled={locked || done} className={`shrink-0 ${locked ? 'cursor-not-allowed opacity-50' : 'hover:scale-110 transition-transform'}`}>
                                                    {done ? <CheckCircle2 className="h-6 w-6 text-emerald-500" /> : locked ? <Lock className="h-5 w-5 text-slate-700" /> : <Circle className="h-6 w-6 text-slate-600 hover:text-indigo-400" />}
                                                </button>
                                                <div className={`flex-1 min-w-0 ${locked ? '' : 'cursor-pointer'}`} onClick={() => !locked && handleTaskClick(item)}>
                                                    <div className="flex items-center gap-2 mb-0.5">
                                                        {getTypeIcon(item.type)}
                                                        <span className={`font-bold text-sm truncate ${done ? 'line-through text-slate-500' : 'text-slate-300'}`}>{item.title}</span>
                                                        <span className="text-[9px] font-mono text-slate-500 bg-slate-900 px-1 py-0.5 rounded border border-slate-800 uppercase tracking-wider">{item.duration}</span>
                                                    </div>
                                                    <p className="text-[10px] text-slate-500 line-clamp-1">{item.description}</p>
                                                </div>
                                                <button onClick={(e) => toggleLearnMore(e, item)} className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors ${showDetails ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-400' : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-white'}`}>Details</button>
                                            </div>
                                            {showDetails && (
                                                <div className="border-t border-slate-800 bg-slate-950/40 p-4 space-y-4 animate-fade-in text-xs">
                                                    {item.explanation && <div className="text-slate-300 border-l-2 border-indigo-500/50 pl-3"><h4 className="font-bold text-indigo-400 uppercase tracking-widest text-[9px] mb-1">Architect's Note</h4>{item.explanation}</div>}
                                                    
                                                    {/* Defensive check for suggestedResources mapping */}
                                                    {Array.isArray(item.suggestedResources) && item.suggestedResources.length > 0 && (
                                                        <div>
                                                            <h4 className="font-bold text-slate-500 uppercase tracking-widest text-[9px] mb-2 flex items-center gap-1"><Youtube className="h-3 w-3 text-red-500" /> Recommended Tutorials</h4>
                                                            <div className="grid gap-2 sm:grid-cols-2">
                                                                {item.suggestedResources.map((res, idx) => (
                                                                    <a key={idx} href={res.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-2 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 transition-colors truncate">
                                                                        <PlayCircle className="h-3 w-3 text-red-500" /><span className="truncate">{res.title}</span>
                                                                    </a>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {item.link && <a href={item.link} target="_blank" rel="noreferrer" className="flex items-center justify-between p-3 rounded-lg bg-indigo-500/5 border border-indigo-500/20 text-indigo-400 font-bold hover:bg-indigo-500/10 transition-all"><span>Go to Resource</span><ExternalLink className="h-3 w-3" /></a>}
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