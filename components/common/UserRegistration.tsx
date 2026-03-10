import React, { useState } from 'react';
import { UserRole } from '../../types';
import { UserPlus, Upload, X } from 'lucide-react';

import { Button } from '~/components/ui/button';
import { Card } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert';
import { apiService } from '../../services/api/apiService';


// NOTE: This is a refactored version of the UserRegistration component.
// The original logic has been temporarily removed to facilitate the UI migration.
// It will be re-implemented in subsequent steps.

const UserRegistration: React.FC = () => {
  const [registrationForm, setRegistrationForm] = useState({ 
    name: '', 
    email: '', 
    role: UserRole.SITE_ENGINEER as UserRole,
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

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
      setAvatarFile(null);
      setPreviewUrl(null);
    } catch (error: any) {
      setErrors({ email: error.message || 'Registration failed' });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => { setPreviewUrl(reader.result as string); };
      reader.readAsDataURL(file);
    }
  };

  const clearAvatar = () => {
    setAvatarFile(null);
    setPreviewUrl(null);
  };

  if (registrationSuccess) {
    return (
      <div className="min-h-[calc(100vh-140px)] flex flex-col justify-center items-center p-4">
        <Card className="p-6 text-center max-w-lg w-full rounded-2xl">
          <UserPlus className="mx-auto text-green-500 mb-4 h-16 w-16" />
          <h2 className="text-2xl font-bold mb-2">Registration Submitted</h2>
          <p className="text-muted-foreground mb-4">Your account registration has been submitted successfully.</p>
          <p className="text-sm text-muted-foreground mb-4">
            An administrator will review your request and approve your account.
            You will receive an email notification once your account is approved.
          </p>
          <Button onClick={() => setRegistrationSuccess(false)} className="mt-4">
            Register Another Account
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 overflow-y-auto min-h-[calc(100vh-140px)]">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Create Account</h1>
        <p className="text-sm text-muted-foreground">Register for a new RoadMaster Pro account</p>
      </div>

      <Card className="p-6 rounded-2xl max-w-2xl mx-auto">
        <form onSubmit={handleRegister} className="grid gap-4">
          <div className="flex items-center gap-4 mb-4">
            <Avatar className="w-16 h-16">
              <AvatarImage src={previewUrl || undefined} />
              <AvatarFallback>{registrationForm.name ? registrationForm.name.charAt(0) : 'U'}</AvatarFallback>
            </Avatar>
            <div className="grid gap-1">
              <Button variant="outline" size="sm" asChild>
                <Label htmlFor="avatar-upload">
                  <Upload className="mr-2 h-4 w-4" /> Upload Photo
                </Label>
              </Button>
              <Input id="avatar-upload" type="file" className="sr-only" accept="image/*" onChange={handleFileChange} />
              {avatarFile && (
                <Button variant="ghost" size="sm" onClick={clearAvatar}>
                  <X className="mr-2 h-4 w-4" /> Clear Photo
                </Button>
              )}
              <p className="text-xs text-muted-foreground">JPG, PNG, Max 5MB</p>
            </div>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">Full Name</Label>
            <Input id="name" value={registrationForm.name} onChange={e => setRegistrationForm({...registrationForm, name: e.target.value})} className="col-span-3" />
            {errors.name && <p className="col-start-2 col-span-3 text-sm text-red-500">{errors.name}</p>}
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="email" className="text-right">Email</Label>
            <Input id="email" type="email" value={registrationForm.email} onChange={e => setRegistrationForm({...registrationForm, email: e.target.value})} className="col-span-3" />
            {errors.email && <p className="col-start-2 col-span-3 text-sm text-red-500">{errors.email}</p>}
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="password" className="text-right">Password</Label>
            <Input id="password" type="password" value={registrationForm.password} onChange={e => setRegistrationForm({...registrationForm, password: e.target.value})} className="col-span-3" />
            {errors.password && <p className="col-start-2 col-span-3 text-sm text-red-500">{errors.password}</p>}
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="confirmPassword" className="text-right">Confirm Password</Label>
            <Input id="confirmPassword" type="password" value={registrationForm.confirmPassword} onChange={e => setRegistrationForm({...registrationForm, confirmPassword: e.target.value})} className="col-span-3" />
            {errors.confirmPassword && <p className="col-start-2 col-span-3 text-sm text-red-500">{errors.confirmPassword}</p>}
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="phone" className="text-right">Phone</Label>
            <Input id="phone" value={registrationForm.phone} onChange={e => setRegistrationForm({...registrationForm, phone: e.target.value})} className="col-span-3" />
            {errors.phone && <p className="col-start-2 col-span-3 text-sm text-red-500">{errors.phone}</p>}
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="role" className="text-right">Request Role</Label>
            <Select value={registrationForm.role} onValueChange={(value: UserRole) => setRegistrationForm({...registrationForm, role: value})}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(UserRole).map(role => (
                  <SelectItem key={role} value={role}>{role}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <Alert className="mt-4">
            <AlertTitle>Important Note</AlertTitle>
            <AlertDescription>
              Your registration will be reviewed by an administrator. You will receive an email notification when your account is approved.
            </AlertDescription>
          </Alert>
          
          <div className="flex gap-2 mt-4">
            <Button variant="outline" onClick={() => {
                setRegistrationForm({ 
                  name: '', email: '', role: UserRole.SITE_ENGINEER, 
                  phone: '', password: '', confirmPassword: '' 
                });
                setAvatarFile(null);
                setPreviewUrl(null);
              }} className="flex-1"
            >
              Clear
            </Button>
            <Button type="submit" className="flex-1">
              <UserPlus className="mr-2 h-4 w-4" />
              Submit Registration
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default UserRegistration;
