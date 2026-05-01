import { useState, useEffect } from 'react';
import { 
  Sun, Wind, Droplets, Cloud, CloudRain, CloudSnow, 
  CloudLightning, AlertTriangle, CloudFog, Thermometer,
  CloudSun, Calendar, ChevronRight, List
} from 'lucide-react';
import { fetchWeather, fetchMonthlySummary, MonthlyWeatherSummary, fetchDailyWeatherHistory, DailyWeatherRecord } from '../../services/analytics/weatherService';
import { WeatherInfo } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Skeleton } from '~/components/ui/skeleton';
import { cn } from '~/lib/utils';
import { Button } from '~/components/ui/button';
import { ScrollArea } from '~/components/ui/scroll-area';

const WeatherIcon = ({ icon, className }: { icon: string; className?: string }) => {
  switch (icon) {
    case 'Sun': return <Sun className={cn("text-yellow-500", className)} />;
    case 'Cloud': return <Cloud className={cn("text-slate-400", className)} />;
    case 'CloudFog': return <CloudFog className={cn("text-slate-400", className)} />;
    case 'CloudRain': return <CloudRain className={cn("text-blue-500", className)} />;
    case 'CloudSnow': return <CloudSnow className={cn("text-sky-200", className)} />;
    case 'CloudLightning': return <CloudLightning className={cn("text-purple-500", className)} />;
    default: return <Sun className={cn("text-yellow-500", className)} />;
  }
};

const WeatherWidget = () => {
  const [weather, setWeather] = useState<WeatherInfo | null>(null);
  const [monthlySummary, setMonthlySummary] = useState<MonthlyWeatherSummary | null>(null);
  const [dailyHistory, setDailyHistory] = useState<DailyWeatherRecord[]>([]);
  const [viewState, setViewState] = useState<'LIVE' | 'SUMMARY' | 'HISTORY'>('LIVE');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const loadWeather = async () => {
      try {
        const lat = 27.7172; 
        const lng = 85.3240;
        const now = new Date();
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        
        const [currentData, monthlyData, historyData] = await Promise.all([
            fetchWeather(lat, lng),
            fetchMonthlySummary(monthNames[now.getMonth()], 'Butwal, Nepal'),
            fetchDailyWeatherHistory(now.getMonth() + 1, now.getFullYear(), lat, lng)
        ]);
        
        setWeather(currentData);
        setMonthlySummary(monthlyData);
        setDailyHistory(historyData);
      } catch (err) {
        console.error("Failed to load weather", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    loadWeather();
  }, []);

  if (loading) {
    return (
      <Card className="h-full border-border/40 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded-full" /> Loading Weather...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-4">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !weather) {
    return (
      <Card className="h-full border-destructive/20 bg-destructive/5 shadow-sm">
        <CardContent className="flex flex-col items-center justify-center h-full p-6 text-center">
          <CloudLightning className="h-8 w-8 text-destructive/50 mb-2" />
          <p className="text-sm text-destructive font-medium">Weather Unavailable</p>
          <p className="text-xs text-muted-foreground">Could not connect to service.</p>
        </CardContent>
      </Card>
    );
  }

  const toggleView = () => {
    if (viewState === 'LIVE') setViewState('SUMMARY');
    else if (viewState === 'SUMMARY') setViewState('HISTORY');
    else setViewState('LIVE');
  };

  const getButtonText = () => {
    if (viewState === 'LIVE') return "Summary";
    if (viewState === 'SUMMARY') return "Daily Logs";
    return "Back Live";
  };

  const currentMonthName = new Date().toLocaleString('default', { month: 'long' });

  return (
    <Card className="h-full border-border/40 bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl shadow-md overflow-hidden group hover:shadow-lg transition-all duration-300">
      {viewState === 'LIVE' && (
        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
          <WeatherIcon icon={weather.icon} className="w-24 h-24" />
        </div>
      )}
      
      <CardHeader className="pb-2 relative z-10">
        <div className="flex justify-between items-center">
          <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
            {viewState === 'SUMMARY' ? <><Calendar size={14} className="text-primary" /> {currentMonthName} Summary</> : 
             viewState === 'HISTORY' ? <><List size={14} className="text-primary" /> Daily Logs</> : 
             "Site Conditions"}
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 text-[9px] font-black uppercase tracking-tighter"
            onClick={toggleView}
          >
            {getButtonText()} <ChevronRight size={10} className="ml-1" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="relative z-10">
        {viewState === 'SUMMARY' && monthlySummary ? (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-lg font-black tracking-tight">{monthlySummary.location}</h3>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">{monthlySummary.month} Averages</p>
                    </div>
                    <CloudSun className="text-orange-400 w-10 h-10" />
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-orange-50 dark:bg-orange-950/20 p-2 rounded-xl border border-orange-100 dark:border-orange-900/30">
                        <div className="flex items-center gap-1.5 mb-1 text-orange-600 dark:text-orange-400">
                            <Thermometer size={12} strokeWidth={3} />
                            <span className="text-[9px] font-black uppercase tracking-widest">Temperature</span>
                        </div>
                        <div className="flex justify-between items-end">
                            <span className="text-lg font-black italic">{monthlySummary.avgHigh}°<span className="text-[10px] ml-0.5 text-muted-foreground not-italic">Max</span></span>
                            <span className="text-xs font-bold text-muted-foreground">{monthlySummary.avgLow}° Min</span>
                        </div>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-950/20 p-2 rounded-xl border border-blue-100 dark:border-blue-900/30">
                        <div className="flex items-center gap-1.5 mb-1 text-blue-600 dark:text-blue-400">
                            <CloudRain size={12} strokeWidth={3} />
                            <span className="text-[9px] font-black uppercase tracking-widest">Rainfall</span>
                        </div>
                        <div className="flex justify-between items-end">
                            <span className="text-lg font-black italic">{monthlySummary.avgRainfall}<span className="text-[10px] ml-0.5 text-muted-foreground not-italic">mm</span></span>
                            <span className="text-xs font-bold text-muted-foreground">{monthlySummary.rainyDays} Days</span>
                        </div>
                    </div>
                </div>

                <div className="bg-muted/30 p-3 rounded-2xl mb-4">
                    <p className="text-[10px] font-bold text-foreground leading-relaxed">
                        "{monthlySummary.summary}"
                    </p>
                </div>

                <div className="grid grid-cols-3 gap-2 py-2 border-t border-border/40">
                    <div className="text-center">
                        <p className="text-[8px] font-black text-muted-foreground uppercase mb-1">Humidity</p>
                        <p className="text-xs font-black">{monthlySummary.avgHumidity}%</p>
                    </div>
                    <div className="text-center border-x border-border/40">
                        <p className="text-[8px] font-black text-muted-foreground uppercase mb-1">Sunshine</p>
                        <p className="text-xs font-black">{monthlySummary.sunshineHours}h</p>
                    </div>
                    <div className="text-center">
                        <p className="text-[8px] font-black text-muted-foreground uppercase mb-1">Wind</p>
                        <p className="text-xs font-black">{monthlySummary.avgWindSpeed}kph</p>
                    </div>
                </div>
            </div>
        ) : viewState === 'HISTORY' ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <ScrollArea className="h-64 pr-4">
                    <div className="space-y-2">
                        {dailyHistory.map((record, i) => (
                            <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-muted/20 border border-border/40 hover:bg-muted/40 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="text-center min-w-[30px]">
                                        <p className="text-[10px] font-black">{record.date?.split('-')[2] || '??'}</p>
                                        <p className="text-[8px] font-bold text-muted-foreground uppercase">{record.date ? new Date(record.date).toLocaleString('default', { weekday: 'short' }) : '---'}</p>
                                    </div>
                                    <WeatherIcon icon={record.icon} className="w-5 h-5" />
                                    <div>
                                        <p className="text-[10px] font-black italic">{record.tempMax}° / {record.tempMin}°</p>
                                        <p className="text-[8px] font-bold text-muted-foreground uppercase">{record.condition}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <Badge variant={record.workable ? "secondary" : "destructive" as any} className="text-[8px] font-black py-0 px-1">
                                        {record.workable ? "WORKABLE" : "STOCKED"}
                                    </Badge>
                                    {record.rainfall > 0 && (
                                        <p className="text-[8px] font-bold text-blue-500 mt-0.5">{record.rainfall}mm</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </div>
        ) : (
            <div className="animate-in fade-in slide-in-from-left-4 duration-500">
                <div className="flex justify-between items-end mb-4">
                    <div>
                        <div className="text-4xl font-black tracking-tighter flex items-start text-foreground">
                            {weather.temp}<span className="text-lg mt-1 text-muted-foreground">°C</span>
                        </div>
                        <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                            {weather.condition} • {weather.description}
                        </p>
                    </div>
                    <WeatherIcon icon={weather.icon} className="w-12 h-12 drop-shadow-md" />
                </div>

                <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="flex items-center gap-2 text-xs font-medium bg-background/50 p-2 rounded-lg border border-border/50">
                        <Wind className="w-3.5 h-3.5 text-blue-400" />
                        <span>{weather.windSpeed} km/h</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-medium bg-background/50 p-2 rounded-lg border border-border/50">
                        <Droplets className="w-3.5 h-3.5 text-blue-400" />
                        <span>{weather.humidity}% Hum</span>
                    </div>
                </div>

                {weather.riskFactors && (
                    <div className="space-y-2">
                        {weather.riskFactors.precipitation > 50 && (
                            <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 p-2 rounded-lg border border-amber-100 dark:border-amber-800/30">
                                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                <span className="font-bold">High Precipitation Risk</span>
                            </div>
                        )}
                        {weather.riskFactors.wind > 50 && (
                            <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 p-2 rounded-lg border border-amber-100 dark:border-amber-800/30">
                                <Wind className="w-3.5 h-3.5 shrink-0" />
                                <span className="font-bold">High Wind Risk</span>
                            </div>
                        )}
                    </div>
                )}

                <div className="mt-4 pt-4 border-t border-border/40">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">3-Day Forecast</p>
                    <div className="grid grid-cols-3 gap-2">
                        {weather.forecast?.slice(0, 3).map((day, i) => (
                        <div key={i} className="text-center p-2 rounded-lg hover:bg-background/50 transition-colors">
                            <p className="text-[10px] font-bold text-muted-foreground mb-1">{day.day}</p>
                            <div className="flex justify-center mb-1">
                            <WeatherIcon icon={day.condition === 'Sunny' ? 'Sun' : day.condition.includes('Rain') ? 'CloudRain' : 'Cloud'} className="w-4 h-4" />
                            </div>
                            <p className="text-xs font-black">{day.temp}°</p>
                        </div>
                        ))}
                    </div>
                </div>
            </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WeatherWidget;
