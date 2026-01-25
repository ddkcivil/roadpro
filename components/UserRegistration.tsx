import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { UserPlus, Mail, Shield, Edit3, Upload, X, Save } from 'lucide-react';
import { 
  Avatar, 
  Box, 
  Typography, 
  Button, 
  Paper, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  TextField, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  IconButton,
  Chip,
  Stack,
  Alert
} from '@mui/material';

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
    
    if (!registrationForm.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!registrationForm.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[\w\.-]+@[\w\.-]+\.[a-zA-Z]{2,}$/.test(registrationForm.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (!registrationForm.password) {
      newErrors.password = 'Password is required';
    } else if (registrationForm.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    if (registrationForm.password !== registrationForm.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    if (registrationForm.phone && !/^\+?[1-9][\d\-\s]{8,}$/.test(registrationForm.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Check for existing user
    const existingUsers = localStorage.getItem('roadmaster-users');
    const users = existingUsers ? JSON.parse(existingUsers) : [];
    const isDuplicate = users.some((u: User) => u.email.toLowerCase() === registrationForm.email.toLowerCase());
    
    if (isDuplicate) {
      setErrors({ email: 'A user with this email already exists.' });
      return;
    }

    // Handle avatar - either uploaded file or generated from name
    let avatarUrl = '';
    if (previewUrl) {
      avatarUrl = previewUrl;
    } else {
      avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(registrationForm.name)}&background=random`;
    }

    // Create pending user entry
    const pendingUser = {
      id: `pending-${Date.now()}`,
      name: registrationForm.name,
      email: registrationForm.email,
      phone: registrationForm.phone,
      role: registrationForm.role,
      avatar: avatarUrl,
      status: 'pending',
      requestedRole: registrationForm.role,
      createdAt: new Date().toISOString(),
      requestedBy: 'self'
    };

    // Store in pending users
    const pendingUsersJson = localStorage.getItem('roadmaster-pending-users');
    const pendingUsers = pendingUsersJson ? JSON.parse(pendingUsersJson) : [];
    pendingUsers.push(pendingUser);
    localStorage.setItem('roadmaster-pending-users', JSON.stringify(pendingUsers));

    // Simulate sending email notification to admin
    console.log('Notification sent to admin for user approval:', pendingUser);

    setRegistrationSuccess(true);
    
    // Reset form
    setRegistrationForm({ 
      name: '', 
      email: '', 
      role: UserRole.SITE_ENGINEER, 
      phone: '', 
      password: '', 
      confirmPassword: '' 
    });
    setAvatarFile(null);
    setPreviewUrl(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      
      // Create a preview URL for the selected image
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearAvatar = () => {
    setAvatarFile(null);
    setPreviewUrl(null);
  };

  if (registrationSuccess) {
    return (
      <Box sx={{ height: 'calc(100vh - 140px)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', p: 2 }}>
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', maxWidth: 500, width: '100%', borderRadius: 4 }}>
          <UserPlus size={64} className="mx-auto text-green-500 mb-4" />
          <Typography variant="h5" fontWeight="bold" gutterBottom>
            Registration Submitted
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            Your account registration has been submitted successfully.
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            An administrator will review your request and approve your account.
            You will receive an email notification once your account is approved.
          </Typography>
          <Button 
            variant="contained" 
            onClick={() => setRegistrationSuccess(false)}
            sx={{ mt: 2, px: 3, py: 1 }}
          >
            Register Another Account
          </Button>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ height: 'calc(100vh - 140px)', overflowY: 'auto', p: 2 }}>
      <Box mb={3}>
        <Typography variant="h5" fontWeight="900">Create Account</Typography>
        <Typography variant="body2" color="text.secondary">Register for a new RoadMaster Pro account</Typography>
      </Box>

      <Paper variant="outlined" sx={{ p: 3, borderRadius: 4, maxWidth: 600, mx: 'auto' }}>
        <Box component="form" onSubmit={handleRegister} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center" mb={2}>
            <Avatar 
              src={previewUrl || undefined} 
              sx={{ width: 64, height: 64, bgcolor: 'slate.200', color: 'slate.600', fontWeight: 'bold', fontSize: 12 }}
            >
              {registrationForm.name ? registrationForm.name.charAt(0) : 'U'}
            </Avatar>
            <Box>
              <Button 
                variant="outlined" 
                component="label" 
                startIcon={<Upload size={16} />}
                sx={{ borderRadius: 2, mr: 1 }}
              >
                Upload Photo
                <input 
                  type="file" 
                  hidden 
                  accept="image/*" 
                  onChange={handleFileChange}
                />
              </Button>
              {avatarFile && (
                <IconButton 
                  size="small" 
                  onClick={clearAvatar}
                  sx={{ color: 'error.main', ml: 1 }}
                >
                  <X size={16} />
                </IconButton>
              )}
              <Typography variant="caption" color="text.secondary">
                JPG, PNG, Max 5MB
              </Typography>
            </Box>
          </Stack>
          
          <TextField 
            required
            label="Full Name" 
            fullWidth 
            value={registrationForm.name} 
            onChange={e => setRegistrationForm({...registrationForm, name: e.target.value})} 
            margin="normal"
            error={!!errors.name}
            helperText={errors.name}
          />
          <TextField 
            required
            label="Email" 
            type="email" 
            fullWidth 
            value={registrationForm.email} 
            onChange={e => setRegistrationForm({...registrationForm, email: e.target.value})} 
            margin="normal"
            error={!!errors.email}
            helperText={errors.email}
          />
          <TextField 
            required
            label="Password" 
            type="password" 
            fullWidth 
            value={registrationForm.password} 
            onChange={e => setRegistrationForm({...registrationForm, password: e.target.value})} 
            margin="normal"
            error={!!errors.password}
            helperText={errors.password}
          />
          <TextField 
            required
            label="Confirm Password" 
            type="password" 
            fullWidth 
            value={registrationForm.confirmPassword} 
            onChange={e => setRegistrationForm({...registrationForm, confirmPassword: e.target.value})} 
            margin="normal"
            error={!!errors.confirmPassword}
            helperText={errors.confirmPassword}
          />
          <TextField 
            label="Phone" 
            fullWidth 
            value={registrationForm.phone} 
            onChange={e => setRegistrationForm({...registrationForm, phone: e.target.value})} 
            margin="normal"
            error={!!errors.phone}
            helperText={errors.phone}
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Request Role</InputLabel>
            <Select 
              value={registrationForm.role} 
              label="Request Role"
              onChange={e => setRegistrationForm({...registrationForm, role: e.target.value as UserRole})}
            >
              {Object.values(UserRole).map(role => (
                <MenuItem key={role} value={role}>{role}</MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Note:</strong> Your registration will be reviewed by an administrator. 
              You will receive an email notification when your account is approved.
            </Typography>
          </Alert>
          
          <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
            <Button 
              variant="outlined" 
              onClick={() => {
                setRegistrationForm({ 
                  name: '', 
                  email: '', 
                  role: UserRole.SITE_ENGINEER, 
                  phone: '', 
                  password: '', 
                  confirmPassword: '' 
                });
                setAvatarFile(null);
                setPreviewUrl(null);
              }}
              sx={{ flex: 1, px: 2, py: 1 }}
            >
              Clear
            </Button>
            <Button 
              variant="contained" 
              type="submit"
              startIcon={<UserPlus size={16} />}
              sx={{ flex: 1, px: 2, py: 1 }}
            >
              Submit Registration
            </Button>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default UserRegistration;