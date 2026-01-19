
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { UserProfile, CareerOption, RoadmapPhase, NewsItem, RoadmapItem, DailyQuizItem, InterviewQuestion, PracticeQuestion, SimulationScenario, ChatMessage, RoadmapData } from '../types';
import { Roadmap } from './Roadmap';
import { generateRoadmap, generateDailyQuiz, generatePracticeTopics, generatePracticeQuestions, generateCompanyInterviewQuestions, generateSimulationScenario, generateChatResponse, generateKnowledgeBatch } from '../services/gemini';
import { saveRoadmap, saveUser, getRoadmap, getCareerData, saveCareerData, setCurrentUser, getNewsCache, saveNewsCache, getDailyQuizCache, saveDailyQuizCache, deleteUser, getPracticeData, savePracticeData, PracticeDataStore } from '../services/store';
import { Home, Map, Briefcase, User, LogOut, TrendingUp, PlusCircle, ChevronDown, ChevronUp, Clock, Trophy, AlertCircle, Target, Trash2, RotateCcw, PartyPopper, ArrowRight, Zap, Calendar, ExternalLink, X, RefreshCw, MessageSquare, CheckCircle2, Pencil, BrainCircuit, GraduationCap, Flame, Star, Search, Link, Building2, PlayCircle, Eye, EyeOff, ShieldAlert, Palette, Settings, Mail, Lock, CalendarDays, AlertTriangle, Moon, Sun, Send, Cpu, Sparkles, Compass, LayoutDashboard, BookOpen, Info } from 'lucide-react';

// Added missing CelebrationModal component
const CelebrationModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
    <div className="bg-slate-900 border border-indigo-500/50 rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent"></div>
      <div className="relative z-10">
        <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <PartyPopper className="h-10 w-10 text-emerald-400" />
        </div>
        <h2 className="text-2xl font-black text-white mb-2">100% Mastery!</h2>
        <p className="text-slate-400 mb-8">You have successfully navigated the entire path for this career. Your future is architected.</p>
        <button onClick={onClose} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all">Continue Journey</button>
      </div>
    </div>
  </div>
);

// Added missing DateEditModal component
const DateEditModal: React.FC<{ date: string; setDate: (d: string) => void; onConfirm: () => void; onCancel: () => void }> = ({ date, setDate, onConfirm, onCancel }) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-sm w-full shadow-2xl">
      <h3 className="text-xl font-bold text-white mb-4">Edit Target Date</h3>
      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 mb-6">
        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">New Deadline</label>
        <input type="date" className="w-full bg-transparent text-white font-bold text-lg focus:outline-none color-scheme-dark" value={date} onChange={e => setDate(e.target.value)} />
      </div>
      <div className="flex gap-3">
        <button onClick={onCancel} className="flex-1 py-3 bg-slate-800 text-slate-300 font-semibold rounded-xl text-sm">Cancel</button>
        <button onClick={onConfirm} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-sm">Update</button>
      </div>
    </div>
  </div>
);

// Added missing AdaptingOverlay component
const AdaptingOverlay = () => (
  <div className="fixed inset-0 z-[200] bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center animate-fade-in">
    <div className="relative mb-8">
      <div className="absolute inset-0 bg-indigo-500 blur-2xl opacity-20 animate-pulse"></div>
      <Compass className="h-16 w-16 text-indigo-400 animate-spin relative z-10" />
    </div>
    <h2 className="text-2xl font-black text-white mb-2">Nova is Adapting...</h2>
    <p className="text-slate-400 text-center max-w-xs">Recalibrating your roadmap items based on recent velocity shifts.</p>
  </div>
);

const PracticeQuestionCard: React.FC<{ question: PracticeQuestion, index: number }> = ({ question, index }) => {
    const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
    const handleSelect = (idx: number) => { if (selectedIdx !== null) return; setSelectedIdx(idx); };
    const correctIdx = Number(question.correctIndex);
    const isAnswered = selectedIdx !== null;
    const isUserCorrect = selectedIdx === correctIdx;
    return (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 transition-all hover:border-slate-700 w-full">
            <h4 className="text-lg font-bold text-white mb-6 flex items-start gap-3"><span className="bg-indigo-500/10 text-indigo-400 text-xs px-2 py-1 rounded pt-0.5 shrink-0 border border-indigo-500/20">Q{index + 1}</span>{question.question}</h4>
            <div className="grid gap-3">
                {question.options?.map((opt, idx) => {
                    let btnClass = "w-full text-left p-4 rounded-xl border transition-all flex justify-between items-center ";
                    let icon = null;
                    if (isAnswered) {
                        if (idx === correctIdx) { btnClass += "!bg-emerald-500/20 !border-emerald-500 text-white ring-1 ring-emerald-500/50"; icon = <CheckCircle2 className="h-5 w-5 text-emerald-400" />; } 
                        else if (idx === selectedIdx) { btnClass += "!bg-red-500/20 !border-red-500 text-white ring-1 ring-red-500/50"; icon = <AlertCircle className="h-5 w-5 text-red-400" />; } 
                        else { btnClass += "bg-slate-900 border-slate-800 text-slate-500 opacity-50"; }
                    } else { btnClass += "bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-indigo-500 hover:text-white"; }
                    return <button key={idx} onClick={() => handleSelect(idx)} disabled={isAnswered} className={btnClass}><span className="flex items-center gap-3"><span className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold ${isAnswered && idx === correctIdx ? '!bg-emerald-500 !border-emerald-500 text-slate-950' : isAnswered && idx === selectedIdx ? '!bg-red-500 !border-red-500 text-white' : 'border-slate-600 text-slate-400'}`}>{['A','B','C','D'][idx]}</span>{opt}</span>{icon}</button>;
                })}
            </div>
            {isAnswered && (<div className={`mt-6 p-4 rounded-xl border animate-fade-in ${isUserCorrect ? 'bg-emerald-900/10 border-emerald-500/30' : 'bg-red-900/10 border-red-500/30'}`}><div className="flex items-center gap-2 mb-2">{isUserCorrect ? <span className="text-emerald-400 font-bold text-sm flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Correct!</span> : <span className="text-red-400 font-bold text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Incorrect</span>}</div>{!isUserCorrect && <div className="mb-2 text-sm"><span className="font-semibold text-slate-400 text-xs uppercase tracking-wider block">Correct Answer</span><p className="text-emerald-300 font-medium">{question.options?.[correctIdx]}</p></div>}<p className="text-slate-300 text-sm leading-relaxed pt-2 border-t border-slate-700/50 mt-2"><span className="font-semibold text-slate-400 text-xs uppercase tracking-wider block mb-1">Explanation</span>{question.explanation}</p></div>)}
        </div>
    );
};

const CountdownTimer = () => {
    const [timeLeft, setTimeLeft] = useState('');
    useEffect(() => {
        const timer = setInterval(() => { const now = new Date(); const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1); tomorrow.setHours(0, 0, 0, 0); const diff = tomorrow.getTime() - now.getTime(); const h = Math.floor((diff / (1000 * 60 * 60)) % 24); const m = Math.floor((diff / (1000 * 60)) % 60); const s = Math.floor((diff / 1000) % 60); setTimeLeft(`${h.toString().padStart(2, '0')} : ${m.toString().padStart(2, '0')} : ${s.toString().padStart(2, '0')}`); }, 1000);
        return () => clearInterval(timer);
    }, []);
    return <span className="text-white font-mono font-bold tracking-widest">{timeLeft}</span>;
};

const FormattedText: React.FC<{ text: string }> = ({ text }) => {
  const lines = text.split('\n');
  return (
    <div className="space-y-2">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={i} className="h-2" />;
        if (trimmed.startsWith('### ')) return <h4 key={i} className="text-indigo-400 font-black text-sm uppercase tracking-widest mt-4 mb-2">{trimmed.substring(4)}</h4>;
        const isBullet = trimmed.startsWith('* ') || trimmed.startsWith('- ');
        const cleanLine = isBullet ? trimmed.substring(2) : trimmed;
        const parts = cleanLine.split(/(\*\*.*?\*\*)/g);
        const content = parts.map((part, j) => {
          if (part.startsWith('**') && part.endsWith('**')) return <strong key={j} className="font-black text-white">{part.slice(2, -2)}</strong>;
          return part;
        });
        if (isBullet) return <div key={i} className="flex gap-2 pl-1"><span className="text-indigo-500 font-black">•</span><span className="text-slate-300 text-sm leading-relaxed">{content}</span></div>;
        return <p key={i} className="text-slate-300 text-sm leading-relaxed">{content}</p>;
      })}
    </div>
  );
};

const ChatWindow: React.FC<{ isOpen: boolean; onClose: () => void; careerTitle: string; history: ChatMessage[]; onSend: (msg: string) => void; isTyping: boolean }> = ({ isOpen, onClose, careerTitle, history, onSend, isTyping }) => {
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    useEffect(() => { if (isOpen && messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: 'smooth' }); }, [history, isOpen]);
    if (!isOpen) return null;
    return (
        <div className="fixed bottom-24 md:bottom-10 right-4 md:right-10 w-80 md:w-96 h-[500px] bg-slate-900 border border-indigo-500/30 rounded-3xl shadow-2xl flex flex-col overflow-hidden z-[70] animate-fade-in">
            <div className="bg-slate-950 p-4 border-b border-slate-800 flex justify-between items-center"><div className="flex items-center gap-2"><div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400"><MessageSquare className="h-5 w-5" /></div><div><h3 className="font-bold text-white text-sm">Nova Support</h3><p className="text-xs text-slate-500">Online</p></div></div><button onClick={onClose} className="p-1 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-white"><X className="h-5 w-5" /></button></div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-900/50">
              {history.map(msg => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-3.5 rounded-2xl ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none text-sm' : 'bg-slate-800 text-slate-200 rounded-tl-none shadow-lg shadow-black/20'}`}><FormattedText text={msg.text} /></div>
                </div>
              ))}
              {isTyping && (<div className="flex justify-start"><div className="bg-slate-800 p-3 rounded-2xl rounded-tl-none text-slate-400 text-xs flex items-center gap-1 shadow-md"><span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></span><span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce delay-100"></span><span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce delay-200"></span></div></div>)}
              <div ref={messagesEndRef} />
            </div>
            <div className="p-4 bg-slate-950 border-t border-slate-800"><div className="flex gap-2"><input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !isTyping && input.trim() && (onSend(input), setInput(''))} placeholder="Ask about your current task..." className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:border-indigo-500 outline-none" /><button onClick={() => { if(input.trim()) { onSend(input); setInput(''); }}} disabled={!input.trim() || isTyping} className="p-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white disabled:opacity-50 transition-colors"><Send className="h-5 w-5" /></button></div></div>
        </div>
    );
};

export const Dashboard: React.FC<DashboardProps> = ({ 
  user, career, roadmap, onLogout, setRoadmap, setUser, setCareer, onAddCareer, onDeleteAccount 
}) => {
  const [activeTab, setActiveTab] = useState<'home' | 'roadmap' | 'career' | 'profile' | 'practice'>('home');
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isNewsLoading, setIsNewsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showCareerMenu, setShowCareerMenu] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [isRoadmapLoading, setIsRoadmapLoading] = useState(false);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'info'} | null>(null);
  
  const [dailyQuiz, setDailyQuiz] = useState<DailyQuizItem | null>(null);
  const [quizState, setQuizState] = useState<'loading' | 'active' | 'completed' | 'already_done'>('loading');
  const [selectedQuizOption, setSelectedQuizOption] = useState<number | null>(null);
  const [isQuizCorrect, setIsQuizCorrect] = useState<boolean | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const [practiceTab, setPracticeTab] = useState<'quiz' | 'interview' | 'simulation'>('quiz');
  const [practiceSearch, setPracticeSearch] = useState('');
  const [practiceTopics, setPracticeTopics] = useState<string[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [practiceQuestionBank, setPracticeQuestionBank] = useState<PracticeQuestion[]>([]);
  const [interviewQuestionBank, setInterviewQuestionBank] = useState<Record<string, InterviewQuestion[]>>({});
  const [visibleAnswers, setVisibleAnswers] = useState<Set<string>>(new Set());
  const [companyFilter, setCompanyFilter] = useState<string>('All');
  const [customGenTopic, setCustomGenTopic] = useState('');
  const [customGenDifficulty, setCustomGenDifficulty] = useState('Medium');
  const [simulationScenario, setSimulationScenario] = useState<SimulationScenario | null>(null);
  const [simAnswer, setSimAnswer] = useState<number | null>(null);
  const [isPracticeLoading, setIsPracticeLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isAdapting, setIsAdapting] = useState(false);
  const [phaseAdaptationState, setPhaseAdaptationState] = useState<{status: 'ahead'|'behind', diff: number, phaseIndex: number} | null>(null);
  const [phaseFeedback, setPhaseFeedback] = useState<{ phaseName: string, feedback: string, isAhead: boolean } | null>(null);

  const [showDateEditModal, setShowDateEditModal] = useState(false);
  const [pendingTargetDate, setPendingTargetDate] = useState('');
  const [showDateStrategyModal, setShowDateStrategyModal] = useState(false);
  const [dateStrategyType, setDateStrategyType] = useState<'extension' | 'shortening' | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [confirmAction, setConfirmAction] = useState<{type: 'reset_all' | 'delete_account', inputValue: string} | null>(null);
  const [careerToDelete, setCareerToDelete] = useState<string | null>(null);
  const [careerStats, setCareerStats] = useState<Record<string, { progress: number, daysLeft: number }>>({});
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isChatTyping, setIsChatTyping] = useState(false);
  const [homeSearchQuery, setHomeSearchQuery] = useState('');

  const currentCareerDetails = user.activeCareers.find(c => c.careerId === career.id);
  const prevCareerIdRef = useRef(career.id);

  const showToastMsg = (msg: string) => { setToast({ message: msg, type: 'success' }); setTimeout(() => setToast(null), 3000); };
  
  // Added missing handleSubscribe function
  const handleSubscribe = (plan: 'monthly' | 'yearly') => {
    const updatedUser = { ...user, subscriptionStatus: plan };
    setUser(updatedUser);
    saveUser(updatedUser);
    showToastMsg(`Subscribed to ${plan} plan!`);
  };

  // Added missing handleResetRoadmap function
  const handleResetRoadmap = () => {
    if (!roadmap) return;
    const newPhases = roadmap.phases.map(phase => ({
      ...phase,
      items: phase.items.map(item => ({ ...item, status: 'pending', completedAt: undefined } as RoadmapItem))
    }));
    const newRoadmap = { ...roadmap, phases: newPhases };
    setRoadmap(newRoadmap);
    saveRoadmap(user.id, career.id, newRoadmap);
    showToastMsg("Roadmap reset successfully.");
  };

  // Added missing handleResetPhase function
  const handleResetPhase = (phaseIndex: number) => {
    if (!roadmap) return;
    const newPhases = [...roadmap.phases];
    newPhases[phaseIndex] = {
      ...newPhases[phaseIndex],
      items: newPhases[phaseIndex].items.map(item => ({ ...item, status: 'pending', completedAt: undefined } as RoadmapItem))
    };
    const newRoadmap = { ...roadmap, phases: newPhases };
    setRoadmap(newRoadmap);
    saveRoadmap(user.id, career.id, newRoadmap);
    showToastMsg(`Phase ${phaseIndex + 1} reset.`);
  };

  // Added missing toggleAnswerReveal function
  const toggleAnswerReveal = (id: string) => {
    setVisibleAnswers(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Added missing handleDateUpdateWithoutAI function
  const handleDateUpdateWithoutAI = (newDate: string) => {
    const updatedActiveCareers = user.activeCareers.map(c => 
      c.careerId === career.id ? { ...c, targetCompletionDate: newDate } : c
    );
    const updatedUser = { ...user, activeCareers: updatedActiveCareers };
    setUser(updatedUser);
    saveUser(updatedUser);
    showToastMsg("Target date updated.");
  };

  useEffect(() => { 
    const themes = ['theme-emerald', 'theme-rose', 'theme-amber', 'theme-cyan']; 
    document.body.classList.remove(...themes); 
    if (user.theme && user.theme !== 'indigo') document.body.classList.add(`theme-${user.theme}`); 
  }, [user.theme]);

  const setAccentColor = (color: 'indigo' | 'emerald' | 'rose' | 'amber' | 'cyan') => { 
    const updatedUser = { ...user, theme: color }; 
    setUser(updatedUser); 
    saveUser(updatedUser); 
  };
  
  useEffect(() => { 
      const initialGreeting = { id: Date.now().toString(), role: 'bot' as const, text: `Hello ${user.username}! Switched focus to ${career.title}.`, timestamp: Date.now() }; 
      setChatHistory(prev => (prev.length === 0 ? [initialGreeting] : [...prev, initialGreeting])); 
  }, [career.id, user.username, career.title]);

  const handleSendMessage = async (text: string) => { 
      const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text, timestamp: Date.now() }; 
      setChatHistory(prev => [...prev, userMsg]); 
      setIsChatTyping(true); 
      const nextTask = roadmap?.phases.flatMap(p => p.items).find(item => item.status === 'pending');
      const taskContext = nextTask ? `User's task: "${nextTask.title}". Description: ${nextTask.description}.` : "All tasks complete.";
      try { 
          const responseText = await generateChatResponse(text, career.title, chatHistory, taskContext); 
          setChatHistory(prev => [...prev, { id: Date.now().toString(), role: 'bot', text: responseText, timestamp: Date.now() }]); 
      } catch (e) { 
          setChatHistory(prev => [...prev, { id: Date.now().toString(), role: 'bot', text: "Trouble connecting. Try again.", timestamp: Date.now() }]); 
      } finally { setIsChatTyping(false); } 
  };

  useEffect(() => { 
      if (roadmap && roadmap.phases) { 
          let total = 0; let completed = 0; roadmap.phases.forEach(phase => { phase.items.forEach(item => { total++; if (item.status === 'completed') completed++; }); }); 
          const calculatedProgress = total === 0 ? 0 : Math.round((completed / total) * 100); 
          if (calculatedProgress === 100 && progress !== 100 && progress !== 0) setShowCelebration(true); 
          setProgress(calculatedProgress); 
      } else setProgress(0); 
  }, [roadmap, progress]);

  useEffect(() => { 
      if (activeTab === 'career') { 
          const stats: Record<string, { progress: number, daysLeft: number }> = {}; 
          user.activeCareers.forEach(c => { 
              const r = getRoadmap(user.id, c.careerId); 
              const phases = r?.phases || [];
              const daysLeft = phases.reduce((acc, p) => acc + (p.items?.filter(i => i.status !== 'completed').length || 0), 0);
              let total = 0; let completed = 0; phases.forEach(p => { p.items.forEach(i => { total++; if (i.status === 'completed') completed++; }); }); 
              stats[c.careerId] = { progress: total === 0 ? 0 : Math.round((completed / total) * 100), daysLeft }; 
          }); 
          setCareerStats(stats); 
      } 
  }, [activeTab, user]);

  const loadNews = async (query?: string) => { 
      if (!career?.title) return; 
      if (!query) { const cachedNews = getNewsCache(user.id, career.id); if (cachedNews && cachedNews.length > 0) { setNews(cachedNews); return; } } 
      setIsNewsLoading(true); setNews([]); 
      try { 
          // If we are here, we need news. Trigger knowledge batch to fill all gaps.
          const batch = await generateKnowledgeBatch(career.title);
          setNews(batch.news);
          saveNewsCache(user.id, career.id, batch.news);
          saveDailyQuizCache(user.id, career.id, batch.dailyQuiz);
          savePracticeData(user.id, career.id, { topics: batch.topics, questions: batch.practiceQuestions, interviews: batch.interviewQuestions });
      } catch (e) { console.error(e); } finally { setIsNewsLoading(false); } 
  };

  useEffect(() => { if (activeTab === 'home') loadNews(); }, [career.id, activeTab]);

  const filteredPracticeQuestions = useMemo(() => {
      let results = practiceQuestionBank;
      if (selectedTopic) results = results.filter(q => q.topic === selectedTopic);
      if (practiceSearch.trim()) {
          const q = practiceSearch.toLowerCase();
          results = results.filter(qObj => qObj.question.toLowerCase().includes(q) || (qObj.explanation && qObj.explanation.toLowerCase().includes(q)));
      }
      return results;
  }, [practiceQuestionBank, selectedTopic, practiceSearch]);

  const filteredInterviewQuestions = useMemo(() => {
      let bank: InterviewQuestion[] = [];
      if (companyFilter === 'All') {
          bank = Object.keys(interviewQuestionBank).reduce((acc: InterviewQuestion[], key: string) => {
              const currentList = interviewQuestionBank[key];
              return acc.concat(Array.isArray(currentList) ? currentList : []);
          }, [] as InterviewQuestion[]);
      } else bank = interviewQuestionBank[companyFilter] || [];
      if (!practiceSearch.trim()) return bank;
      const q = practiceSearch.toLowerCase();
      return bank.filter(iq => iq.question.toLowerCase().includes(q) || (iq.answer && iq.answer.toLowerCase().includes(q)));
  }, [interviewQuestionBank, companyFilter, practiceSearch]);

  useEffect(() => { 
      const initPracticeBank = async () => { 
          if (activeTab === 'practice') { 
              const savedData = getPracticeData(user.id, career.id); 
              if (savedData && (savedData.questions?.length > 0 || Object.keys(savedData.interviews || {}).length > 0)) { 
                  setPracticeTopics(savedData.topics || []); 
                  setPracticeQuestionBank(savedData.questions || []); 
                  setInterviewQuestionBank(savedData.interviews || {}); 
                  return;
              } 
              setIsPracticeLoading(true); 
              try { 
                  const batch = await generateKnowledgeBatch(career.title);
                  setPracticeTopics(batch.topics || []); 
                  setPracticeQuestionBank(batch.practiceQuestions || []); 
                  setInterviewQuestionBank(batch.interviewQuestions || {}); 
                  savePracticeData(user.id, career.id, { topics: batch.topics, questions: batch.practiceQuestions, interviews: batch.interviewQuestions }); 
                  saveDailyQuizCache(user.id, career.id, batch.dailyQuiz);
              } catch(e) { console.error(e); } 
              setIsPracticeLoading(false); 
          } 
      }; 
      initPracticeBank(); 
  }, [career.id, activeTab]);

  useEffect(() => {
    const checkDailyQuiz = async () => {
        if (activeTab !== 'home') return;
        if (prevCareerIdRef.current !== career.id) {
            setDailyQuiz(null); setSelectedQuizOption(null); setIsQuizCorrect(null); setShowConfetti(false); setQuizState('loading');
            prevCareerIdRef.current = career.id;
        }
        const today = new Date().toISOString().split('T')[0];
        if (currentCareerDetails?.lastQuizDate === today) {
            if (!showConfetti && quizState !== 'completed') setQuizState('already_done');
            return;
        }
        const cachedQuiz = getDailyQuizCache(user.id, career.id);
        if (cachedQuiz) { setDailyQuiz(cachedQuiz); setQuizState('active'); return; }
        setQuizState('loading');
        try {
            const batch = await generateKnowledgeBatch(career.title);
            if (batch.dailyQuiz) {
                setDailyQuiz(batch.dailyQuiz);
                saveDailyQuizCache(user.id, career.id, batch.dailyQuiz); 
                setQuizState('active');
            } else setQuizState('already_done');
        } catch (e) { setQuizState('already_done'); }
    };
    checkDailyQuiz();
  }, [activeTab, career.id]);

  const handleQuizAnswer = (index: number) => { 
      if (!dailyQuiz || selectedQuizOption !== null) return; 
      setSelectedQuizOption(index); 
      const isRight = index === Number(dailyQuiz.correctIndex); 
      setIsQuizCorrect(isRight); 
      const today = new Date().toISOString().split('T')[0]; 
      const updatedActiveCareers = user.activeCareers.map(c => c.careerId === career.id ? { ...c, lastQuizDate: today } : c); 
      if (isRight) { 
          setShowConfetti(true); 
          let newStreak = (user.streak || 0) + 1; 
          const updatedUser = { ...user, activeCareers: updatedActiveCareers, streak: newStreak, xp: (user.xp || 0) + 10 }; 
          setUser(updatedUser); saveUser(updatedUser); 
          setTimeout(() => setShowConfetti(false), 3000); 
      } else { 
          const updatedUser = { ...user, activeCareers: updatedActiveCareers, streak: 0 }; 
          setUser(updatedUser); saveUser(updatedUser); 
      } 
      setTimeout(() => setQuizState('completed'), 5000); 
  };

  const handleSimulationSearch = async () => { 
      setIsPracticeLoading(true); 
      const sim = await generateSimulationScenario(career.title); 
      setSimulationScenario(sim); setSimAnswer(null); 
      setIsPracticeLoading(false); 
  };
  
  const handleProgress = async (itemId: string) => { 
      if (!roadmap || !roadmap.phases) return; 
      const newPhases = roadmap.phases.map(phase => ({ 
          ...phase, 
          items: phase.items.map(item => item.id === itemId ? { ...item, status: item.status === 'completed' ? 'pending' : 'completed', completedAt: item.status === 'completed' ? undefined : Date.now() } as RoadmapItem : item) 
      })); 
      const newRoadmap = { ...roadmap, phases: newPhases };
      setRoadmap(newRoadmap); 
      saveRoadmap(user.id, career.id, newRoadmap); 
  };

  const handleSwitchCareer = (careerId: string) => { 
      setIsRoadmapLoading(true); setShowCareerMenu(false); setRoadmap(null); setNews([]); setPracticeQuestionBank([]); setInterviewQuestionBank({});
      setTimeout(() => { 
          const savedCareer = getCareerData(user.id, careerId); const savedRoadmap = getRoadmap(user.id, careerId); 
          if (savedCareer) { 
              setCareer(savedCareer); setRoadmap(savedRoadmap || null); 
              const updatedUser = { ...user, currentCareerId: careerId }; setUser(updatedUser); saveUser(updatedUser); 
          } 
          setIsRoadmapLoading(false); setActiveTab('home'); 
      }, 50); 
  };

  const workDaysLeft = roadmap?.phases ? roadmap.phases.reduce((acc, p) => acc + p.items.filter(i => i.status !== 'completed').length, 0) : 0;
  const calendarDaysRemaining = (() => {
      if (!currentCareerDetails?.targetCompletionDate) return 0;
      const parts = currentCareerDetails.targetCompletionDate.split('-');
      const targetDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 12, 0, 0);
      const today = new Date(); today.setHours(12, 0, 0, 0);
      return Math.max(0, Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  })();

  const pacing = (() => {
      const diff = calendarDaysRemaining - workDaysLeft;
      if (diff > 0) return { status: 'ahead', days: diff, message: `${diff} days ahead` } as const;
      if (diff < 0) return { status: 'behind', days: Math.abs(diff), message: `${Math.abs(diff)} days behind` } as const;
      return { status: 'on-track', days: 0, message: 'On track' } as const;
  })();

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <div className="space-y-8 animate-fade-in pb-10">
            <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
              <div><h1 className="text-3xl font-bold text-white">Dashboard</h1><p className="text-slate-400 mt-1">Welcome back, <span className="text-white font-medium">{user.username}</span>.</p></div>
              <div className="relative z-30">
                 <button onClick={() => setShowCareerMenu(!showCareerMenu)} className="flex items-center gap-2 bg-slate-800 text-slate-300 px-4 py-2 rounded-xl hover:bg-slate-700 transition-colors text-sm font-medium w-full md:w-auto justify-between min-w-[200px]">
                   <div className="flex items-center gap-2 truncate"><div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shrink-0"></div><span className="truncate">{career.title}</span></div><ChevronDown className="h-4 w-4 shrink-0" />
                 </button>
                 {showCareerMenu && (
                   <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50">
                     <div className="p-2 space-y-1">
                       <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Switch Focus</div>
                       {user.activeCareers.map(c => (
                         <button key={c.careerId} onClick={() => handleSwitchCareer(c.careerId)} className={`w-full text-left px-3 py-3 rounded-lg text-sm flex items-center justify-between ${c.careerId === career.id ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}>
                            <span className="truncate">{c.title}</span>{c.careerId === career.id && <Target className="h-3 w-3 shrink-0" />}
                         </button>
                       ))}
                       <div className="h-px bg-slate-800 my-2" /><button onClick={() => onAddCareer()} className="w-full text-left px-3 py-2 rounded-lg text-sm text-indigo-400 hover:bg-slate-800 flex items-center gap-2 font-medium"><PlusCircle className="h-4 w-4" /> Add New Path</button>
                     </div>
                   </div>
                 )}
              </div>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <div className="md:col-span-2 bg-gradient-to-br from-indigo-900/40 to-slate-900 p-6 rounded-3xl border border-indigo-500/30 min-h-[300px] flex flex-col justify-center">
                     <div className="flex items-center justify-between mb-6">
                         <div className="flex items-center gap-2 text-indigo-400"><BrainCircuit className="h-5 w-5" /><span className="font-bold uppercase text-xs tracking-wider">Daily Challenge</span></div>
                         <div className="flex items-center gap-3">
                             <div className="flex items-center gap-1.5 bg-slate-900/50 px-3 py-1.5 rounded-lg border border-slate-700"><Flame className={`h-4 w-4 ${user.streak > 0 ? 'text-orange-500 fill-orange-500' : 'text-slate-500'}`} /><span className="text-white font-bold text-sm">{user.streak || 0}</span></div>
                             <div className="flex items-center gap-1.5 bg-slate-900/50 px-3 py-1.5 rounded-lg border border-slate-700"><Star className="h-4 w-4 text-yellow-400 fill-yellow-400" /><span className="text-white font-bold text-sm">{user.xp || 0} XP</span></div>
                         </div>
                     </div>
                     {quizState === 'loading' && <div className="text-center py-8"><RefreshCw className="h-8 w-8 text-indigo-500 animate-spin mx-auto mb-4" /><p className="text-slate-400">Synchronizing insights...</p></div>}
                     {quizState === 'already_done' && <div className="text-center py-8"><div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle2 className="h-8 w-8 text-emerald-400" /></div><h3 className="text-xl font-bold text-white mb-2">You're all set!</h3><p className="text-slate-400 mb-6">Come back tomorrow.</p></div>}
                     {quizState === 'completed' && dailyQuiz && (
                         <div className="text-center py-6 animate-fade-in">
                             {isQuizCorrect ? <h3 className="text-2xl font-bold text-white mb-2">Correct! +10 XP</h3> : <h3 className="text-2xl font-bold text-red-400 mb-2">Not quite.</h3>}
                             <p className="text-slate-300 mb-6">{dailyQuiz.explanation}</p>
                         </div>
                     )}
                     {quizState === 'active' && dailyQuiz && (
                         <div className="animate-fade-in">
                             <h3 className="text-lg md:text-xl font-bold text-white mb-6 leading-relaxed">{dailyQuiz.question}</h3>
                             <div className="grid grid-cols-1 gap-3">
                                 {dailyQuiz.options?.map((opt, i) => (
                                     <button key={i} onClick={() => handleQuizAnswer(i)} disabled={selectedQuizOption !== null} className={`w-full text-left p-4 rounded-xl border transition-all flex justify-between items-center ${selectedQuizOption === null ? 'bg-slate-900/50 border-slate-700 text-slate-200 hover:border-indigo-500' : i === dailyQuiz.correctIndex ? 'bg-emerald-500/20 border-emerald-500 text-white' : i === selectedQuizOption ? 'bg-red-500/20 border-red-500 text-white' : 'bg-slate-900 border-slate-800 opacity-50'}`}>
                                         <div className="flex items-center gap-3"><div className="w-6 h-6 rounded-full border border-slate-600 flex items-center justify-center text-xs font-bold">{['A','B','C','D'][i]}</div>{opt}</div>
                                     </button>
                                 ))}
                             </div>
                         </div>
                     )}
                 </div>
                 <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 flex flex-col justify-between">
                     <div className="mb-6"><h3 className="text-slate-400 font-medium mb-4 flex items-center gap-2"><Target className="h-4 w-4 text-indigo-400" /> Progress</h3><div className="flex items-end gap-2 mb-2"><span className="text-5xl font-bold text-white">{progress}%</span></div><div className="h-2 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-indigo-500" style={{width: `${progress}%`}}></div></div></div>
                     <div className="space-y-4">
                         <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between"><div><div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Pace</div><div className="text-sm font-bold text-white">{pacing.message}</div></div><TrendingUp className="h-5 w-5 text-indigo-400" /></div>
                     </div>
                 </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                 <div className="flex items-center gap-3 mb-6"><div className="p-2 bg-indigo-500/10 rounded-lg"><Zap className="h-5 w-5 text-indigo-400" /></div><h2 className="text-xl font-bold text-white">Global Briefing</h2></div>
                 <div className="space-y-1">
                     {isNewsLoading ? <div className="h-16 bg-slate-800 rounded-xl animate-pulse"></div> : news.map((item, i) => <a key={i} href={item.url} target="_blank" rel="noreferrer" className="group flex items-center justify-between p-4 rounded-xl hover:bg-slate-800 transition-all border border-transparent hover:border-slate-700"><div className="flex items-center gap-4"><span className="text-xs font-black text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded-md border border-indigo-500/20 w-24 truncate text-center shrink-0">{item.source}</span><h3 className="text-sm font-medium text-slate-300 group-hover:text-white truncate max-w-md">{item.title}</h3></div><ExternalLink className="h-4 w-4 text-slate-600 group-hover:text-indigo-400 shrink-0" /></a>)}
                 </div>
            </div>
          </div>
        );
      case 'roadmap':
        return <Roadmap roadmap={roadmap} user={user} onSubscribe={handleSubscribe} onUpdateProgress={handleProgress} onReset={handleResetRoadmap} onResetPhase={handleResetPhase} onSwitchCareer={handleSwitchCareer} onEditTargetDate={() => { setPendingTargetDate(currentCareerDetails?.targetCompletionDate || ''); setShowDateEditModal(true); }} pacing={pacing} isLoading={isRoadmapLoading} daysRemaining={workDaysLeft} />;
      case 'practice':
          return (
              <div className="bg-slate-900 rounded-3xl border border-slate-800 min-h-[80vh] flex flex-col overflow-hidden">
                  <div className="p-8 border-b border-slate-800 bg-slate-950/50">
                      <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-6">
                           <div><h2 className="text-2xl font-bold text-white">Practice Arena</h2></div>
                           <div className="grid grid-cols-3 gap-2 p-1 bg-slate-900 rounded-xl border border-slate-800">
                              {[{ id: 'quiz', icon: BrainCircuit, label: 'Questions' }, { id: 'interview', icon: MessageSquare, label: 'Interview' }, { id: 'simulation', icon: PlayCircle, label: 'Simulation' }].map(tab => (
                                  <button key={tab.id} onClick={() => setPracticeTab(tab.id as any)} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${practiceTab === tab.id ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-white'}`}>{tab.label}</button>
                              ))}
                           </div>
                      </div>
                  </div>
                  <div className="p-8 flex-1 bg-slate-900">
                      {isPracticeLoading ? <div className="text-center py-20"><RefreshCw className="h-10 w-10 text-indigo-500 animate-spin mx-auto mb-4" /></div> : (
                          <div className="animate-fade-in space-y-8">
                              {practiceTab === 'quiz' && filteredPracticeQuestions.map((q, i) => <PracticeQuestionCard key={i} question={q} index={i} />)}
                              {practiceTab === 'interview' && (
                                <div className="grid md:grid-cols-2 gap-4">
                                  {filteredInterviewQuestions.map((q, i) => (
                                      <div key={i} className="bg-slate-950 border border-slate-800 rounded-2xl p-6">
                                          <div className="px-2 py-1 rounded bg-indigo-500/10 text-indigo-400 text-[10px] font-bold uppercase mb-2 inline-block">{q.company}</div>
                                          <h4 className="font-bold text-white mb-4">{q.question}</h4>
                                          {visibleAnswers.has(q.id) ? <p className="text-slate-300 text-sm bg-slate-900 p-4 rounded-xl border border-slate-800">{q.answer}</p> : <button onClick={() => toggleAnswerReveal(q.id)} className="text-indigo-400 text-xs font-bold uppercase hover:underline">Reveal Protocol</button>}
                                      </div>
                                  ))}
                                </div>
                              )}
                              {practiceTab === 'simulation' && (
                                <div className="text-center py-20">
                                  {!simulationScenario ? <button onClick={handleSimulationSearch} className="px-8 py-4 bg-indigo-600 text-white font-bold rounded-xl">Initiate Simulation</button> : <div>{simulationScenario.question}</div>}
                                </div>
                              )}
                          </div>
                      )}
                  </div>
              </div>
          );
      case 'career':
          return (
              <div className="space-y-6 pb-20 animate-fade-in">
                  <div className="flex justify-between items-end"><div><h2 className="text-3xl font-bold text-white">Your Paths</h2></div><button onClick={() => onAddCareer()} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold">Add Career</button></div>
                  <div className="grid gap-6">
                      {user.activeCareers.map((c) => (
                          <div key={c.careerId} className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                              <h3 className="text-2xl font-bold text-white mb-4">{c.title}</h3>
                              <div className="flex gap-4">
                                  {c.careerId === user.currentCareerId ? <span className="text-indigo-400 font-bold">Current Focus</span> : <button onClick={() => handleSwitchCareer(c.careerId)} className="text-slate-400 hover:text-white">Switch Focus</button>}
                                  <button onClick={() => setCareerToDelete(c.careerId)} className="text-red-400 hover:text-red-300 ml-auto">Delete</button>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          );
      case 'profile':
          return (
              <div className="space-y-8 pb-20 animate-fade-in text-center">
                  <h2 className="text-3xl font-bold text-white">{user.username}</h2>
                  <div className="flex flex-wrap gap-3 justify-center">{(['indigo', 'emerald', 'rose', 'amber', 'cyan'] as const).map(color => (<button key={color} onClick={() => setAccentColor(color)} className={`w-10 h-10 rounded-full border-2 ${user.theme === color ? 'border-white' : 'border-transparent'}`} style={{backgroundColor: color === 'indigo' ? '#6366f1' : color === 'emerald' ? '#10b981' : color === 'rose' ? '#f43f5e' : color === 'amber' ? '#f59e0b' : '#06b6d4'}}></button>))}</div>
                  <button onClick={onLogout} className="text-slate-500 hover:text-white flex items-center gap-2 mx-auto">Log Out</button>
              </div>
          );
      default: return null;
    }
  };

  return (
    <div className="bg-slate-950 text-slate-50 min-h-screen">
      <div className="md:pl-20">
        <main className="p-4 md:p-8 max-w-7xl mx-auto w-full pb-24 md:pb-8">{renderContent()}</main>
      </div>
      <nav className="fixed bottom-0 left-0 w-full bg-slate-900/90 backdrop-blur-xl border-t border-slate-800 p-2 md:hidden z-40">
        <div className="flex justify-around items-center">
          <button onClick={() => setActiveTab('home')} className={`p-3 rounded-xl ${activeTab === 'home' ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-500'}`}><Home className="h-6 w-6" /></button>
          <button onClick={() => setActiveTab('roadmap')} className={`p-3 rounded-xl ${activeTab === 'roadmap' ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-500'}`}><Map className="h-6 w-6" /></button>
          <button onClick={() => setActiveTab('practice')} className={`p-3 rounded-xl ${activeTab === 'practice' ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-500'}`}><GraduationCap className="h-6 w-6" /></button>
          <button onClick={() => setActiveTab('career')} className={`p-3 rounded-xl ${activeTab === 'career' ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-500'}`}><Briefcase className="h-6 w-6" /></button>
          <button onClick={() => setActiveTab('profile')} className={`p-3 rounded-xl ${activeTab === 'profile' ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-500'}`}><User className="h-6 w-6" /></button>
        </div>
      </nav>
      <nav className="fixed left-0 top-0 h-full w-20 bg-slate-900 border-r border-slate-800 flex-col items-center py-8 hidden md:flex z-50">
        <div className="mb-8 p-2 bg-indigo-600 rounded-xl"><Compass className="h-6 w-6 text-white" /></div>
        <div className="flex flex-col gap-4 w-full px-3">
          <button onClick={() => setActiveTab('home')} className={`p-3 rounded-xl ${activeTab === 'home' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}><Home className="h-5 w-5 mx-auto" /></button>
          <button onClick={() => setActiveTab('roadmap')} className={`p-3 rounded-xl ${activeTab === 'roadmap' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}><Map className="h-5 w-5 mx-auto" /></button>
          <button onClick={() => setActiveTab('practice')} className={`p-3 rounded-xl ${activeTab === 'practice' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}><GraduationCap className="h-5 w-5 mx-auto" /></button>
          <button onClick={() => setActiveTab('career')} className={`p-3 rounded-xl ${activeTab === 'career' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}><Briefcase className="h-5 w-5 mx-auto" /></button>
          <button onClick={() => setActiveTab('profile')} className={`p-3 rounded-xl ${activeTab === 'profile' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}><User className="h-5 w-5 mx-auto" /></button>
        </div>
      </nav>
      <button onClick={() => setIsChatOpen(!isChatOpen)} className="fixed bottom-24 md:bottom-10 right-4 md:right-10 w-14 h-14 bg-indigo-600 rounded-full shadow-2xl flex items-center justify-center z-[60]">{isChatOpen ? <X className="h-6 w-6 text-white" /> : <MessageSquare className="h-6 w-6 text-white" />}</button>
      <ChatWindow isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} careerTitle={career.title} history={chatHistory} onSend={handleSendMessage} isTyping={isChatTyping} />
      {showCelebration && <CelebrationModal onClose={() => setShowCelebration(false)} />}
      {showDateEditModal && <DateEditModal date={pendingTargetDate} setDate={setPendingTargetDate} onConfirm={() => { handleDateUpdateWithoutAI(pendingTargetDate); setShowDateEditModal(false); }} onCancel={() => setShowDateEditModal(false)} />}
      {isAdapting && <AdaptingOverlay />}
      {toast && <div className="fixed bottom-24 md:bottom-10 left-1/2 -translate-x-1/2 bg-slate-900 border border-emerald-500/50 text-white px-6 py-3 rounded-full shadow-2xl z-[100] animate-fade-in"><span className="font-medium text-sm">{toast.message}</span></div>}
    </div>
  );
};
