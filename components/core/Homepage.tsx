
import React, { useState, useEffect, useRef } from 'react';
import { UserRole } from '../../types';
import { 
  Fingerprint, 
  LayoutDashboard, 
  Map as MapIcon, 
  FileText, 
  CreditCard, 
  CalendarClock, 
  ClipboardList, 
  ClipboardCheck, 
  FolderOpen, 
  Package, 
  Bot,
  ArrowRight,
  Menu,
  X,
  Loader2,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Sun,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudFog,
  Thermometer,
  Wind,
  Droplets,
  MapPin,
  HardHat,
  Building2,
  Calendar,
  Send,
  Phone,
  Shield,
  Layers,
  TrendingUp,
  Users,
  CheckCircle2,
  Sparkles,
  Rocket,
  Globe,
  BarChart3,
  Activity,
  Zap
} from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Separator } from '~/components/ui/separator';
import { Input } from '~/components/ui/input';
import { Textarea } from '~/components/ui/textarea';
import { Label } from '~/components/ui/label';
import { Alert as AlertUI, AlertDescription as AlertDescriptionUI } from '~/components/ui/alert';
import { cn } from '~/lib/utils';
import { z } from 'zod';
import { useRateLimit } from '~/hooks/useRateLimit';
import { toast } from 'sonner';
import { fetchWeather } from '~/services/analytics/weatherService';
import { WeatherInfo } from '~/types';

// Weather icon component
const WeatherIcon = ({ icon, className }: { icon: string; className?: string }) => {
  switch (icon) {
    case 'Sun': return <Sun className={cn("text-yellow-500", className)} />;
    case 'Cloud': return <Cloud className={cn("text-slate-400", className)} />;
    case 'CloudFog': return <CloudFog className={cn("text-slate-400", className)} />;
    case 'CloudRain': return <CloudRain className={cn("text-blue-500", className)} />;
    case 'CloudSnow': return <CloudSnow className={cn("text-sky-200", className)} />;
    case 'CloudLightning': return <CloudLightning className={cn("text-purple-500", className)} />;
    default: return <Cloud className={cn("text-slate-400", className)} />;
  }
};

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

interface HomepageProps {
  onLogin: (role: UserRole, name: string, token?: string, userId?: string, phone?: string, refreshToken?: string) => void;
  onShowRegistration: () => void;
}

interface Feature {
  icon: React.ElementType;
  title: string;
  description: string;
  gradient: string;
}

const features: Feature[] = [
  { icon: LayoutDashboard, title: 'Command Center', description: 'Real-time project monitoring and analytics', gradient: 'from-violet-500/20 to-purple-500/20' },
  { icon: MapIcon, title: 'GIS-Road Module', description: 'Chainage-based progress tracking with GPS', gradient: 'from-emerald-500/20 to-teal-500/20' },
  { icon: FileText, title: 'BOQ Ledger', description: 'Bill of Quantities management', gradient: 'from-blue-500/20 to-cyan-500/20' },
  { icon: CreditCard, title: 'Billing & Invoicing', description: 'Financial management and IPC generation', gradient: 'from-amber-500/20 to-orange-500/20' },
  { icon: CalendarClock, title: 'CPM Schedule', description: 'Critical Path Method scheduling', gradient: 'from-rose-500/20 to-pink-500/20' },
  { icon: ClipboardList, title: 'Field DPR', description: 'Daily progress reports from the field', gradient: 'from-indigo-500/20 to-blue-500/20' },
  { icon: ClipboardCheck, title: 'Inspections (RFIs)', description: 'Quality control and inspections', gradient: 'from-green-500/20 to-emerald-500/20' },
  { icon: FolderOpen, title: 'Document Hub', description: 'Centralized documentation', gradient: 'from-sky-500/20 to-blue-500/20' },
  { icon: Package, title: 'Materials & Resources', description: 'Inventory and resource tracking', gradient: 'from-teal-500/20 to-cyan-500/20' },
  { icon: Bot, title: 'AI Assistant', description: 'Smart AI-powered assistance', gradient: 'from-fuchsia-500/20 to-violet-500/20' },
];

const stats = [
  { icon: Building2, value: '500+', label: 'Projects Managed', color: 'text-emerald-400' },
  { icon: Users, value: '10K+', label: 'Active Users', color: 'text-blue-400' },
  { icon: TrendingUp, value: '98%', label: 'Uptime', color: 'text-violet-400' },
  { icon: Globe, value: '15+', label: 'Countries', color: 'text-amber-400' },
];

const FloatingParticle = ({ index }: { index: number }) => {
  const x = Math.random() * 100;
  const y = Math.random() * 100;
  const size = Math.random() * 4 + 2;
  const duration = Math.random() * 20 + 10;
  const delay = Math.random() * 10;

  return (
    <div
      className="absolute rounded-full bg-white/5 animate-float"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        width: size,
        height: size,
        animationDuration: `${duration}s`,
        animationDelay: `${delay}s`,
      }}
    />
  );
};

const Homepage: React.FC<HomepageProps> = ({ onLogin, onShowRegistration }) => {
  const [showLogin, setShowLogin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{type: 'default' | 'destructive', text: string} | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [mounted, setMounted] = useState(false);
  
  // Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Date and Weather State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [weather, setWeather] = useState<WeatherInfo | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherError, setWeatherError] = useState(false);

  const { isLocked, remainingTime, checkLimit } = useRateLimit({
    limit: 10,
    windowMs: 60000
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Update date every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Fetch weather data
  useEffect(() => {
    const loadWeather = async () => {
      try {
        const lat = 27.7172;
        const lng = 85.3240;
        const weatherData = await fetchWeather(lat, lng);
        setWeather(weatherData);
      } catch (err) {
        console.error('Failed to load weather:', err);
        setWeatherError(true);
      } finally {
        setWeatherLoading(false);
      }
    };
    loadWeather();
  }, []);

  useEffect(() => {
    setErrors({});
    setMessage(null);
  }, [showLogin]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setMessage(null);

    if (!checkLimit()) {
      setMessage({ 
        type: 'destructive', 
        text: `Too many attempts. Please wait ${Math.ceil(remainingTime)} seconds.` 
      });
      return;
    }

    try {
      loginSchema.parse({ email, password });
    } catch (err) {
      if (err instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        err.issues.forEach((issue) => {
          const path = issue.path[0];
          if (path) newErrors[path.toString()] = issue.message;
        });
        setErrors(newErrors);
        return;
      }
    }

    setLoading(true);
    
    try {
      console.log(`[Homepage/Login] Attempting custom auth for ${email}`);
      const response = await fetch('/api/auth?action=login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('[Homepage/Login] Non-JSON response:', text.substring(0, 500));
        setMessage({ type: 'destructive', text: 'Server error. Please try again later.' });
        return;
      }

      const result = await response.json();

      if (!response.ok) {
        console.error('[Homepage/Login] Auth error:', result.error);
        setMessage({ type: 'destructive', text: result.error || 'Invalid email or password.' });
        return;
      }

      if (result.user) {
        const { user, token, refreshToken } = result;
        const role = user.role as UserRole;
        const name = user.name || user.full_name || 'User';
        const userId = user.id;
        
        onLogin(role, name, token, userId, user.phone, refreshToken);
        toast.success(`Welcome back, ${name}`);
      }
    } catch (error: any) {
      console.error('[Homepage/Login] Critical failure:', error);
      setMessage({ type: 'destructive', text: error.message || 'An error occurred during authentication.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white overflow-x-hidden">
      {/* Animated Background Particles */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 20 }).map((_, i) => (
          <FloatingParticle key={i} index={i} />
        ))}
        <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-gradient-to-br from-primary/15 via-primary/5 to-transparent rounded-full blur-[150px] animate-pulse-slow" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-gradient-to-br from-indigo-500/15 via-violet-500/5 to-transparent rounded-full blur-[120px] animate-pulse-slow" style={{ animationDelay: '2s' }} />
        <div className="absolute top-[40%] left-[60%] w-[400px] h-[400px] bg-gradient-to-br from-amber-500/10 to-transparent rounded-full blur-[100px] animate-pulse-slow" style={{ animationDelay: '4s' }} />
        <div className="absolute inset-0 opacity-[0.08] bg-[linear-gradient(to_right,rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:64px_64px]" />
      </div>

      {/* Header */}
      <header className={cn(
        "relative z-10 flex items-center justify-between px-6 lg:px-12 py-4 transition-all duration-500",
        mounted ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
      )}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary/30 group cursor-pointer">
            <Fingerprint className="h-6 w-6 text-white group-hover:scale-110 transition-transform" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight">RoadMaster <span className="text-primary">Pro</span></h1>
            <p className="text-[10px] text-slate-500 font-medium tracking-wider uppercase">Infrastructure OS</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* Weather Widget */}
          {weather && !weatherLoading && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full border border-white/10">
              <WeatherIcon icon={weather.icon} className="h-4 w-4" />
              <span className="text-xs text-slate-300">{weather.temp}°C</span>
              <span className="text-[10px] text-slate-500">{weather.condition}</span>
            </div>
          )}
          {!showLogin && (
            <Button onClick={() => setShowLogin(true)} size="sm" className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 group">
              Sign In <ArrowRight className="ml-2 h-3 w-3 group-hover:translate-x-1 transition-transform" />
            </Button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex flex-col items-center px-6 lg:px-12 py-8 lg:py-16">
        {showLogin ? (
          <div className={cn(
            "w-full max-w-md animate-in fade-in zoom-in duration-500",
            mounted ? "opacity-100 scale-100" : "opacity-0 scale-95"
          )}>
            <Card className="bg-slate-900/80 border border-white/10 backdrop-blur-2xl rounded-3xl shadow-2xl shadow-black/50 overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-primary via-indigo-500 to-violet-500" />
              <CardContent className="p-8">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-gradient-to-br from-primary to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-primary/30">
                    <Fingerprint className="h-8 w-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-black text-white">Welcome Back</h2>
                  <p className="text-sm text-slate-400 mt-1">Sign in to your account</p>
                </div>
                
                {message && (
                  <AlertUI variant={message.type} className="mb-6 text-xs p-3 rounded-xl bg-red-500/10 border-red-500/20">
                    <AlertDescriptionUI>{message.text}</AlertDescriptionUI>
                  </AlertUI>
                )}
                
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-400 font-medium">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                      <Input 
                        type="email" 
                        placeholder="you@example.com" 
                        value={email} 
                        onChange={e => setEmail(e.target.value)} 
                        className="pl-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-primary focus:ring-1 focus:ring-primary h-11 rounded-xl text-sm"
                      />
                    </div>
                    {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email}</p>}
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-400 font-medium">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                      <Input 
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••" 
                        value={password} 
                        onChange={e => setPassword(e.target.value)} 
                        className="pl-10 pr-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-primary focus:ring-1 focus:ring-primary h-11 rounded-xl text-sm"
                      />
                      <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {errors.password && <p className="text-xs text-red-400 mt-1">{errors.password}</p>}
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-11 bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-600/90 text-white font-bold rounded-xl shadow-lg shadow-primary/25"
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <div className="flex items-center gap-2">
                        <span>Sign In</span>
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    )}
                  </Button>
                </form>

                <div className="mt-6 text-center space-y-3">
                  <button onClick={() => setShowLogin(false)} className="text-xs text-slate-500 hover:text-primary transition-colors">
                    ← Back to Home
                  </button>
                  <div className="text-xs text-slate-600">
                    Don't have an account?{' '}
                    <button onClick={onShowRegistration} className="text-primary hover:underline font-medium">
                      Sign Up
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className={cn(
            "w-full max-w-7xl space-y-16 lg:space-y-24 transition-all duration-700",
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}>
            {/* Hero Section */}
            <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
              <div className="flex-1 max-w-2xl space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-full text-xs text-primary font-medium">
                  <Sparkles className="h-3 w-3" />
                  <span>Next-Gen Infrastructure Management</span>
                </div>
                
                <h2 className="text-4xl md:text-6xl lg:text-7xl font-black leading-tight">
                  Build Smarter.
                  <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-indigo-400 to-violet-400">
                    Deliver Faster.
                  </span>
                </h2>
                
                <p className="text-lg text-slate-400 leading-relaxed max-w-xl">
                  Complete construction and infrastructure management platform designed to streamline project execution, enhance collaboration, and optimize resource allocation across your entire organization.
                </p>
                
                <div className="flex flex-wrap gap-4 pt-2">
                  <Button 
                    onClick={() => setShowLogin(true)} 
                    size="lg" 
                    className="bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-600/90 text-white shadow-xl shadow-primary/30 border-none h-12 px-8 rounded-xl font-bold text-base group"
                  >
                    Get Started Free
                    <Rocket className="ml-2 h-4 w-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="lg"
                    onClick={onShowRegistration}
                    className="border-white/20 hover:bg-white/5 hover:border-white/40 text-white h-12 px-8 rounded-xl font-bold"
                  >
                    Create Account
                  </Button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-8">
                  {stats.map((stat, i) => (
                    <div key={i} className="text-center md:text-left">
                      <div className="flex items-center gap-2 justify-center md:justify-start">
                        <stat.icon className={`h-4 w-4 ${stat.color}`} />
                        <span className={`text-2xl font-black ${stat.color}`}>{stat.value}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Feature Grid */}
              <div className="flex-shrink-0 grid grid-cols-2 gap-3 w-full lg:w-[500px]">
                {features.map((f, i) => (
                  <div 
                    key={i}
                    className="group relative p-4 bg-gradient-to-br from-white/[0.04] to-white/[0.02] border border-white/[0.06] hover:border-white/[0.15] rounded-2xl hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden"
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${f.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                    <div className="relative z-10">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                        <f.icon className="h-5 w-5 text-primary" />
                      </div>
                      <h4 className="text-xs font-bold text-white mb-1 group-hover:text-primary transition-colors">{f.title}</h4>
                      <p className="text-[10px] text-slate-500 leading-relaxed">{f.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Info Cards Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Brand Card */}
              <Card className="rounded-3xl bg-gradient-to-br from-slate-900/80 to-slate-900/60 border border-white/[0.06] overflow-hidden relative group hover:border-white/[0.12] transition-all duration-500">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <CardContent className="p-8 relative">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-primary to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-primary/30 group-hover:scale-105 transition-transform">
                      <HardHat size={32} className="text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-extrabold tracking-tight text-white">
                        RoadMaster<span className="text-primary">.Pro</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 font-medium uppercase tracking-wider">Infrastructure Management System</p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    Comprehensive construction and infrastructure management platform designed to streamline project execution, enhance collaboration, and optimize resource allocation across teams.
                  </p>
                  <div className="flex flex-wrap gap-2 mt-6">
                    {['Cloud-Based', 'Real-Time', 'AI-Powered', 'Mobile'].map((tag) => (
                      <span key={tag} className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] text-slate-400 font-medium">
                        {tag}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Stats / Mission Card */}
              <Card className="rounded-3xl bg-gradient-to-br from-slate-900/80 to-slate-900/60 border border-white/[0.06] overflow-hidden relative group hover:border-white/[0.12] transition-all duration-500">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <CardHeader className="py-6 px-8 border-b border-white/[0.06] relative">
                  <CardTitle className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                    Platform Analytics
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8 relative">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-400">Active Projects</span>
                      <div className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-emerald-400" />
                        <span className="text-lg font-black text-white">248</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-400">Completion Rate</span>
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-blue-400" />
                        <span className="text-lg font-black text-white">94.2%</span>
                      </div>
                    </div>
                    <Separator className="my-4 bg-white/5" />
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-primary" />
                        <span className="text-xs text-slate-400">Real-time Scheduling</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Building2 size={14} className="text-primary" />
                        <span className="text-xs text-slate-400">Project Mgmt</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Shield size={14} className="text-primary" />
                        <span className="text-xs text-slate-400">Quality Control</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Zap size={14} className="text-primary" />
                        <span className="text-xs text-slate-400">AI Insights</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Contact Card */}
              <Card className="rounded-3xl bg-gradient-to-br from-slate-900/80 to-slate-900/60 border border-white/[0.06] overflow-hidden relative group hover:border-white/[0.12] transition-all duration-500">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <CardHeader className="py-6 px-8 border-b border-white/[0.06] relative">
                  <CardTitle className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.5)]" />
                    Get In Touch
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8 relative">
                  <div className="space-y-4 mb-6">
                    <div className="flex items-center gap-3 text-sm text-slate-400">
                      <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                        <Globe size={14} className="text-violet-400" />
                      </div>
                      <span className="text-white">roadmasterpro.com</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-400">
                      <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                        <Mail size={14} className="text-violet-400" />
                      </div>
                      <span className="text-white">support@roadmasterpro.com</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-400">
                      <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                        <Phone size={14} className="text-violet-400" />
                      </div>
                      <span className="text-white">+977-1-500-0000</span>
                    </div>
                  </div>
                  <form onSubmit={(e) => { e.preventDefault(); toast.success('Message sent! We\'ll get back to you soon.'); }} className="space-y-3">
                    <Input
                      placeholder="Your email"
                      className="h-10 text-sm bg-white/5 border-white/10 text-white placeholder:text-slate-500 rounded-xl focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                      required
                    />
                    <div className="flex gap-2">
                      <Input
                        placeholder="Quick message..."
                        className="h-10 text-sm flex-1 bg-white/5 border-white/10 text-white placeholder:text-slate-500 rounded-xl focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                        required
                      />
                      <Button type="submit" size="sm" className="h-10 px-4 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 rounded-xl">
                        <Send size={14} />
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Trusted By Section */}
            <div className="text-center space-y-8">
              <div className="flex items-center gap-4 justify-center">
                <Separator className="w-12 bg-white/10" />
                <p className="text-xs text-slate-500 font-medium uppercase tracking-[0.2em]">Trusted by Industry Leaders</p>
                <Separator className="w-12 bg-white/10" />
              </div>
              <div className="flex flex-wrap justify-center gap-8 md:gap-16 opacity-40">
                {['Nepal Govt.', 'ADB', 'World Bank', 'UNDP', 'JICA'].map((org) => (
                  <div key={org} className="text-sm font-bold text-slate-400 tracking-wider uppercase">
                    {org}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 px-6 lg:px-12 py-4 border-t border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[11px] text-slate-600">
            © {new Date().getFullYear()} RoadMaster Pro. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <button className="text-[11px] text-slate-600 hover:text-slate-400 transition-colors">Privacy Policy</button>
            <button className="text-[11px] text-slate-600 hover:text-slate-400 transition-colors">Terms of Service</button>
            <button className="text-[11px] text-slate-600 hover:text-slate-400 transition-colors">Contact Support</button>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.3; }
          25% { transform: translateY(-20px) rotate(90deg); opacity: 0.5; }
          50% { transform: translateY(-10px) rotate(180deg); opacity: 0.2; }
          75% { transform: translateY(-30px) rotate(270deg); opacity: 0.4; }
        }
        .animate-float {
          animation: float 15s ease-in-out infinite;
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.05); }
        }
        .animate-pulse-slow {
          animation: pulse-slow 8s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default Homepage;