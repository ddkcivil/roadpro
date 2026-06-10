import React, { memo } from 'react';
import { type LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { cn } from '~/lib/utils';
import { Shimmer } from '~/components/ui/shimmer';
import { motion } from 'framer-motion';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
  trend?: string;
  isLoading?: boolean;
  onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = memo(({ title, value, icon: Icon, color, trend, isLoading = false, onClick }) => {
  const getColorClasses = (colorName: string) => {
    const map: Record<string, string> = {
      primary: "bg-blue-600 dark:bg-blue-500 text-white shadow-blue-500/25",
      success: "bg-emerald-600 dark:bg-emerald-500 text-white shadow-emerald-500/25",
      danger: "bg-rose-600 dark:bg-rose-500 text-white shadow-rose-500/25",
      warning: "bg-amber-600 dark:bg-amber-500 text-white shadow-amber-500/25",
      info: "bg-indigo-600 dark:bg-indigo-500 text-white shadow-indigo-500/25",
      violet: "bg-violet-600 dark:bg-violet-500 text-white shadow-violet-500/25",
      rose: "bg-rose-600 dark:bg-rose-500 text-white shadow-rose-500/25",
      slate: "bg-slate-700 dark:bg-slate-800 text-white shadow-slate-500/25",
    };
    return map[colorName] || "bg-slate-700 dark:bg-slate-800 text-white shadow-slate-500/25";
  };

  const gradientClass = getColorClasses(color);

  if (isLoading) {
    return (
      <Card className="h-full bg-card border-border/40 rounded-3xl overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="h-3 w-20 bg-muted animate-pulse rounded-full" />
          <div className="h-10 w-10 bg-muted animate-pulse rounded-2xl" />
        </CardHeader>
        <CardContent>
          <div className="h-10 w-24 bg-muted animate-pulse rounded-xl mb-4" />
          <div className="h-4 w-32 bg-muted animate-pulse rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="h-full"
      onClick={onClick}
    >
      <Card className={cn(
        "h-full bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border border-border/40 hover:border-primary/40 transition-all duration-500 hover:-translate-y-2 group relative overflow-hidden rounded-3xl shadow-lg hover:shadow-2xl",
        onClick && "cursor-pointer"
      )}>
        <div className={cn(
          "absolute -right-8 -bottom-8 opacity-[0.05] dark:opacity-[0.08] transition-all duration-700 group-hover:scale-125 group-hover:-rotate-12",
          color === 'success' ? 'text-emerald-500' : 'text-primary'
        )}>
          <Icon size={160} strokeWidth={1} />
        </div>
        
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10 pt-6 px-6">
          <CardTitle className="text-[11px] font-black text-muted-foreground/80 dark:text-foreground/50 uppercase tracking-[0.25em]">{title}</CardTitle>
          <div className={cn("p-3 rounded-2xl transition-all group-hover:rotate-12 duration-500 shadow-xl", gradientClass)}>
            <Icon className="h-5 w-5" />
          </div>
        </CardHeader>
        
        <CardContent className="relative z-10 pt-2 pb-8 px-6">
          <div className="text-4xl font-black tracking-tighter text-foreground dark:text-white drop-shadow-sm transition-colors duration-500">
            {value}
          </div>
          
          {trend && (
            <div className="flex items-center gap-2 mt-4">
              <div className={cn(
                "flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-xl shadow-sm border",
                trend.startsWith('+') 
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
              )}>
                {trend.startsWith('+') ? '↑' : '↓'} {trend.replace('+', '').replace('-', '')}
              </div>
              <span className="text-[10px] text-muted-foreground font-black opacity-50 uppercase tracking-widest">Growth</span>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
});

StatCard.displayName = 'StatCard';

export default StatCard;
