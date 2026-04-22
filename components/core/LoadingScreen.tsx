import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '../ui/button';

export const LoadingScreen: React.FC<{ onReset?: () => void; status?: string }> = ({ onReset, status }) => {
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowWarning(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="relative">
        <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center animate-pulse">
          <Loader2 className="h-10 w-10 text-primary animate-spin" />
        </div>
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full border-4 border-slate-50 dark:border-slate-950 animate-bounce" />
      </div>
      <h2 className="mt-8 text-2xl font-black tracking-tighter text-slate-900 dark:text-white uppercase italic">
        RoadMaster <span className="text-primary">OS</span>
      </h2>
      <p className="mt-2 text-sm font-bold text-slate-400 uppercase tracking-[0.3em] animate-pulse">
        {status || 'Initializing Neural Grid...'}
      </p>
      
      {showWarning && (
        <div className="mt-12 flex flex-col items-center gap-4">
          <p className="text-[10px] text-slate-400 font-mono">System is taking longer than expected to respond.</p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onReset}
            className="text-[10px] uppercase tracking-widest font-bold opacity-50 hover:opacity-100 transition-opacity"
          >
            Force System Reset
          </Button>
        </div>
      )}
    </div>
  );
};
