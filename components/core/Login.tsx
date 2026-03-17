import React, { useState, useEffect } from 'react';
import { UserRole } from '../../types';
import { PermissionsService } from '../../services/auth/permissionsService';
import { validateEmail } from '../../utils/validation/validationUtils';
import { AuthService } from '../../services/auth/authService';
import { AuditService } from '../../services/analytics/auditService';
import { apiService } from '../../services/api/apiService';
import { ArrowLeft, Mail, Lock, Fingerprint, Loader2 } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Alert, AlertDescription } from '~/components/ui/alert';
import { cn } from '~/lib/utils';
import { z } from 'zod';
import { ErrorSummary } from '~/components/ui/error-summary';
import { useRateLimit } from '~/hooks/useRateLimit';
import { toast } from 'sonner';

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

interface Props {
  onLogin: (role: UserRole, name: string, token?: string, userId?: string, phone?: string) => void;
  onShowRegistration: () => void;
}

const Login: React.FC<Props> = ({ onLogin, onShowRegistration }) => {
  const [view, setView] = useState<'LOGIN' | 'RESET'>('LOGIN');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{type: 'default' | 'destructive', text: string} | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { isLocked, remainingTime, checkLimit } = useRateLimit({
    limit: 5,
    windowMs: 60000 // 1 minute
  });

  useEffect(() => {
    setErrors({});
    setMessage(null);
  }, [view]);

  // Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Reset State
  const [resetEmail, setResetEmail] = useState('');

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
        err.issues.forEach((e: z.ZodIssue) => {
          if (e.path[0]) newErrors[e.path[0].toString()] = e.message;
        });
        setErrors(newErrors);
        return;
      }
    }

    setLoading(true);
    
    if (AuthService.isAccountLocked(email)) {
        const timeRemaining = AuthService.getTimeUntilUnlock(email);
        const minutes = Math.ceil((timeRemaining || 0) / 60000);
        setMessage({ type: 'destructive', text: `Account temporarily locked. Please try again in ${minutes} minute${minutes !== 1 ? 's' : ''}.` });
        setLoading(false);
        return;
    }
    
    try {
        const authResult = await apiService.loginUser(email, password);
        
        if (authResult.success) {
            const user = authResult.user;
            const role = user?.role || UserRole.PROJECT_MANAGER;
            const name = user?.name || "Project Manager";
            const token = (authResult as any).token;
            const userId = user?.id;
            
            const userWithPermissions = PermissionsService.createUserWithPermissions({ 
              id: userId || `user-${Date.now()}`, 
              name, 
              email, 
              phone: user?.phone || '', 
              role 
            });
            
            await AuditService.logLogin(userWithPermissions.id, userWithPermissions.name);
            onLogin(role, name, token, userId, user?.phone);
        } else {
            setMessage({ type: 'destructive', text: authResult.message || 'Invalid email or password.' });
        }
    } catch (error: any) {
        setMessage({ type: 'destructive', text: error.message || 'An error occurred during authentication. Please try again.' });
    } finally {
        setLoading(false);
    }
  };

  const handleReset = (e: React.FormEvent) => {
      e.preventDefault();
      
      if (!validateEmail(resetEmail)) {
          setMessage({ type: 'destructive', text: 'Please enter a valid email address.' });
          return;
      }
      
      setLoading(true);
      setTimeout(() => {
          setLoading(false);
          setMessage({ type: 'default', text: `Verification link dispatched to ${resetEmail}` });
          setTimeout(() => setView('LOGIN'), 3000);
      }, 1200);
  };

  return (
    <div className="min-h-screen bg-muted flex items-center justify-center p-4 relative overflow-hidden safe-pt safe-pb">
      <div className="absolute top-[10%] left-[15%] w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-[10%] right-[15%] w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-3xl" />

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-6 sm:mb-8 text-center">
          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-sm border border-slate-100">
            <Fingerprint className="h-7 w-7 sm:h-8 sm:w-8 text-primary" strokeWidth={1.5} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            RoadMaster <span className="text-primary">Pro</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 font-medium">
            Infrastructure Management System
          </p>
        </div>

        <Card className="rounded-[2rem] shadow-lg border-slate-200/50 overflow-hidden">
          <CardContent className="p-6 sm:p-8">
            <ErrorSummary 
              errors={errors} 
              className="mb-4" 
              onClear={() => setErrors({})} 
            />
            
            {message && (
                <Alert variant={message.type} className="mb-4">
                    <AlertDescription>{message.text}</AlertDescription>
                </Alert>
            )}

            {view === 'LOGIN' && (
              <form onSubmit={handleLogin}>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <h2 className="text-xl font-bold text-foreground">Sign In</h2>
                    <p className="text-sm text-muted-foreground">Enter your professional credentials</p>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email" className={cn(errors.email && "text-destructive")}>Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input id="email" type="email" placeholder="email@example.com" value={email} onChange={e => setEmail(e.target.value)} className={cn("pl-10", errors.email && "border-destructive")} />
                    </div>
                    {errors.email && <p className="text-[10px] text-destructive font-medium">{errors.email}</p>}
                  </div>
                  <div className="grid gap-2">
                    <div className="flex items-center">
                      <Label htmlFor="password" className={cn(errors.password && "text-destructive")}>Password</Label>
                      <button type="button" onClick={() => setView('RESET')} className="ml-auto inline-block text-sm font-medium text-primary hover:text-primary underline-offset-4 hover:underline">
                        Forgot Password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} className={cn("pl-10", errors.password && "border-destructive")} />
                    </div>
                    {errors.password && <p className="text-[10px] text-destructive font-medium">{errors.password}</p>}
                  </div>
                  <Button type="submit" className="w-full" disabled={loading || isLocked}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isLocked ? `Locked (${Math.ceil(remainingTime)}s)` : 'Continue'}
                  </Button>

                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-slate-200" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-2 text-muted-foreground font-bold">Troubleshooting</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      className="text-[10px] h-8 font-bold border-indigo-100 text-indigo-600 hover:bg-indigo-50"
                      onClick={() => {
                        setEmail('admin@roadmaster.os');
                        setPassword('admin123');
                        toast.info("Admin credentials loaded. Click Continue.");
                      }}
                    >
                      Admin Demo
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      className="text-[10px] h-8 font-bold border-red-100 text-red-600 hover:bg-red-50"
                      onClick={() => {
                        if (confirm("This will clear all local browser data and log you out. Continue?")) {
                          localStorage.clear();
                          window.location.reload();
                        }
                      }}
                    >
                      Reset Local App
                    </Button>
                  </div>

                  <p className="px-8 text-center text-sm text-muted-foreground">
                    Need access?{' '}
                    <button type="button" onClick={onShowRegistration} className="font-semibold text-primary hover:text-primary underline-offset-4 hover:underline">
                      Create Account
                    </button>
                  </p>
                </div>
              </form>
            )}

            {view === 'RESET' && (
              <form onSubmit={handleReset}>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <h2 className="text-xl font-bold text-foreground">Account Recovery</h2>
                    <p className="text-sm text-muted-foreground">Enter your email to receive a recovery link</p>
                  </div>
                   <div className="grid gap-2">
                    <Label htmlFor="reset-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input id="reset-email" type="email" placeholder="email@example.com" required value={resetEmail} onChange={e => setResetEmail(e.target.value)} className="pl-10" />
                    </div>
                  </div>
                   <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Recover Account
                  </Button>
                  <Button variant="ghost" size="sm" type="button" onClick={() => setView('LOGIN')}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Login
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground font-medium">
          &copy; {new Date().getFullYear()} RoadMaster OS. Advanced Infrastructure Solutions.
        </p>
      </div>
    </div>
  );
};

export default Login;
