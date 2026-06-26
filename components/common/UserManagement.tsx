
import React, { useState, useEffect, ChangeEvent, useRef } from 'react';
import { User, UserRole } from '../../types';
import { apiService } from '../../services/api/apiService';

import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '~/components/ui/dialog';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from '~/components/ui/badge';
import { compressImage } from '../../utils/data/imageUtils';
import { UserPlus, Users, Mail, Shield, X, Edit3, Trash2, Upload } from 'lucide-react';

import { useAvatarUpload } from '~/hooks/useAvatarUpload';
import { useHistoryAutoFill } from '~/lib/historyUtils'; // Import the hook

const UserManagement: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    role: UserRole.SITE_ENGINEER as UserRole,
    phone: ''
  });

  // History auto-fill hooks
  const emailHistory = useHistoryAutoFill('userEmails');
  const nameHistory = useHistoryAutoFill('userNames'); // Assuming names might also benefit from history

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const [usersData, pendingData] = await Promise.all([
          apiService.getUsers(),
          apiService.getPendingRegistrations()
        ]);
        setUsers(usersData);
        setPendingUsers(pendingData);
        setError(null);
      } catch (err: any) {
        console.error('Error fetching users:', err);
        setError(err.message || 'Failed to load user data');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const {
    avatarFile,
    previewUrl,
    setPreviewUrl,
    handleFileChange,
    clearAvatar,
    reset: resetAvatar
  } = useAvatarUpload();

  // --- Handlers ---
  const handleNewEmailChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewUser({ ...newUser, email: value });
    emailHistory.updateSuggestions(value); // Update suggestions as user types
  };

  const handleEditEmailChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (editingUser) {
      setEditingUser({ ...editingUser, email: value });
      emailHistory.updateSuggestions(value); // Update suggestions
    }
  };
  
  const handleNewNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewUser({ ...newUser, name: value });
    nameHistory.updateSuggestions(value);
  };

  const handleEditNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (editingUser) {
      setEditingUser({ ...editingUser, name: value });
      nameHistory.updateSuggestions(value);
    }
  };

  const handleNewUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!(newUser.name ?? '').trim()) { alert('User name is required'); return; }
    if (!(newUser.email ?? '').trim()) { alert('Email is required'); return; }
    if (!/^[\w\.-]+@[\w\.-]+\.[a-zA-Z]{2,}$/.test(newUser.email)) { alert('Please enter a valid email address'); return; }
    if (newUser.phone && !/^\+?[1-9][\d\-\s]{8,}$/.test(newUser.phone)) { alert('Please enter a valid phone number'); return; }

    try {
      const user = await apiService.createUser({
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role,
        avatar: previewUrl || undefined,
        password: 'ChangeMe123!' // Default password for new users created by admin
      } as any);

      setUsers(prev => [...prev, user]);
      emailHistory.saveEntry(newUser.email); // Save email to history
      nameHistory.saveEntry(newUser.name); // Save name to history
      setIsModalOpen(false);
      setNewUser({ name: '', email: '', role: UserRole.SITE_ENGINEER, phone: '' });
      resetAvatar();
    } catch (error: any) {
      alert(error.message || 'Failed to create user');
    }
  };

  const handleEditUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    if (!(editingUser.name ?? '').trim()) { alert('User name is required'); return; }
    if (!(editingUser.email ?? '').trim()) { alert('Email is required'); return; }
    if (!/^[\w\.-]+@[\w\.-]+\.[a-zA-Z]{2,}$/.test(editingUser.email)) { alert('Please enter a valid email address'); return; }
    if (editingUser.phone && !/^\+?[1-9][\d\-\s]{8,}$/.test(editingUser.phone)) { alert('Please enter a valid phone number'); return; }

    const duplicate = users.some(u =>
      u.id !== editingUser.id && 
      u.email && 
      editingUser.email && 
      u.email.toLowerCase() === editingUser.email.toLowerCase()
    );
    if (duplicate) { alert(`Duplicate: A user with email "${(editingUser.email ?? '').toLowerCase()}" already exists.`); return; }

    try {
      const updatedUser = await apiService.updateUser(editingUser.id, {
        name: (editingUser.name ?? '').toString(),
        email: (editingUser.email ?? '').toString(),
        phone: editingUser.phone ?? '',
        role: editingUser.role,
        avatar: previewUrl || editingUser.avatar
      });

      const updatedUsers = users.map(user =>
        user.id === editingUser.id ? { ...user, ...updatedUser } : user
      );

      setUsers(updatedUsers);
      emailHistory.saveEntry(editingUser.email); // Save email to history
      nameHistory.saveEntry(editingUser.name); // Save name to history
      setIsEditModalOpen(false);
      setEditingUser(null);
      resetAvatar();
    } catch (error: any) {
      alert(error.message || 'Failed to update user');
    }
  };

  const removeUser = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await apiService.deleteUser(id);
        setUsers(prev => prev.filter(u => u.id !== id));
        alert('User deleted successfully');
      } catch (error: any) {
        alert(error.message || 'Failed to delete user');
      }
    }
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setIsEditModalOpen(true);
    resetAvatar();
    if (user.avatar) setPreviewUrl(user.avatar);
    // Pre-fill history hook state when opening edit modal
    emailHistory.updateSuggestions(user.email);
    nameHistory.updateSuggestions(user.name);
  };

  const approveUser = async (pendingUser: any) => {
    try {
      const newUser = await apiService.approveRegistration(pendingUser.id || pendingUser._id);
      setUsers(prev => [...prev, newUser]);
      setPendingUsers(prev => prev.filter((u: any) => (u.id || u._id) !== (pendingUser.id || pendingUser._id)));
      alert(`User ${pendingUser?.name ?? 'user'} has been approved and added to the system.`);
    } catch (error: any) {
      alert(error.message || 'Failed to approve user');
    }
  };

  const rejectUser = async (pendingUser: any) => {
    if (window.confirm(`Are you sure you want to reject ${pendingUser?.name ?? 'this user'}'s registration?`)) {
      try {
        await apiService.rejectRegistration(pendingUser.id || pendingUser._id);
        setPendingUsers(prev => prev.filter((u: any) => (u.id || u._id) !== (pendingUser.id || pendingUser._id)));
        alert(`User ${pendingUser?.name ?? 'The user'}'s registration has been rejected.`);
      } catch (error: any) {
        alert(error.message || 'Failed to reject user');
      }
    }
  };

  // --- Rendering Helpers ---
  const getUserRoleColor = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN: return 'bg-red-500/20 text-red-700';
      case UserRole.PROJECT_MANAGER: return 'bg-blue-500/20 text-blue-700';
      case UserRole.SITE_ENGINEER: return 'bg-green-500/20 text-green-700';
      case UserRole.LAB_TECHNICIAN: return 'bg-yellow-500/20 text-yellow-700';
      case UserRole.HSE_OFFICER: return 'bg-orange-500/20 text-orange-700';
      case UserRole.SUPERVISOR: return 'bg-purple-500/20 text-purple-700';
      default: return 'bg-gray-500/20 text-gray-700';
    }
  };

  // --- Auto-complete suggestion rendering ---
  const renderSuggestions = (historyHook: ReturnType<typeof useHistoryAutoFill>, inputId: string, onChange: (e: any) => void) => {
    const handleSuggestionClick = (suggestion: string) => {
      onChange({ target: { value: suggestion } }); // Simulate an input change event
      historyHook.updateSuggestions(''); // Clear suggestions after selection
    };

    return (
      <>
        {/* The input field itself will be controlled by its onChange handler */}
        {/* Suggestions will be rendered in a dropdown below the input */}
        {historyHook.suggestions.length > 0 && historyHook.searchTerm && (
          <div className="absolute z-10 mt-1 w-full rounded-md bg-white shadow-lg max-h-60 overflow-auto border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
            {historyHook.suggestions.map((suggestion, index) => (
              <div
                key={index}
                className="cursor-pointer px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                {suggestion}
              </div>
            ))}
          </div>
        )}
      </>
    );
  };

  // --- JSX Rendering ---
  return (
    <div className="p-4 h-[calc(100vh-140px)] overflow-y-auto">
      {loading && (
        <div className="flex justify-center items-center h-48">
          <p className="text-lg text-muted-foreground">Loading user data...</p>
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="flex justify-between mb-4 items-center">
            <div>
              <h1 className="text-2xl font-bold text-foreground">User Management</h1>
              <p className="text-sm text-muted-foreground">Manage system access and roles</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsModalOpen(true)}>
                <UserPlus className="mr-2 h-4 w-4" />
                Add User
              </Button>
              {pendingUsers.length > 0 && (
                <Button variant="secondary" onClick={() => { }}>
                  Pending ({pendingUsers.length})
                </Button>
              )}
            </div>
          </div>

          {/* Pending Users Section (no changes related to history auto-fill here) */}
          {pendingUsers.length > 0 && (
            <Card className="mb-6 border-amber-300">
              <CardHeader className="bg-amber-100 border-b border-amber-300">
                <CardTitle className="text-xl font-bold text-amber-900">
                  Pending Registrations ({pendingUsers.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-amber-50">
                      <TableHead className="font-bold text-sm">User</TableHead>
                      <TableHead className="font-bold text-sm">Requested Role</TableHead>
                      <TableHead className="font-bold text-sm">Email</TableHead>
                      <TableHead className="font-bold text-sm">Phone</TableHead>
                      <TableHead className="text-right font-bold text-sm">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingUsers.filter((user: any) => user != null).map((user: any) => (
                      <TableRow key={user?.id || user?._id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar>
                              <AvatarImage src={user.avatar} />
                              <AvatarFallback>{user?.name ? user.name.charAt(0) : 'U'}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-semibold">{user.name ?? 'Unknown'}</p>
                              <p className="text-xs text-muted-foreground">Registered: {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getUserRoleColor(user.requestedRole)}>{user.requestedRole ?? '-'}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span>{user.email}</span>
                          </div>
                        </TableCell>
                        <TableCell>{user.phone || '-'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => approveUser(user)}>
                              <Shield className="mr-1 h-4 w-4" /> Approve
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => rejectUser(user)}>
                              <X className="mr-1 h-4 w-4" /> Reject
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Main Users Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted">
                    <TableHead className="font-bold text-sm">User</TableHead>
                    <TableHead className="font-bold text-sm">Email</TableHead>
                    <TableHead className="font-bold text-sm">Phone</TableHead>
                    <TableHead className="text-right font-bold text-sm">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-32 text-center">
                        <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                          <Users className="h-8 w-8" />
                          <p className="text-sm font-medium">No users found</p>
                          <p className="text-xs">Click "Add User" to create the first user.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.filter((user): user is User => user != null).map(user => (
                      <TableRow key={user?.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar>
                              <AvatarImage src={user.avatar} />
                              <AvatarFallback>{user?.name ? user.name.charAt(0) : 'U'}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-semibold">{user.name ?? 'Unknown'}</p>
                              <Badge className={getUserRoleColor(user.role)}>{user.role}</Badge>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 relative"> {/* Relative positioning for suggestions */}
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <Input
                              id={`edit-email-${user.id}`} // Unique ID for input
                              type="email"
                              value={editingUser?.id === user.id ? editingUser.email : user.email}
                              onChange={editingUser?.id === user.id ? handleEditEmailChange : undefined} // Use handler if editing
                              className="h-8 border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 col-span-3"
                              onFocus={() => editingUser?.id === user.id && emailHistory.updateSuggestions(editingUser.email)} // Show suggestions on focus
                              disabled={editingUser?.id !== user.id} // Disabled if not currently editing
                              aria-label="User email"
                            />
                            {renderSuggestions(emailHistory, `edit-email-${user.id}`, (e) => { /* Handle suggestion click */ })}
                          </div>
                        </TableCell>
                        <TableCell>{user.phone || '-'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => openEditModal(user)}>
                              <Edit3 className="mr-1 h-4 w-4" /> Edit
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => removeUser(user.id)}>
                              <Trash2 className="mr-1 h-4 w-4" /> Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Add User Modal */}
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <UserPlus className="text-primary" /> Add New User
                </DialogTitle>
                <DialogDescription>Fill in the details for the new user.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="flex items-center gap-4">
                  <Avatar className="w-16 h-16">
                    <AvatarImage src={previewUrl || undefined} />
                    <AvatarFallback>{newUser.name ? newUser.name.charAt(0) : 'U'}</AvatarFallback>
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
                  <div className="relative col-span-3"> {/* Container for input + suggestions */}
                    <Input id="name" value={newUser.name} onChange={handleNewNameChange} className="col-span-3" />
                    {renderSuggestions(nameHistory, 'name', handleNewNameChange)}
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="email" className="text-right">Email</Label>
                  <div className="relative col-span-3"> {/* Container for input + suggestions */}
                    <Input id="email" type="email" value={newUser.email} onChange={handleNewEmailChange} className="col-span-3" />
                    {renderSuggestions(emailHistory, 'email', handleNewEmailChange)}
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="phone" className="text-right">Phone</Label>
                  <Input id="phone" value={newUser.phone} onChange={e => setNewUser({ ...newUser, phone: e.target.value })} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="role" className="text-right">Role</Label>
                  <Select value={newUser.role} onValueChange={(value: UserRole) => setNewUser({ ...newUser, role: value })}>
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
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button onClick={handleNewUserSubmit}>Add User</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit User Modal */}
          <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Edit3 className="text-primary" /> Edit User
                </DialogTitle>
                <DialogDescription>Update user details.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                {editingUser && (
                  <>
                    <div className="flex items-center gap-4">
                      <Avatar className="w-16 h-16">
                        <AvatarImage src={previewUrl || editingUser.avatar || undefined} />
                        <AvatarFallback>{editingUser?.name ? editingUser.name.charAt(0) : 'U'}</AvatarFallback>
                      </Avatar>
                      <div className="grid gap-1">
                        <Button variant="outline" size="sm" asChild>
                          <Label htmlFor="edit-avatar-upload">
                            <Upload className="mr-2 h-4 w-4" /> Change Photo
                          </Label>
                        </Button>
                        <Input id="edit-avatar-upload" type="file" className="sr-only" accept="image/*" onChange={(e) => handleFileChange(e)} />
                        {(previewUrl || avatarFile) && (
                          <Button variant="ghost" size="sm" onClick={clearAvatar}>
                            <X className="mr-2 h-4 w-4" /> Clear Photo
                          </Button>
                        )}
                        <p className="text-xs text-muted-foreground">JPG, PNG, Max 5MB</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="edit-name" className="text-right">Full Name</Label>
                      <div className="relative col-span-3"> {/* Container for input + suggestions */}
                        <Input id="edit-name" value={editingUser.name ?? ''} onChange={handleEditNameChange} className="col-span-3" />
                        {renderSuggestions(nameHistory, `edit-name-${editingUser.id}`, handleEditNameChange)}
                      </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="edit-email" className="text-right">Email</Label>
                      <div className="relative col-span-3"> {/* Container for input + suggestions */}
                        <Input id="edit-email" type="email" value={editingUser.email ?? ''} onChange={handleEditEmailChange} className="col-span-3" />
                        {renderSuggestions(emailHistory, `edit-email-${editingUser.id}`, handleEditEmailChange)}
                      </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="edit-phone" className="text-right">Phone</Label>
                      <Input id="edit-phone" value={editingUser.phone || ''} onChange={e => setEditingUser({ ...editingUser, phone: e.target.value })} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="edit-role" className="text-right">Role</Label>
                      <Select value={editingUser.role} onValueChange={(value: UserRole) => setEditingUser({ ...editingUser, role: value })}>
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
                  </>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
                <Button onClick={handleEditUserSubmit}>Save Changes</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}

      {!loading && error && (
        <div className="p-8 max-w-2xl mx-auto">
          <Card className="border-destructive">
            <CardHeader className="bg-destructive/10 border-b border-destructive/20">
              <CardTitle className="text-xl font-bold text-destructive flex items-center gap-2">
                <span className="text-2xl">&#9888;</span> Data Load Error
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-muted-foreground mb-4">{error}</p>
              <div className="flex gap-3">
                <Button variant="default" onClick={() => { setLoading(true); setError(null); }}>
                  Retry
                </Button>
                <Button variant="outline" onClick={() => setError(null)}>
                  Dismiss
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
