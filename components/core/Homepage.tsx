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
  MapPin
} from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
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
    <div className="min-h-screen bg-slate-950 text-white overflow-x-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 z-0">
        <Waves 
          backgroundColor="transparent" 
          strokeColor="rgba(255,255,255,0.03)" 
          className="opacity-50"
        />
        
        {/* neon blobs */}
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-violet-500/5 rounded-full blur-[150px]" />

        {/* subtle grid + scanlines */}
        <div className="absolute inset-0 opacity-[0.16] bg-[linear-gradient(to_right,rgba(255,255,255,0.25)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.25)_1px,transparent_1px)] bg-[size:44px_44px]" />
        <div className="absolute inset-0 opacity-[0.10] bg-[repeating-linear-gradient(to_bottom,rgba(255,255,255,0.25),rgba(255,255,255,0.25)_1px,transparent_1px,transparent_6px)]" />
      </div>


{/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 lg:px-12 py-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-indigo-600 rounded-xl flex items-center justify-center">
            <Fingerprint className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight">
              RoadMaster <span className="text-primary">Pro</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-medium tracking-widest uppercase">
              Infrastructure Management
            </p>
          </div>
        </div>

        {/* Date and Weather Display */}
        {!showLogin && (
          <div className="hidden lg:flex items-center gap-4 mx-4">
            {/* Date Display */}
            <div className="flex flex-col items-end border-r border-slate-700 pr-4">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                {currentDate.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })}
              </span>
              <span className="text-[10px] font-medium text-slate-500">
                {currentDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            {/* Weather Display */}
            {weatherLoading ? (
              <div className="flex items-center gap-2 text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-xs">Loading...</span>
              </div>
            ) : weatherError || !weather ? (
              <div className="flex items-center gap-2 text-slate-500">
                <Cloud className="h-4 w-4" />
                <span className="text-xs">--°C</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-3 py-1.5">
                <WeatherIcon icon={weather.icon} className="w-4 h-4" />
                <span className="text-sm font-bold">{weather.temp}°C</span>
                <span className="text-xs text-slate-400 hidden xl:inline">{weather.condition}</span>
              </div>
            )}
          </div>
        )}
        
        {!showLogin && (
          <Button 
            onClick={() => setShowLogin(true)}
            className="hidden lg:flex items-center gap-2 bg-primary hover:bg-primary/90 px-6"
          >
            Sign In
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
        
        {!showLogin && (
          <Button 
            onClick={() => setShowLogin(true)}
            className="lg:hidden flex items-center gap-2 bg-primary hover:bg-primary/90"
          >
            Sign In
          </Button>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative z-10 px-6 lg:px-12 py-12 lg:py-20">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10 mb-8">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-medium text-slate-300">Advanced Infrastructure Solutions</span>
          </div>
          
          <h2 className="text-4xl lg:text-6xl font-black tracking-tight mb-6">
            Build Smarter with{' '}
            <span className="bg-gradient-to-r from-primary via-indigo-500 to-violet-500 bg-clip-text text-transparent">
              RoadMaster Pro
            </span>
          </h2>
          
          <p className="text-lg lg:text-xl text-slate-400 max-w-2xl mx-auto mb-10">
            The complete infrastructure management system for road construction projects. 
            Track progress, manage resources, and deliver on time.
          </p>

          {!showLogin ? (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button 
                onClick={() => setShowLogin(true)}
                size="lg"
                className="bg-primary hover:bg-primary/90 text-white px-8 h-14 text-lg font-bold"
              >
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white px-8 h-14 text-lg font-bold"
                onClick={onShowRegistration}
              >
                Create Account
              </Button>
            </div>
          ) : (
            <div className="flex justify-center gap-4">
              <Button 
                variant="ghost"
                onClick={() => setShowLogin(false)}
                className="text-slate-400 hover:text-white"
              >
                <ArrowRight className="mr-2 h-4 w-4 rotate-180" />
                Back to Home
              </Button>
            </div>
          )}
        </div>
      </section>

{/* Login Form */}
      {showLogin && (
        <section className="relative z-10 px-6 pb-20">
          <div className="max-w-md mx-auto">
            <Card className="bg-slate-900/60 border border-white/5 backdrop-blur-xl rounded-[2.5rem] animate-in fade-in slide-in-from-bottom-4 duration-500">
              <CardContent className="p-8">
                <div className="text-center mb-8">
                  <div className="w-14 h-14 bg-gradient-to-br from-primary to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Fingerprint className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-black">Sign In</h3>
                  <p className="text-slate-400">Enter your credentials to continue</p>
                </div>

                {message && (
                  <div className="animate-in fade-in slide-in-from-left-2 duration-300">
                    <AlertUI variant={message.type} className="mb-4">
                      <AlertDescriptionUI>{message.text}</AlertDescriptionUI>
                    </AlertUI>
                  </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-slate-300">Email</Label>
                    <div className="relative group">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-primary transition-colors" />
                      <Input 
                        id="email" 
                        type="email" 
                        placeholder="email@example.com" 
                        value={email} 
                        onChange={e => setEmail(e.target.value)} 
                        className="bg-slate-800/50 border-slate-700 text-white pl-10 transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:scale-[1.01]"
                      />
                    </div>
                    {errors.email && (
                      <p className="text-red-400 text-xs animate-in fade-in slide-in-from-right-2 duration-300">{errors.email}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="text-slate-300">Password</Label>
                      <button 
                        type="button"
                        onClick={() => {
                          setMessage({ type: 'default', text: 'Password reset is currently unavailable. Please contact your administrator.' });
                          toast.info("Password reset requested.");
                        }}
                        className="text-xs font-semibold text-primary hover:text-primary/80"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <div className="relative group">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-primary transition-colors" />
                      <Input 
                        id="password" 
                        type={showPassword ? "text" : "password"} 
                        value={password} 
                        onChange={e => setPassword(e.target.value)} 
                        className="bg-slate-800/50 border-slate-700 text-white pl-10 pr-10 transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:scale-[1.01]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-all duration-200 hover:scale-110"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-red-400 text-xs animate-in fade-in slide-in-from-right-2 duration-300">{errors.password}</p>
                    )}
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-primary hover:bg-primary/90 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]" 
                    disabled={loading || isLocked}
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isLocked ? `Locked (${Math.ceil(remainingTime)}s)` : 'Sign In'}
                  </Button>
                </form>

                <div className="mt-6 text-center">
                  <p className="text-slate-400 text-sm">
                    Don't have an account?{' '}
                    <button 
                      onClick={onShowRegistration}
                      className="text-primary hover:text-primary/80 font-semibold transition-colors"
                    >
                      Create Account
                    </button>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {/* Features Grid */}
      {!showLogin && (
        <section className="relative z-10 px-6 lg:px-12 pb-20">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h3 className="text-2xl lg:text-3xl font-black mb-4">
                Everything You Need to Manage Infrastructure Projects
              </h3>
              <p className="text-slate-400 max-w-2xl mx-auto">
                Comprehensive tools designed specifically for road construction and infrastructure management.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {features.map((feature, index) => (
                <div 
                  key={index}
                  className="group p-6 bg-slate-900/60 border border-white/5 rounded-[2.5rem] hover:border-primary/50 hover:bg-slate-800/50 transition-all duration-300"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-indigo-600/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h4 className="font-bold mb-2">{feature.title}</h4>
                  <p className="text-sm text-slate-400">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="relative z-10 px-6 lg:px-12 py-8 border-t border-slate-800">
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-4">
          <p className="text-sm text-slate-500">
            © {new Date().getFullYear()} RoadMaster Pro. Advanced Infrastructure Solutions.
          </p>
          <div className="flex items-center gap-6">
            <button className="text-sm text-slate-500 hover:text-slate-300 transition-colors">
              About
            </button>
            <button className="text-sm text-slate-500 hover:text-slate-300 transition-colors">
              Privacy
            </button>
            <button className="text-sm text-slate-500 hover:text-slate-300 transition-colors">
              Contact
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Homepage;
