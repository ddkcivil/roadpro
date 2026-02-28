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
      primary: "text-primary bg-primary/20",
      success: "text-green-500 bg-green-500/20",
      danger: "text-red-500 bg-red-500/20",
      warning: "text-amber-500 bg-amber-500/20",
      info: "text-blue-500 bg-blue-500/20",
      violet: "text-violet-500 bg-violet-500/20",
      rose: "text-rose-500 bg-rose-500/20",
      slate: "text-slate-500 bg-slate-500/20",
    };
    return map[colorName] || "text-slate-500 bg-slate-500/20";
  };

  const colorClasses = getColorClasses(color);

  if (isLoading) {
    return (
      <Card className="h-full bg-card border-border/50 rounded-xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Shimmer className="h-3 w-20" />
          <Shimmer className="h-8 w-8 rounded-lg" />
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="h-full"
    >
      <Card className="h-full bg-card hover:bg-accent/5 transition-all duration-300 hover:shadow-md border-border/50 group">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{title}</CardTitle>
          <div className={cn("p-2 rounded-xl transition-transform group-hover:scale-110 duration-300", colorClasses)}>
            <Icon className="h-5 w-5" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-black tracking-tight">{value}</div>
          {trend && (
              <div className="flex items-center gap-1 mt-1">
                <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full", trend.startsWith('+') ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600')}>
                    {trend}
                </span>
                <span className="text-[10px] text-muted-foreground font-medium">vs last month</span>
              </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
});

StatCard.displayName = 'StatCard';

export default StatCard;
