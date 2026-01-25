import React, { useState, ChangeEvent } from 'react';
import { User, UserRole } from '../types';
import { UserPlus, Trash2, Mail, Shield, Edit3, Upload, X, Save } from 'lucide-react';
import { 
  Avatar, 
  Box, 
  Typography, 
  Button, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
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
  Stack
} from '@mui/material';

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>(() => {
    const savedUsers = localStorage.getItem('roadmaster-users');
    return savedUsers ? JSON.parse(savedUsers) : []; // Start with empty array instead of mock data
  });
  
  const [pendingUsers, setPendingUsers] = useState<any[]>(() => {
    const savedPendingUsers = localStorage.getItem('roadmaster-pending-users');
    return savedPendingUsers ? JSON.parse(savedPendingUsers) : [];
  });
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newUser, setNewUser] = useState({ 
    name: '', 
    email: '', 
    role: UserRole.SITE_ENGINEER as UserRole,
    phone: ''
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!newUser.name.trim()) {
      alert('User name is required');
      return;
    }
    
    if (!newUser.email.trim()) {
      alert('Email is required');
      return;
    }
    
    if (!/^[\w\.-]+@[\w\.-]+\.[a-zA-Z]{2,}$/.test(newUser.email)) {
      alert('Please enter a valid email address');
      return;
    }
    
    if (newUser.phone && !/^\+?[1-9][\d\-\s]{8,}$/.test(newUser.phone)) {
      alert('Please enter a valid phone number');
      return;
    }
    
    const isDuplicate = users.some(u => u.email.toLowerCase() === newUser.email.toLowerCase());
    if (isDuplicate) {
      alert(`Duplicate: A user with email "${newUser.email}" already exists.`);
      return;
    }

    // Handle avatar - either uploaded file or generated from name
    let avatarUrl = '';
    if (previewUrl) {
      avatarUrl = previewUrl; // In a real app, this would be the uploaded image URL
    } else {
      avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(newUser.name)}&background=random`;
    }

    const user: User = {
      id: `u-${Date.now()}`,
      name: newUser.name,
      email: newUser.email,
      phone: newUser.phone,
      role: newUser.role,
      avatar: avatarUrl
    };
    setUsers(prev => {
      const updatedUsers = [...prev, user];
      // Save to localStorage
      localStorage.setItem('roadmaster-users', JSON.stringify(updatedUsers));
      return updatedUsers;
    });
    setIsModalOpen(false);
    setNewUser({ name: '', email: '', role: UserRole.SITE_ENGINEER, phone: '' });
    setAvatarFile(null);
    setPreviewUrl(null);
  };

  const handleEditUser = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingUser) return;
    
    // Validation
    if (!editingUser.name.trim()) {
      alert('User name is required');
      return;
    }
    
    if (!editingUser.email.trim()) {
      alert('Email is required');
      return;
    }
    
    if (!/^[\w\.-]+@[\w\.-]+\.[a-zA-Z]{2,}$/.test(editingUser.email)) {
      alert('Please enter a valid email address');
      return;
    }
    
    if (editingUser.phone && !/^\+?[1-9][\d\-\s]{8,}$/.test(editingUser.phone)) {
      alert('Please enter a valid phone number');
      return;
    }
    
    // Check for duplicates when changing email
    const duplicate = users.some(u => 
      u.id !== editingUser.id && u.email.toLowerCase() === editingUser.email.toLowerCase()
    );
    if (duplicate) {
      alert(`Duplicate: A user with email "${editingUser.email}" already exists.`);
      return;
    }

    // Handle avatar update
    let avatarUrl = editingUser.avatar || '';
    if (previewUrl) {
      avatarUrl = previewUrl; // In a real app, this would be the uploaded image URL
    } else if (avatarFile) {
      avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(editingUser.name)}&background=random`;
    }

    const updatedUsers = users.map(user => 
      user.id === editingUser.id 
        ? { 
            ...user, 
            name: editingUser.name,
            email: editingUser.email,
            phone: editingUser.phone,
            role: editingUser.role,
            avatar: avatarUrl
          } 
        : user
    );

    setUsers(prev => {
      // Save to localStorage
      localStorage.setItem('roadmaster-users', JSON.stringify(updatedUsers));
      return updatedUsers;
    });
    setIsEditModalOpen(false);
    setEditingUser(null);
    setAvatarFile(null);
    setPreviewUrl(null);
  };

  const removeUser = (id: string) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      setUsers(prev => {
        const updatedUsers = prev.filter(u => u.id !== id);
        // Save to localStorage
        localStorage.setItem('roadmaster-users', JSON.stringify(updatedUsers));
        return updatedUsers;
      });
    }
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setIsEditModalOpen(true);
    setPreviewUrl(null);
    setAvatarFile(null);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>, isEdit = false) => {
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
  
  const approveUser = (pendingUser: any) => {
    // Move user from pending to active users
    const newUser: User = {
      id: `u-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, // Ensure unique ID
      name: pendingUser.name,
      email: pendingUser.email,
      phone: pendingUser.phone,
      role: pendingUser.requestedRole,
      avatar: pendingUser.avatar
    };
    
    setUsers(prev => {
      const updatedUsers = [...prev, newUser];
      localStorage.setItem('roadmaster-users', JSON.stringify(updatedUsers));
      return updatedUsers;
    });
    
    // Remove from pending users
    setPendingUsers(prev => {
      const updatedPending = prev.filter((u: any) => u.id !== pendingUser.id);
      localStorage.setItem('roadmaster-pending-users', JSON.stringify(updatedPending));
      return updatedPending;
    });
    
    alert(`User ${pendingUser.name} has been approved and added to the system.`);
  };
  
  const rejectUser = (pendingUser: any) => {
    if (window.confirm(`Are you sure you want to reject ${pendingUser.name}'s registration?`)) {
      setPendingUsers(prev => {
        const updatedPending = prev.filter((u: any) => u.id !== pendingUser.id);
        localStorage.setItem('roadmaster-pending-users', JSON.stringify(updatedPending));
        return updatedPending;
      });
      alert(`User ${pendingUser.name}'s registration has been rejected.`);
    }
  };

  const getUserRoleColor = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return 'primary';
      case UserRole.PROJECT_MANAGER:
        return 'secondary';
      case UserRole.SITE_ENGINEER:
        return 'info';
      case UserRole.LAB_TECHNICIAN:
        return 'warning';
      case UserRole.SUPERVISOR:
        return 'success';
      default:
        return 'default';
    }
  };

  return (
    <Box sx={{ height: 'calc(100vh - 140px)', overflowY: 'auto', p: 2 }}>
      <Box display="flex" justifyContent="space-between" mb={2} alignItems="center">
        <Box>
          <Typography variant="h5" fontWeight="900">User Management</Typography>
          <Typography variant="body2" color="text.secondary">Manage system access and roles</Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Button 
            variant="outlined" 
            startIcon={<UserPlus size={16}/>} 
            onClick={() => setIsModalOpen(true)}
            sx={{ paddingX: 1.5, paddingY: 0.75 }}
          >
            Add User
          </Button>
          {pendingUsers.length > 0 && (
            <Button 
              variant="contained" 
              color="warning"
              onClick={() => {}}
              sx={{ paddingX: 1.5, paddingY: 0.75 }}
            >
              Pending ({pendingUsers.length})
            </Button>
          )}
        </Box>
      </Box>
      
      {/* Pending Users Section */}
      {pendingUsers.length > 0 && (
        <Paper variant="outlined" sx={{ borderRadius: 4, mb: 3 }}>
          <Box p={2} bgcolor="#fef3c7" borderBottom="1px solid #fbbf24">
            <Typography variant="h6" fontWeight="bold" color="#92400e">
              Pending Registrations ({pendingUsers.length})
            </Typography>
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'amber.50' }}>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>User</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>Requested Role</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>Email</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>Phone</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pendingUsers.map((user: any) => (
                  <TableRow key={user.id} hover>
                    <TableCell>
                      <Stack direction="column" spacing={0.5}>
                        <Stack direction="row" alignItems="center" spacing={2}>
                          <Avatar 
                            src={user.avatar} 
                            sx={{ width: 40, height: 40 }}
                          >
                            {user.name.charAt(0)}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight="bold">{user.name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              Registered: {new Date(user.createdAt).toLocaleDateString()}
                            </Typography>
                          </Box>
                        </Stack>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={user.requestedRole} 
                        size="small" 
                        color={getUserRoleColor(user.requestedRole as UserRole)}
                        variant="outlined"
                        sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}
                      />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Mail size={14} />
                        <Typography variant="body2">{user.email}</Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{user.phone || '-'}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" justifyContent="flex-end" spacing={1}>
                        <Button 
                          variant="outlined" 
                          color="success"
                          size="small" 
                          startIcon={<Shield size={16}/>} 
                          onClick={() => approveUser(user)}
                        >
                          Approve
                        </Button>
                        <Button 
                          variant="outlined" 
                          color="error" 
                          size="small" 
                          startIcon={<X size={16}/>} 
                          onClick={() => rejectUser(user)}
                        >
                          Reject
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      <Paper variant="outlined" sx={{ borderRadius: 4 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'slate.50' }}>
                <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>User</TableCell>
                <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>Role</TableCell>
                <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>Email</TableCell>
                <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>Phone</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map(user => (
                <TableRow key={user.id} hover>
                  <TableCell>
                    <Stack direction="column" spacing={0.5}>
                      <Stack direction="row" alignItems="center" spacing={2}>
                        <Avatar 
                          src={user.avatar} 
                          sx={{ width: 40, height: 40 }}
                        >
                          {user.name.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight="bold">{user.name}</Typography>
                          <Chip 
                            label={user.role} 
                            size="small" 
                            color={getUserRoleColor(user.role)}
                            variant="outlined"
                            sx={{ fontWeight: 'bold', fontSize: '0.75rem', mt: 0.5 }}
                          />
                        </Box>
                      </Stack>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Mail size={14} />
                      <Typography variant="body2">{user.email}</Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{user.phone || '-'}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" justifyContent="flex-end" spacing={1}>
                      <Button 
                        variant="outlined" 
                        size="small" 
                        startIcon={<Edit3 size={16}/>}
                        onClick={() => openEditModal(user)}
                      >
                        Edit
                      </Button>
                      <Button 
                        variant="outlined" 
                        color="error" 
                        size="small" 
                        startIcon={<Trash2 size={16}/>}
                        onClick={() => removeUser(user.id)}
                      >
                        Delete
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Add User Modal */}
      <Dialog open={isModalOpen} onClose={() => setIsModalOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <UserPlus className="text-indigo-600" /> Add New User
        </DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handleAddUser} sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Stack direction="row" spacing={2} alignItems="center" mb={2}>
              <Avatar 
                src={previewUrl || undefined} 
                sx={{ width: 64, height: 64, bgcolor: 'slate.200', color: 'slate.600', fontWeight: 'bold', fontSize: 12 }}
              >
                {newUser.name ? newUser.name.charAt(0) : 'U'}
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
            
            <Stack direction="row" spacing={2} alignItems="center" mb={1}>
              <Typography variant="body2" fontWeight="bold" sx={{ minWidth: 80 }}>
                Role:
              </Typography>
              <FormControl fullWidth margin="normal" sx={{ m: 0 }}>
                <Select 
                  value={newUser.role} 
                  onChange={e => setNewUser({...newUser, role: e.target.value as UserRole})}
                  size="small"
                >
                  {Object.values(UserRole).map(role => (
                    <MenuItem key={role} value={role}>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Chip 
                          label={role} 
                          size="small" 
                          color={getUserRoleColor(role as UserRole)}
                          variant="outlined"
                          sx={{ height: 20, fontSize: '0.75rem' }}
                        />
                      </Stack>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
            
            <TextField 
              required
              label="Full Name" 
              fullWidth 
              value={newUser.name} 
              onChange={e => setNewUser({...newUser, name: e.target.value})} 
              margin="normal"
            />
            <TextField 
              required
              label="Email" 
              type="email" 
              fullWidth 
              value={newUser.email} 
              onChange={e => setNewUser({...newUser, email: e.target.value})} 
              margin="normal"
            />
            <TextField 
              label="Phone" 
              fullWidth 
              value={newUser.phone} 
              onChange={e => setNewUser({...newUser, phone: e.target.value})} 
              margin="normal"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, bgcolor: '#f8fafc' }}>
          <Button onClick={() => setIsModalOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddUser}>Add User</Button>
        </DialogActions>
      </Dialog>

      {/* Edit User Modal */}
      <Dialog open={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'primary.main', color: 'white', p: 2, borderTopLeftRadius: 3, borderTopRightRadius: 3 }}>
          <Edit3 size={20} className="text-white" /> Edit User
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {editingUser && (
            <Box component="form" onSubmit={handleEditUser} sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Stack direction="row" spacing={2} alignItems="center" mb={2}>
                <Avatar 
                  src={previewUrl || editingUser.avatar || undefined} 
                  sx={{ width: 64, height: 64, bgcolor: 'slate.200', color: 'slate.600', fontWeight: 'bold', fontSize: 12 }}
                >
                  {editingUser.name.charAt(0)}
                </Avatar>
                <Box>
                  <Button 
                    variant="outlined" 
                    component="label" 
                    startIcon={<Upload size={16} />}
                    sx={{ borderRadius: 2, mr: 1 }}
                  >
                    Change Photo
                    <input 
                      type="file" 
                      hidden 
                      accept="image/*" 
                      onChange={(e) => handleFileChange(e, true)}
                    />
                  </Button>
                  {(previewUrl || avatarFile) && (
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
              
              {editingUser && (
                <Stack direction="row" spacing={2} alignItems="center" mb={1}>
                  <Typography variant="body2" fontWeight="bold" sx={{ minWidth: 80 }}>
                    Role:
                  </Typography>
                  <FormControl fullWidth margin="normal" sx={{ m: 0 }}>
                    <Select 
                      value={editingUser.role} 
                      onChange={e => setEditingUser({...editingUser, role: e.target.value as UserRole})}
                      size="small"
                    >
                      {Object.values(UserRole).map(role => (
                        <MenuItem key={role} value={role}>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Chip 
                              label={role} 
                              size="small" 
                              color={getUserRoleColor(role as UserRole)}
                              variant="outlined"
                              sx={{ height: 20, fontSize: '0.75rem' }}
                            />
                          </Stack>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Stack>
              )}
              
              <TextField 
                required
                label="Full Name" 
                fullWidth 
                value={editingUser.name} 
                onChange={e => setEditingUser({...editingUser, name: e.target.value})} 
                margin="normal"
              />
              <TextField 
                required
                label="Email" 
                type="email" 
                fullWidth 
                value={editingUser.email} 
                onChange={e => setEditingUser({...editingUser, email: e.target.value})} 
                margin="normal"
              />
              <TextField 
                label="Phone" 
                fullWidth 
                value={editingUser.phone || ''} 
                onChange={e => setEditingUser({...editingUser, phone: e.target.value})} 
                margin="normal"
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: 'grey.50', borderBottomLeftRadius: 3, borderBottomRightRadius: 3 }}>
          <Button onClick={() => setIsEditModalOpen(false)} startIcon={<X size={16} />} sx={{ px: 3, py: 1, fontWeight: 600 }}>Cancel</Button>
          <Button variant="contained" startIcon={<Save size={16} />} onClick={handleEditUser} sx={{ px: 3, py: 1, fontWeight: 600, boxShadow: 2, '&:hover': { boxShadow: 3 } }}>Update User</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserManagement;