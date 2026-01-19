import React, { useState } from 'react';
import { UserRole, UserWithPermissions } from '../types';
import { PermissionsService } from '../services/permissionsService';
import { validatePasswordStrength, validateEmail } from '../utils/validationUtils';
import { AuthService } from '../services/authService';
import { AuditService } from '../services/auditService';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  TextField, 
  Button, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel, 
  Alert,
  Link,
  Container,
  InputAdornment,
  Fade,
  Chip,
  Stack,
  IconButton,
  CircularProgress
} from '@mui/material';
import { UserPlus, ArrowLeft, Mail, Lock, User, Briefcase, ChevronRight, Fingerprint } from 'lucide-react';

interface Props {
  onLogin: (role: UserRole, name: string) => void;
}

const Login: React.FC<Props> = ({ onLogin }) => {
  const [view, setView] = useState<'LOGIN' | 'REGISTER' | 'RESET'>('LOGIN');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  // Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordStrength, setPasswordStrength] = useState<{score: number, isValid: boolean, feedback: string[]} | null>(null);

  // Register State
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPasswordStrength, setRegPasswordStrength] = useState<{score: number, isValid: boolean, feedback: string[]} | null>(null);
  const [regRole, setRegRole] = useState<UserRole>(UserRole.SITE_ENGINEER);

  // Reset State
  const [resetEmail, setResetEmail] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    
    // Check if account is locked before proceeding
    if (AuthService.isAccountLocked(email)) {
        const timeRemaining = AuthService.getTimeUntilUnlock(email);
        const minutes = Math.ceil((timeRemaining || 0) / 60000);
        setMessage({ type: 'error', text: `Account temporarily locked. Please try again in ${minutes} minute${minutes !== 1 ? 's' : ''}.` });
        setLoading(false);
        return;
    }
    
    try {
        // Authenticate using the auth service
        const authResult = await AuthService.authenticate(email, password);
        
        if (authResult.success) {
            let role = UserRole.PROJECT_MANAGER;
            let name = "Project Manager";
            const emailLower = email.toLowerCase();
            if (emailLower.includes('admin')) { role = UserRole.ADMIN; name = "Administrator"; }
            else if (emailLower.includes('site')) { role = UserRole.SITE_ENGINEER; name = "Site Engineer"; }
            else if (emailLower.includes('lab')) { role = UserRole.LAB_TECHNICIAN; name = "Lab Tech"; }
            else if (emailLower.includes('super')) { role = UserRole.SUPERVISOR; name = "Supervisor"; }
            
            // Create user with permissions and pass to onLogin
            const userWithPermissions = PermissionsService.createUserWithPermissions({ id: '', name, email, phone: '', role });
            
            // Log the successful login
            AuditService.logLogin(userWithPermissions.id, userWithPermissions.name);
            
            onLogin(role, name);
        } else {
            setMessage({ type: 'error', text: authResult.message || 'Invalid email or password.' });
        }
    } catch (error) {
        setMessage({ type: 'error', text: 'An error occurred during authentication. Please try again.' });
    } finally {
        setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
      e.preventDefault();
      
      // Validate password strength
      if (regPassword.length > 0) {
          const passwordStrength = validatePasswordStrength(regPassword);
          if (!passwordStrength.isValid) {
              setMessage({ type: 'error', text: 'Password does not meet security requirements. ' + passwordStrength.feedback.join(', ') });
              return;
          }
      }
      
      setLoading(true);
      try {
          // Simulate registration
          await new Promise(resolve => setTimeout(resolve, 1200));
          setLoading(false);
          setMessage({ type: 'success', text: 'Registration successful! Please login.' });
          setView('LOGIN');
          setEmail(regEmail);
      } catch (error) {
          setLoading(false);
          setMessage({ type: 'error', text: 'Registration failed. Please try again.' });
      }
  };

  const handleReset = (e: React.FormEvent) => {
      e.preventDefault();
      
      // Validate email format
      if (!validateEmail(resetEmail)) {
          setMessage({ type: 'error', text: 'Please enter a valid email address.' });
          return;
      }
      
      setLoading(true);
      setTimeout(() => {
          setLoading(false);
          setMessage({ type: 'success', text: `Verification link dispatched to ${resetEmail}` });
          setTimeout(() => setView('LOGIN'), 3000);
      }, 1200);
  };



  return (
    <Box sx={{ 
        minHeight: '100vh', 
        bgcolor: '#f8fafc',
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        p: 2,
        position: 'relative',
        overflow: 'hidden'
    }}>
      {/* Subtle modern background accents */}
      <Box sx={{ position: 'absolute', top: '10%', left: '15%', width: 500, height: 500, bgcolor: 'rgba(99, 102, 241, 0.03)', borderRadius: '50%', filter: 'blur(100px)' }} />
      <Box sx={{ position: 'absolute', bottom: '10%', right: '15%', width: 400, height: 400, bgcolor: 'rgba(168, 85, 247, 0.03)', borderRadius: '50%', filter: 'blur(100px)' }} />

      <Container maxWidth="sm" sx={{ position: 'relative', zIndex: 1 }}>
        {/* Fix: Wrapped Fade child in a div for strict MUI compatibility */}
        <Fade in={true} timeout={1000}>
            <div>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    
                    {/* Minimalist Logo Header */}
                    <Box sx={{ mb: 6, textAlign: 'center' }}>
                        <Box sx={{ 
                            width: 56, 
                            height: 56, 
                            bgcolor: 'white',
                            borderRadius: '16px', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            mx: 'auto', 
                            mb: 2,
                            boxShadow: '0 4px 20px -5px rgba(0,0,0,0.1)',
                            border: '1px solid #f1f5f9'
                        }}>
                            <Fingerprint size={28} className="text-indigo-600" strokeWidth={1.5} />
                        </Box>
                        <Typography variant="h4" fontWeight="800" color="#0f172a" letterSpacing="-0.04em">
                            RoadMaster <span className="text-indigo-600">Pro</span>
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#64748b', mt: 1, fontWeight: 500 }}>
                            Infrastructure Management System
                        </Typography>
                    </Box>

                    <Card sx={{ 
                        borderRadius: '24px', 
                        width: '100%',
                        maxWidth: '440px',
                        overflow: 'hidden', 
                        boxShadow: '0 20px 50px -12px rgba(0, 0, 0, 0.08)', 
                        bgcolor: 'white',
                        border: '1px solid #f1f5f9'
                    }}>
                        <CardContent sx={{ p: { xs: 4, sm: 6 } }}>
                            {message && (
                                <Alert 
                                    severity={message.type} 
                                    sx={{ mb: 4, borderRadius: '12px', border: 'none', bgcolor: message.type === 'success' ? '#f0fdf4' : '#fef2f2', color: message.type === 'success' ? '#166534' : '#991b1b' }}
                                >
                                    {message.text}
                                </Alert>
                            )}

                            {/* LOGIN VIEW */}
                            {view === 'LOGIN' && (
                                <form onSubmit={handleLogin}>
                                    <Stack spacing={3}>
                                        <Box>
                                            <Typography variant="h6" fontWeight="700" color="#1e293b">Sign In</Typography>
                                            <Typography variant="caption" color="text.secondary">Enter your professional credentials</Typography>
                                        </Box>

                                        <TextField 
                                            placeholder="Email Address" 
                                            type="email" 
                                            fullWidth 
                                            required 
                                            value={email} 
                                            onChange={e => setEmail(e.target.value)} 
                                            variant="outlined"
                                            InputProps={{
                                                startAdornment: <InputAdornment position="start"><Mail size={18} className="text-slate-400"/></InputAdornment>,
                                            }}
                                            sx={{ 
                                                '& .MuiOutlinedInput-root': { 
                                                    borderRadius: '12px',
                                                    bgcolor: '#f8fafc',
                                                    '& fieldset': { borderColor: '#e2e8f0' },
                                                    '&:hover fieldset': { borderColor: '#cbd5e1' }
                                                } 
                                            }}
                                        />

                                        <Box>
                                            <TextField 
                                                placeholder="Password" 
                                                type="password" 
                                                fullWidth 
                                                required 
                                                value={password} 
                                                onChange={e => {
                                                    const newPassword = e.target.value;
                                                    setPassword(newPassword);
                                                    if (newPassword.length > 0) {
                                                        const strength = validatePasswordStrength(newPassword);
                                                        setPasswordStrength(strength);
                                                    } else {
                                                        setPasswordStrength(null);
                                                    }
                                                }} 
                                                InputProps={{
                                                    startAdornment: <InputAdornment position="start"><Lock size={18} className="text-slate-400"/></InputAdornment>,
                                                }}
                                                sx={{ 
                                                    '& .MuiOutlinedInput-root': { 
                                                        borderRadius: '12px',
                                                        bgcolor: '#f8fafc',
                                                        '& fieldset': { borderColor: '#e2e8f0' },
                                                        '&:hover fieldset': { borderColor: '#cbd5e1' }
                                                    } 
                                                }}
                                            />
                                            {passwordStrength && passwordStrength.feedback.length > 0 && (
                                                <Box mt={1}>
                                                    {passwordStrength.feedback.map((msg, idx) => (
                                                        <Typography key={idx} variant="caption" color="error.main" display="block">
                                                            • {msg}
                                                        </Typography>
                                                    ))}
                                                </Box>
                                            )}
                                            <Box textAlign="right" mt={1}>
                                                <Link component="button" type="button" onClick={() => setView('RESET')} underline="none" sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#6366f1', '&:hover': { color: '#4f46e5' } }}>
                                                    Forgot Password?
                                                </Link>
                                            </Box>
                                        </Box>

                                        <Button 
                                            type="submit" 
                                            variant="contained" 
                                            size="large" 
                                            fullWidth 
                                            disabled={loading}
                                            endIcon={loading ? <CircularProgress size={16} color="inherit" /> : <ChevronRight size={18} />}
                                            sx={{ 
                                                py: 1.8, 
                                                borderRadius: '12px', 
                                                bgcolor: '#0f172a', 
                                                boxShadow: 'none',
                                                '&:hover': { bgcolor: '#1e293b', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }
                                            }}
                                        >
                                            {loading ? 'Authenticating' : 'Continue'}
                                        </Button>

                                        <Box textAlign="center" pt={1}>
                                            <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.8rem' }}>
                                                Need access? {' '}
                                                <Link component="button" type="button" onClick={() => setView('REGISTER')} fontWeight="700" underline="none" sx={{ color: '#6366f1' }}>
                                                    Create Account
                                                </Link>
                                            </Typography>
                                        </Box>
                                    </Stack>
                                </form>
                            )}

                            {/* REGISTER VIEW */}
                            {view === 'REGISTER' && (
                                <form onSubmit={handleRegister}>
                                    <Stack spacing={3}>
                                        <Box>
                                            <Typography variant="h6" fontWeight="700" color="#1e293b">Create Account</Typography>
                                            <Typography variant="caption" color="text.secondary">Join the project management workforce</Typography>
                                        </Box>

                                        <TextField 
                                            placeholder="Full Name" 
                                            fullWidth required value={regName} onChange={e => setRegName(e.target.value)} 
                                            InputProps={{ startAdornment: <InputAdornment position="start"><User size={18} className="text-slate-400"/></InputAdornment> }}
                                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', bgcolor: '#f8fafc' } }}
                                        />
                                        
                                        <TextField 
                                            placeholder="Email Address" type="email" fullWidth required value={regEmail} onChange={e => setRegEmail(e.target.value)} 
                                            InputProps={{ startAdornment: <InputAdornment position="start"><Mail size={18} className="text-slate-400"/></InputAdornment> }}
                                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', bgcolor: '#f8fafc' } }}
                                        />
                                        
                                        <FormControl fullWidth size="small">
                                            {/* Fix: Explicitly provided text as child of InputLabel */}
                                            <InputLabel sx={{ fontSize: '0.8rem' }}>Assigned Role</InputLabel>
                                            <Select 
                                                value={regRole} 
                                                label="Assigned Role" 
                                                onChange={(e) => setRegRole(e.target.value as UserRole)}
                                                sx={{ borderRadius: '12px', bgcolor: '#f8fafc' }}
                                            >
                                                {Object.values(UserRole).map(r => <MenuItem key={r} value={r} sx={{ fontSize: '0.85rem' }}>{r}</MenuItem>)}
                                            </Select>
                                        </FormControl>

                                        <TextField 
                                            placeholder="Secure Password" type="password" fullWidth required value={regPassword} onChange={e => {
                                                const newPassword = e.target.value;
                                                setRegPassword(newPassword);
                                                if (newPassword.length > 0) {
                                                    const strength = validatePasswordStrength(newPassword);
                                                    setRegPasswordStrength(strength);
                                                } else {
                                                    setRegPasswordStrength(null);
                                                }
                                            }} 
                                            InputProps={{ startAdornment: <InputAdornment position="start"><Lock size={18} className="text-slate-400"/></InputAdornment> }}
                                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', bgcolor: '#f8fafc' } }}
                                        />
                                        {regPasswordStrength && (
                                            <Box mt={1}>
                                                <Typography variant="caption" color={regPasswordStrength.isValid ? 'success.main' : 'error.main'}>
                                                    Password Strength: {regPasswordStrength.score}%
                                                </Typography>
                                                {regPasswordStrength.feedback.length > 0 && (
                                                    <Box mt={0.5}>
                                                        {regPasswordStrength.feedback.map((msg, idx) => (
                                                            <Typography key={idx} variant="caption" color="error.main" display="block">
                                                                • {msg}
                                                            </Typography>
                                                        ))}
                                                    </Box>
                                                )}
                                            </Box>
                                        )}

                                        <Button 
                                            type="submit" 
                                            variant="contained" 
                                            size="large" 
                                            fullWidth 
                                            disabled={loading} 
                                            sx={{ py: 1.8, borderRadius: '12px', bgcolor: '#0f172a' }}
                                        >
                                            {loading ? 'Initializing' : 'Register Member'}
                                        </Button>

                                        <Button 
                                            startIcon={<ArrowLeft size={16}/>} 
                                            onClick={() => setView('LOGIN')} 
                                            sx={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 700 }}
                                        >
                                            Return to Sign In
                                        </Button>
                                    </Stack>
                                </form>
                            )}

                            {/* RESET VIEW */}
                            {view === 'RESET' && (
                                <form onSubmit={handleReset}>
                                    <Stack spacing={3}>
                                        <Box>
                                            <Typography variant="h6" fontWeight="700" color="#1e293b">Account Recovery</Typography>
                                            <Typography variant="caption" color="text.secondary">Enter your email to receive recovery link</Typography>
                                        </Box>

                                        <TextField 
                                            placeholder="Email Address" type="email" fullWidth required value={resetEmail} onChange={e => setResetEmail(e.target.value)} 
                                            InputProps={{ startAdornment: <InputAdornment position="start"><Mail size={18} className="text-slate-400"/></InputAdornment> }}
                                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', bgcolor: '#f8fafc' } }}
                                        />
                                        
                                        <Button type="submit" variant="contained" size="large" fullWidth disabled={loading} sx={{ py: 1.8, borderRadius: '12px', bgcolor: '#0f172a' }}>
                                            {loading ? 'Sending Request' : 'Recover Account'}
                                        </Button>

                                        <Button startIcon={<ArrowLeft size={16}/>} onClick={() => setView('LOGIN')} sx={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 700 }}>
                                            Back to Login
                                        </Button>
                                    </Stack>
                                </form>
                            )}
                        </CardContent>


                    </Card>

                    {/* Footer Copyright */}
                    <Typography variant="caption" sx={{ mt: 4, color: '#94a3b8', fontWeight: 500 }}>
                        &copy; {new Date().getFullYear()} RoadMaster OS. Advanced Infrastructure Solutions.
                    </Typography>
                </Box>
            </div>
        </Fade>
      </Container>
    </Box>
  );
};

export default Login;