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
}

const StatCard: React.FC<StatCardProps> = memo(({ title, value, icon: Icon, color, trend, isLoading = false }) => {
  const getColorClasses = (colorName: string) => {
    const map: Record<string, string> = {
      primary: "grad-primary shadow-blue-500/20",
      success: "grad-emerald shadow-emerald-500/20",
      danger: "grad-rose shadow-rose-500/20",
      warning: "grad-amber shadow-amber-500/20",
      info: "grad-indigo shadow-indigo-500/20",
      violet: "grad-violet shadow-violet-500/20",
      rose: "grad-rose shadow-rose-500/20",
      slate: "grad-slate shadow-slate-500/20",
    };
    return map[colorName] || "grad-slate shadow-slate-500/20";
  };

  const gradientClass = getColorClasses(color);

  if (isLoading) {
    return (
      <Card className="h-full bg-card border-border/50 rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Shimmer className="h-3 w-20" />
          <Shimmer className="h-10 w-10 rounded-xl" />
        </CardHeader>
        <CardContent>
          <Shimmer className="h-8 w-16 mb-2" />
          <Shimmer className="h-3 w-24" />
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="h-full"
    >
      <Card className="h-full glass-card hover:bg-white/60 dark:hover:bg-slate-900/60 transition-all duration-500 hover:-translate-y-1 group relative overflow-hidden rounded-2xl">
        <div className={cn("absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 opacity-[0.03] transition-transform duration-700 group-hover:scale-150 group-hover:rotate-12", color.includes('success') ? 'text-emerald-500' : 'text-primary')}>
            <Icon size={120} strokeWidth={1} />
        </div>
        
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
          <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.15em]">{title}</CardTitle>
          <div className={cn("p-2.5 rounded-xl transition-all group-hover:rotate-6 duration-500 shadow-lg", gradientClass)}>
            <Icon className="h-5 w-5" />
          </div>
        </CardHeader>
        <CardContent className="relative z-10 pt-2">
          <div className="text-3xl font-black tracking-tighter text-slate-800 dark:text-slate-100">{value}</div>
          {trend && (
              <div className="flex items-center gap-1.5 mt-2">
                <div className={cn("flex items-center gap-0.5 text-[10px] font-black px-2 py-0.5 rounded-lg shadow-sm", 
                  trend.startsWith('+') 
                    ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' 
                    : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                )}>
                    {trend.startsWith('+') ? '↑' : '↓'} {trend.replace('+', '').replace('-', '')}
                </div>
                <span className="text-[10px] text-muted-foreground font-bold opacity-60 uppercase tracking-wider">vs Period</span>
              </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
});

StatCard.displayName = 'StatCard';

export default StatCard;
