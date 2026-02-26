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
  return (
    <Card className="h-full bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl transition-all hover:-translate-y-0.5 hover:shadow-2xl">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-400">{title}</CardTitle>
        <div className="p-1.5 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
          <Icon className="h-6 w-6" style={{ color: color }} />
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
