import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, Cell } from 'recharts';
import { Project } from '../../types';
import { Package } from 'lucide-react';

interface ResourceAnalyticsWidgetProps {
  project: Project;
}

export const ResourceAnalyticsWidget: React.FC<ResourceAnalyticsWidgetProps> = ({ project }) => {
  const materials = project.materials || [];
  const boq = project.boq || [];

  const chartData = useMemo(() => {
    // Basic mapping of material to consumption:
    // This is a placeholder for the logic that maps materials to BOQ Items
    return materials.map(m => {
      // In a real app, this would be a calculated mapping
      const estimated = m.quantity * 1.1; 
      const actual = m.quantity - (m.availableQuantity || 0);
      return {
        name: m.name,
        estimated,
        actual
      };
    });
  }, [materials]);

  return (
    <Card className="rounded-[2.5rem] glass-card border-none overflow-hidden group">
      <CardHeader className="py-8 px-10 border-b border-white/5">
        <CardTitle className="text-[11px] font-black uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]" />
          Resource Consumption Analytics
        </CardTitle>
      </CardHeader>
      <CardContent className="h-[300px] p-8 min-h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
            <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
            <YAxis fontSize={10} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', backgroundColor: '#0f172a', color: '#fff' }} />
            <Legend />
            <Bar dataKey="estimated" fill="#94a3b8" name="Estimated" radius={[4, 4, 0, 0]} />
            <Bar dataKey="actual" fill="#f97316" name="Actual" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
