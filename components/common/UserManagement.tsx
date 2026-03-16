import React, { useState, useEffect, ChangeEvent } from 'react';
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
import { UserPlus, Mail, Shield, X, Edit3, Trash2, Upload } from 'lucide-react';

const UserManagement: React.FC = () => {
  const [loading, setLoading] = useState(true);
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
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [usersData, pendingData] = await Promise.all([
          apiService.getUsers(),
          apiService.getPendingRegistrations()
        ]);
        setUsers(usersData);
        setPendingUsers(pendingData);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newUser.name.trim()) { alert('User name is required'); return; }
    if (!newUser.email.trim()) { alert('Email is required'); return; }
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
      setIsModalOpen(false);
      setNewUser({ name: '', email: '', role: UserRole.SITE_ENGINEER, phone: '' });
      setAvatarFile(null);
      setPreviewUrl(null);
    } catch (error: any) {
      alert(error.message || 'Failed to create user');
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    if (!editingUser.name.trim()) { alert('User name is required'); return; }
    if (!editingUser.email.trim()) { alert('Email is required'); return; }
    if (!/^[\w\.-]+@[\w\.-]+\.[a-zA-Z]{2,}$/.test(editingUser.email)) { alert('Please enter a valid email address'); return; }
    if (editingUser.phone && !/^\+?[1-9][\d\-\s]{8,}$/.test(editingUser.phone)) { alert('Please enter a valid phone number'); return; }

    const duplicate = users.some(u =>
      u.id !== editingUser.id && u.email.toLowerCase() === editingUser.email.toLowerCase()
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
        user.id === editingUser.id ? updatedUser : user
      );

      setUsers(updatedUsers);
      setIsEditModalOpen(false);
      setEditingUser(null);
      setAvatarFile(null);
      setPreviewUrl(null);
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
    setPreviewUrl(null);
    setAvatarFile(null);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        try {
          // Compress image to save space in localStorage/MongoDB
          const compressed = await compressImage(base64, 200, 200, 0.6);
          setPreviewUrl(compressed);
        } catch (err) {
          console.error("Compression failed, using original", err);
          setPreviewUrl(base64);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const clearAvatar = () => {
    setAvatarFile(null);
    setPreviewUrl(null);
  };

  const approveUser = async (pendingUser: any) => {
    try {
      const newUser = await apiService.approveRegistration(pendingUser.id);
      setUsers(prev => [...prev, newUser]);
      setPendingUsers(prev => prev.filter((u: any) => u.id !== pendingUser.id));
      alert(`User ${pendingUser?.name ?? 'user'} has been approved and added to the system.`);
    } catch (error: any) {
      alert(error.message || 'Failed to approve user');
    }
  };

  const rejectUser = async (pendingUser: any) => {
    if (window.confirm(`Are you sure you want to reject ${pendingUser?.name ?? 'this user'}'s registration?`)) {
      try {
        await apiService.rejectRegistration(pendingUser.id);
        setPendingUsers(prev => prev.filter((u: any) => u.id !== pendingUser.id));
        alert(`User ${pendingUser?.name ?? 'The user'}'s registration has been rejected.`);
      } catch (error: any) {
        alert(error.message || 'Failed to reject user');
      }
    }
  };


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

  return (
    <div className="p-4 h-[calc(100vh-140px)] overflow-y-auto">
      {loading && (
        <div className="flex justify-center items-center h-48">
          <p className="text-lg text-muted-foreground">Loading user data...</p>
        </div>
      )}

      {!loading && (
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
                <Button variant="secondary" onClick={() => {}}>
                  Pending ({pendingUsers.length})
                </Button>
              )}
            </div>
          </div>

          {/* Pending Users Section */}
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
                            {pendingUsers.map((user: any) => (
                                <TableRow key={user.id}>
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
                  {users.map(user => (
                    <TableRow key={user.id}>
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
                        <div className="flex items-center gap-1">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span>{user.email}</span>
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
                  ))}
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
                  <Input id="name" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="email" className="text-right">Email</Label>
                  <Input id="email" type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="phone" className="text-right">Phone</Label>
                  <Input id="phone" value={newUser.phone} onChange={e => setNewUser({...newUser, phone: e.target.value})} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="role" className="text-right">Role</Label>
                  <Select value={newUser.role} onValueChange={(value: UserRole) => setNewUser({...newUser, role: value})}>
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
                <Button onClick={handleAddUser}>Add User</Button>
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
                      <Input id="edit-name" value={editingUser.name ?? ''} onChange={e => setEditingUser({...editingUser, name: e.target.value})} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="edit-email" className="text-right">Email</Label>
                      <Input id="edit-email" type="email" value={editingUser.email ?? ''} onChange={e => setEditingUser({...editingUser, email: e.target.value})} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="edit-phone" className="text-right">Phone</Label>
                      <Input id="edit-phone" value={editingUser.phone || ''} onChange={e => setEditingUser({...editingUser, phone: e.target.value})} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="edit-role" className="text-right">Role</Label>
                      <Select value={editingUser.role} onValueChange={(value: UserRole) => setEditingUser({...editingUser, role: value})}>
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
                <Button onClick={handleEditUser}>Save Changes</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
};

export default UserManagement;
