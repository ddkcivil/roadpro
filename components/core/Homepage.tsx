/**
 * Homepage Component
 * A dedicated landing page with branding, features, and sign-in option
 */
import React, { useState, useEffect } from 'react';
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
  Phone
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
import { Waves } from '~/components/ui/waves';

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
  onLogin: (role: UserRole, name: string, token?: string, userId?: string, phone?: string) => void;
  onShowRegistration: () => void;
}

interface Feature {
  icon: React.ElementType;
  title: string;
  description: string;
}

const features: Feature[] = [
  { icon: LayoutDashboard, title: 'Command Center', description: 'Real-time project monitoring and analytics' },
  { icon: MapIcon, title: 'GIS-Road Module', description: 'Chainage-based progress tracking with GPS' },
  { icon: FileText, title: 'BOQ Ledger', description: 'Bill of Quantities management' },
  { icon: CreditCard, title: 'Billing & Invoicing', description: 'Financial management and IPC generation' },
  { icon: CalendarClock, title: 'CPM Schedule', description: 'Critical Path Method scheduling' },
  { icon: ClipboardList, title: 'Field DPR', description: 'Daily progress reports from the field' },
  { icon: ClipboardCheck, title: 'Inspections (RFIs)', description: 'Quality control and inspections' },
  { icon: FolderOpen, title: 'Document Hub', description: 'Centralized documentation management' },
  { icon: Package, title: 'Materials & Resources', description: 'Inventory and resource tracking' },
  { icon: Bot, title: 'AI Assistant', description: 'Smart AI-powered assistance' },
];

const Homepage: React.FC<HomepageProps> = ({ onLogin, onShowRegistration }) => {
  const [showLogin, setShowLogin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{type: 'default' | 'destructive', text: string} | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
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
        // Default to Butwal, Nepal coordinates
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
        const { user, token } = result;
        const role = user.role as UserRole;
        const name = user.name || user.full_name || 'User';
        const userId = user.id;
        
        onLogin(role, name, token, userId, user.phone);
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
    <div className="h-screen bg-slate-950 text-white overflow-hidden flex flex-col">
      {/* Animated Background */}
      <div className="fixed inset-0 z-0">
        <Waves backgroundColor="transparent" strokeColor="rgba(255,255,255,0.03)" className="opacity-50" />
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute inset-0 opacity-[0.16] bg-[linear-gradient(to_right,rgba(255,255,255,0.25)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.25)_1px,transparent_1px)] bg-[size:44px_44px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-950/50 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-primary to-indigo-600 rounded-lg flex items-center justify-center">
            <Fingerprint className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-lg font-black tracking-tight">RoadMaster <span className="text-primary">Pro</span></h1>
        </div>
        {!showLogin && (
          <Button onClick={() => setShowLogin(true)} size="sm" className="bg-primary hover:bg-primary/90">
            Sign In <ArrowRight className="ml-2 h-3 w-3" />
          </Button>
        )}
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 overflow-hidden">
        {showLogin ? (
          <div className="w-full max-w-sm animate-in fade-in zoom-in duration-300">
            {/* Minimal Login Form */}
            <Card className="bg-slate-900/60 border border-white/5 backdrop-blur-xl rounded-2xl shadow-2xl">
              <CardContent className="p-6">
                <h3 className="text-xl font-black text-center mb-4">Sign In</h3>
                {message && <AlertUI variant={message.type} className="mb-4 text-xs p-2"><AlertDescriptionUI>{message.text}</AlertDescriptionUI></AlertUI>}
                <form onSubmit={handleLogin} className="space-y-3">
                  <Input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="bg-slate-800/50 border-slate-700 text-sm" />
                  <Input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="bg-slate-800/50 border-slate-700 text-sm" />
                  <Button type="submit" className="w-full bg-primary" disabled={loading}>{loading ? <Loader2 className="animate-spin" /> : 'Sign In'}</Button>
                </form>
                <button onClick={() => setShowLogin(false)} className="text-xs text-slate-400 mt-4 w-full text-center hover:text-primary">Back to Home</button>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="w-full max-w-7xl space-y-12">
            {/* Hero Section with Features */}
            <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
              <div className="max-w-xl space-y-6">
                <h2 className="text-5xl md:text-6xl font-black leading-tight">
                  Infrastructure Made <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-500">Simple</span>
                </h2>
                <p className="text-lg text-slate-300 leading-relaxed">
                  Complete construction and infrastructure management platform designed to streamline project execution, enhance collaboration, and optimize resource allocation.
                </p>
                <div className="flex flex-wrap gap-4">
                  <Button onClick={() => setShowLogin(true)} size="lg" className="grad-primary text-white shadow-xl shadow-primary/30 border-none">
                    Get Started <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="lg" onClick={onShowRegistration} className="border-white/20 hover:bg-white/10 hover:border-white/40">
                    Sign Up
                  </Button>
                </div>
              </div>
              
              {/* Dynamic Features Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 w-full lg:w-auto">
                {features.map((f, i) => (
                  <div 
                    key={i} 
                    className="group p-4 bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 hover:border-white/20 rounded-2xl hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-1 transition-all duration-300"
                  >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-indigo-500/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <f.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h4 className="text-sm font-bold text-white mb-1">{f.title}</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">{f.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Info Cards Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Brand Card */}
              <Card className="rounded-[2.5rem] glass-card border-none overflow-hidden relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <CardContent className="p-8 relative">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-primary to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-primary/40">
                      <HardHat size={32} className="text-white" />
                    </div>
                    <div>
                      <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
                        RoadMaster<span className="text-primary">.Pro</span>
                      </h1>
                      <p className="text-xs text-muted-foreground mt-1 font-medium">Infrastructure Management System</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Comprehensive construction and infrastructure management platform designed to streamline project execution, enhance collaboration, and optimize resource allocation.
                  </p>
                </CardContent>
              </Card>

              {/* Mission Card */}
              <Card className="rounded-[2.5rem] glass-card border-none overflow-hidden relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <CardHeader className="py-6 px-8 border-b border-white/5 relative">
                  <CardTitle className="text-[11px] font-black uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                    Our Mission
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8 relative">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    To revolutionize the construction industry by providing an integrated platform that connects all stakeholders, simplifies complex workflows, and delivers real-time insights.
                  </p>
                  <Separator className="my-4 opacity-10" />
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-primary" />
                      <span className="text-xs font-semibold text-foreground">Real-time Scheduling</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Building2 size={14} className="text-primary" />
                      <span className="text-xs font-semibold text-foreground">Project Mgmt</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Contact Card */}
              <Card className="rounded-[2.5rem] glass-card border-none overflow-hidden relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <CardHeader className="py-6 px-8 border-b border-white/5 relative">
                  <CardTitle className="text-[11px] font-black uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.5)]" />
                    Contact Us
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8 relative">
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin size={12} className="text-primary" />
                      <span className="text-foreground">Global Platform</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Mail size={12} className="text-primary" />
                      <span className="text-foreground">info@roadmasterpro.com</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Phone size={12} className="text-primary" />
                      <span className="text-foreground">+1 (234) 567-8900</span>
                    </div>
                  </div>
                  <form onSubmit={(e) => { e.preventDefault(); alert('Thank you for your message! We will get back to you soon.'); }} className="space-y-2">
                    <Input
                      placeholder="Your email"
                      className="h-8 text-xs bg-white/5 border-white/10 text-foreground placeholder:text-muted-foreground"
                      required
                    />
                    <div className="flex gap-2">
                      <Input
                        placeholder="Quick message..."
                        className="h-8 text-xs flex-1 bg-white/5 border-white/10 text-foreground placeholder:text-muted-foreground"
                        required
                      />
                      <Button type="submit" size="sm" className="h-8 px-3 bg-primary hover:bg-primary/90">
                        <Send size={12} />
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 px-6 py-3 border-t border-white/10 text-[10px] text-slate-500 flex justify-between">
        <p>© {new Date().getFullYear()} RoadMaster Pro.</p>
        <div className="flex gap-4">
          <button>About</button>
          <button>Contact</button>
        </div>
      </footer>
    </div>
  );
};

export default Homepage;
