import React from 'react';
import React from 'react';
import { type LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { cn } from '~/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
  trend?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, color, trend }) => {
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
  const isCustomColor = !colorClasses;

  return (
    <Card className="h-full bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl transition-all hover:-translate-y-0.5 hover:shadow-2xl">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-400">{title}</CardTitle>
        <div className={cn("p-1.5 rounded-lg flex items-center justify-center", colorClasses)}>
          <Icon className="h-6 w-6" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-white">{value}</div>
        {trend && (
            <p className={cn("text-xs mt-1", trend.startsWith('+') ? 'text-emerald-500' : 'text-red-500')}>
                {trend}
            </p>
        )}
      </CardContent>
    </Card>
  );
};

export default StatCard;
