import React, { useState } from 'react';
import { UserRole } from '../../types';
import { UserPlus, Upload, X, Eye, EyeOff, Fingerprint, Mail, Lock, User, Phone, ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';

import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert';
import { apiService } from '../../services/api/apiService';
import { cn } from '~/lib/utils';
import { useAvatarUpload } from '~/hooks/useAvatarUpload';

interface UserRegistrationProps {
  onBackToLogin?: () => void;
}

const UserRegistration: React.FC<UserRegistrationProps> = ({ onBackToLogin }) => {
  const [registrationForm, setRegistrationForm] = useState({ 
    name: '', 
    email: '', 
    role: UserRole.SITE_ENGINEER as UserRole,
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const { 
    avatarFile, 
    previewUrl, 
    handleFileChange, 
    clearAvatar, 
    reset: resetAvatar 
  } = useAvatarUpload();
  
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!registrationForm.name.trim()) { newErrors.name = 'Name is required'; }
    if (!registrationForm.email.trim()) { newErrors.email = 'Email is required'; } 
    else if (!/^[\w\.-]+@[\w\.-]+\.[a-zA-Z]{2,}$/.test(registrationForm.email)) { newErrors.email = 'Please enter a valid email address'; }
    
    if (!registrationForm.password) { newErrors.password = 'Password is required'; } 
    else if (registrationForm.password.length < 6) { newErrors.password = 'Password must be at least 6 characters'; }
    
    if (registrationForm.password !== registrationForm.confirmPassword) { newErrors.confirmPassword = 'Passwords do not match'; }
    
    if (registrationForm.phone && !/^\+?[1-9][\d\-\s]{8,}$/.test(registrationForm.phone)) { newErrors.phone = 'Please enter a valid phone number'; }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) { return; }

    setLoading(true);
    try {
      await apiService.submitRegistration({
        name: registrationForm.name,
        email: registrationForm.email,
        phone: registrationForm.phone,
        password: registrationForm.password,
        requestedRole: registrationForm.role
      });
      setRegistrationSuccess(true);
      setRegistrationForm({ 
        name: '', email: '', role: UserRole.SITE_ENGINEER, 
        phone: '', password: '', confirmPassword: '' 
      });
      resetAvatar();
    } catch (error: any) {
      setErrors({ email: error.message || 'Registration failed' });
    } finally {
      setLoading(false);
    }
  };

  if (registrationSuccess) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center p-6 relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        <Card className="relative z-10 bg-slate-900/80 border-slate-800 backdrop-blur-xl p-8 text-center max-w-lg w-full rounded-[2rem] shadow-2xl">
          <div className="w-20 h-20 bg-emerald-500/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <UserPlus className="text-emerald-500 h-10 w-10" />
          </div>
          <h2 className="text-3xl font-black tracking-tight mb-4 uppercase italic">Registration Submitted</h2>
          <p className="text-slate-400 font-medium mb-6">Your account registration has been submitted successfully and is awaiting review.</p>
          <div className="bg-slate-800/50 rounded-2xl p-6 mb-8 text-sm text-slate-300 leading-relaxed text-left border border-slate-700/50">
            <p className="mb-3">
              <span className="text-primary font-bold">What happens next?</span> An administrator will review your request and verify your credentials.
            </p>
            <p>
              You will receive an email notification once your account is approved. After that, you'll be able to sign in and access the platform.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            {onBackToLogin && (
              <Button onClick={onBackToLogin} className="w-full bg-primary hover:bg-primary/90 h-12 font-bold rounded-xl">
                Return to Login
              </Button>
            )}
            <Button variant="ghost" onClick={() => setRegistrationSuccess(false)} className="text-slate-400 hover:text-white">
              Register Another Account
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-6 relative overflow-x-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 z-0 opacity-50">
        <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/4 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto">
        {/* Header */}
        <header className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <Fingerprint className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">RoadMaster <span className="text-primary">Pro</span></h1>
              <p className="text-[10px] text-muted-foreground font-medium tracking-widest uppercase">Infrastructure Management</p>
            </div>
          </div>
          {onBackToLogin && (
            <Button variant="ghost" onClick={onBackToLogin} className="text-muted-foreground hover:text-foreground font-bold gap-2">
              <ArrowLeft className="h-4 w-4" /> Back to Login
            </Button>
          )}
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 items-start">
          <div className="lg:col-span-2 space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-muted rounded-full border">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">New Account Registration</span>
            </div>
            <h2 className="text-4xl lg:text-5xl font-black tracking-tighter leading-tight uppercase">
              Join the <br /> <span className="text-primary">Pro</span> Platform
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Create your account to access the industry-leading infrastructure management suite. 
              Real-time telemetry, GIS integration, and project analytics.
            </p>
            
            <ul className="space-y-4 pt-4">
              {[
                'Access high-fidelity GIS mapping',
                'Manage complex BOQ structures',
                'Real-time field reporting & RFIs',
                'Advanced project scheduling (CPM)'
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-foreground font-medium">
                  <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                  </div>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <Card className="lg:col-span-3 bg-card border shadow-lg rounded-3xl overflow-hidden">
            <CardContent className="p-8 lg:p-10">
              <form onSubmit={handleRegister} className="space-y-6">
                <div className="flex flex-col sm:flex-row items-center gap-6 mb-8 bg-muted/50 p-6 rounded-2xl border">
                  <div className="relative group">
                    <Avatar className="w-24 h-24 rounded-2xl border-4 border-background shadow-md">
                      <AvatarImage src={previewUrl || undefined} />
                      <AvatarFallback className="bg-muted text-muted-foreground font-black text-2xl">
                        {registrationForm.name ? registrationForm.name.charAt(0) : <User />}
                      </AvatarFallback>
                    </Avatar>
                    <label 
                      htmlFor="avatar-upload" 
                      className="absolute -bottom-2 -right-2 w-10 h-10 bg-primary hover:bg-primary/90 rounded-full flex items-center justify-center cursor-pointer shadow-lg transition-transform hover:scale-105"
                    >
                      <Upload className="h-5 w-5 text-primary-foreground" />
                      <input id="avatar-upload" type="file" className="sr-only" accept="image/*" onChange={handleFileChange} />
                    </label>
                  </div>
                  <div className="text-center sm:text-left">
                    <h4 className="font-bold uppercase tracking-tight text-lg">Profile Identity</h4>
                    <p className="text-sm text-muted-foreground mb-2">Upload a professional photo for your ID.</p>
                    {avatarFile && (
                      <Button variant="ghost" size="sm" onClick={clearAvatar} className="h-8 text-destructive hover:text-destructive/80 hover:bg-destructive/10 px-0">
                        <X className="mr-1 h-3 w-3" /> Remove image
                      </Button>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Full Name</Label>
                    <Input 
                      id="name" 
                      value={registrationForm.name} 
                      onChange={e => setRegistrationForm({...registrationForm, name: e.target.value})} 
                      className="h-11 rounded-xl"
                      placeholder="John Doe"
                    />
                    {errors.name && <p className="text-destructive text-[10px] font-bold uppercase ml-1">{errors.name}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Work Email</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      value={registrationForm.email} 
                      onChange={e => setRegistrationForm({...registrationForm, email: e.target.value})} 
                      className="h-11 rounded-xl"
                      placeholder="john@company.com"
                    />
                    {errors.email && <p className="text-destructive text-[10px] font-bold uppercase ml-1">{errors.email}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Secure Password</Label>
                    <div className="relative">
                      <Input 
                        id="password" 
                        type={showPassword ? "text" : "password"} 
                        value={registrationForm.password} 
                        onChange={e => setRegistrationForm({...registrationForm, password: e.target.value})} 
                        className="h-11 rounded-xl pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.password && <p className="text-destructive text-[10px] font-bold uppercase ml-1">{errors.password}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Confirm Access</Label>
                    <div className="relative">
                      <Input 
                        id="confirmPassword" 
                        type={showConfirmPassword ? "text" : "password"} 
                        value={registrationForm.confirmPassword} 
                        onChange={e => setRegistrationForm({...registrationForm, confirmPassword: e.target.value})} 
                        className="h-11 rounded-xl pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.confirmPassword && <p className="text-destructive text-[10px] font-bold uppercase ml-1">{errors.confirmPassword}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Contact Phone</Label>
                    <Input 
                      id="phone" 
                      value={registrationForm.phone} 
                      onChange={e => setRegistrationForm({...registrationForm, phone: e.target.value})} 
                      className="h-11 rounded-xl"
                      placeholder="+1 (555) 000-0000"
                    />
                    {errors.phone && <p className="text-destructive text-[10px] font-bold uppercase ml-1">{errors.phone}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role" className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Requested Role</Label>
                    <Select value={registrationForm.role} onValueChange={(value: UserRole) => setRegistrationForm({...registrationForm, role: value})}>
                      <SelectTrigger className="h-11 rounded-xl">
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(UserRole).map(role => (
                          <SelectItem key={role} value={role}>{role}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 flex gap-4 mt-6">
                  <div className="h-10 w-10 shrink-0 bg-primary/20 rounded-xl flex items-center justify-center">
                    <ArrowRight className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h5 className="text-sm font-bold uppercase text-primary tracking-tight">Access Control Protocol</h5>
                    <p className="text-xs text-muted-foreground leading-normal">
                      Credentials will be vetted by central administration. Approval normally takes 2-4 business hours.
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-4 pt-4">
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => {
                      setRegistrationForm({ 
                        name: '', email: '', role: UserRole.SITE_ENGINEER, 
                        phone: '', password: '', confirmPassword: '' 
                      });
                      resetAvatar();
                    }} 
                    className="flex-1 h-14 rounded-2xl font-bold"
                  >
                    Reset
                  </Button>
                  <Button 
                    type="submit" 
                    className="flex-[2] h-14 rounded-2xl font-bold shadow-lg shadow-primary/20"
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                    Submit Application
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
        
        <footer className="mt-20 py-8 border-t text-center">
          <p className="text-xs text-muted-foreground font-medium">
            © {new Date().getFullYear()} RoadMaster Pro. Enterprise Infrastructure Management.
          </p>
        </footer>
      </div>
    </div>
  );
};

export default UserRegistration;
