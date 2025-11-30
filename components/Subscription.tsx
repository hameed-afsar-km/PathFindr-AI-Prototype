import React from 'react';
import { Check, Zap } from 'lucide-react';

interface SubscriptionProps {
  onSubscribe: (plan: 'monthly' | 'yearly') => void;
}

export const Subscription: React.FC<SubscriptionProps> = ({ onSubscribe }) => {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl overflow-y-auto pb-24 md:pb-4">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
        
        <div className="p-6 md:p-12 text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-indigo-500/30 transform rotate-3 hover:rotate-6 transition-transform">
            <Zap className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-2xl md:text-4xl font-bold text-white mb-4 tracking-tight">Unlock Your Roadmap</h2>
          <p className="text-slate-400 max-w-md mx-auto mb-8 text-base md:text-lg">
            Get the full AI-generated adaptive career path, internship opportunities, and daily progress tracking.
          </p>

          <div className="grid md:grid-cols-2 gap-4 md:gap-6">
            {/* Monthly */}
            <div 
                className="border border-slate-700 bg-slate-800/50 rounded-2xl p-5 hover:border-indigo-500 transition-all cursor-pointer group relative hover:shadow-lg hover:shadow-indigo-900/10" 
                onClick={() => onSubscribe('monthly')}
            >
              <h3 className="text-lg font-semibold text-slate-300">Monthly Access</h3>
              <div className="my-2 md:my-4 flex justify-center items-baseline gap-1">
                <span className="text-3xl md:text-4xl font-bold text-white">₹799</span>
                <span className="text-slate-500">/mo</span>
              </div>
              <ul className="text-left text-sm space-y-2 md:space-y-3 mb-4 md:mb-6 text-slate-400 px-2">
                <li className="flex items-center gap-3"><Check className="h-4 w-4 text-indigo-400 shrink-0" /> Full Adaptive Roadmap</li>
                <li className="flex items-center gap-3"><Check className="h-4 w-4 text-indigo-400 shrink-0" /> Phase-wise AI Analysis</li>
                <li className="flex items-center gap-3"><Check className="h-4 w-4 text-indigo-400 shrink-0" /> Internship & Job Links</li>
              </ul>
              <button className="w-full py-3 bg-slate-700 text-white font-semibold rounded-xl group-hover:bg-indigo-600 transition-colors text-sm">
                Select Monthly
              </button>
            </div>

            {/* Yearly */}
            <div 
                className="border border-indigo-500 bg-slate-800/80 rounded-2xl p-5 relative cursor-pointer transform md:scale-105 shadow-xl shadow-indigo-900/20 group" 
                onClick={() => onSubscribe('yearly')}
            >
               <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-[10px] md:text-xs font-bold px-3 py-1 rounded-full tracking-wider shadow-lg">
                 BEST VALUE
               </div>
              <h3 className="text-lg font-semibold text-indigo-300">Yearly Pro</h3>
              <div className="my-2 md:my-4 flex justify-center items-baseline gap-1">
                <span className="text-3xl md:text-4xl font-bold text-white">₹7,999</span>
                <span className="text-slate-500">/yr</span>
              </div>
              <ul className="text-left text-sm space-y-2 md:space-y-3 mb-4 md:mb-6 text-slate-300 px-2">
                <li className="flex items-center gap-3"><Check className="h-4 w-4 text-indigo-400 shrink-0" /> 2 Months Free Savings</li>
                <li className="flex items-center gap-3"><Check className="h-4 w-4 text-indigo-400 shrink-0" /> Priority Feature Access</li>
                <li className="flex items-center gap-3"><Check className="h-4 w-4 text-indigo-400 shrink-0" /> Advanced Interview Prep</li>
              </ul>
              <button className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl shadow-lg hover:bg-indigo-500 transition-colors group-hover:scale-[1.02] transform duration-200 text-sm">
                Select Yearly
              </button>
            </div>
          </div>
          
          <p className="mt-6 text-xs text-slate-500">
            Secure payment gateway. Cancel anytime.
          </p>
        </div>
      </div>
    </div>
  );
};