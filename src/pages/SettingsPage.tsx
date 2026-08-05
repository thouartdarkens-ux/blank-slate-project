import React, { useState, useEffect } from 'react';
import { MainLayout } from "@/components/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { InputWithIcon } from "@/components/InputWithIcon";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/AuthContext";
import { Trash2, Plus, UserCircle, Lock, Mail, Phone } from "lucide-react";
import { AddUserDialog } from "@/components/settings/AddUserDialog";
import { UsersTable } from "@/components/settings/UsersTable";


export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [newUser, setNewUser] = useState({ username: '', password: '', email: '', phone: '' });
  const [userProfile, setUserProfile] = useState({
    email: user?.email || '',
    phone: user?.phone || '',
    username: user?.username || '',
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.is_admin) {
      fetchUsers();
    }
    setUserProfile({
      email: user?.email || '',
      phone: user?.phone || '',
      username: user?.username || '',
      oldPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setLoading(false);
  }, [user]);

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('users_auth')
      .select('*')
      .eq('is_admin', true);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch users',
        variant: 'destructive'
      });
    } else {
      setUsers(data || []);
    }
  };

  const handleAddUser = async () => {
    if(!newUser.username || !newUser.password || !newUser.email) {
      toast({
        title: 'Error',
        description: 'Username, password and email are required',
        variant: 'destructive'
      });
      return;
    }
    
    const { error } = await supabase
      .from('users_auth')
      .insert([{
        username: newUser.username,
        password: newUser.password,
        email: newUser.email,
        phone: newUser.phone || null,
        is_admin: true,
      }]);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to add user',
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Success',
        description: 'User added successfully'
      });
      fetchUsers();
      setNewUser({ username: '', password: '', email: '', phone: '' });
    }
  };

  const handleDeleteUser = async (id: string) => {
    const { error } = await supabase
      .from('users_auth')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete user',
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Success',
        description: 'User deleted successfully'
      });
      fetchUsers();
    }
  };

  const handleUpdateProfile = async () => {
    if (userProfile.newPassword && userProfile.newPassword !== userProfile.confirmPassword) {
      toast({
        title: 'Error',
        description: 'New passwords do not match',
        variant: 'destructive'
      });
      return;
    }

    const updateData: any = {
      email: userProfile.email,
      phone: userProfile.phone,
      username: userProfile.username
    };

    if (userProfile.newPassword) {
      const { data: passwordCheck, error: passwordError } = await supabase
        .from('users_auth')
        .select('*')
        .eq('id', user?.id)
        .eq('password', userProfile.oldPassword)
        .single();

      if (passwordError || !passwordCheck) {
        toast({
          title: 'Error',
          description: 'Current password is incorrect',
          variant: 'destructive'
        });
        return;
      }

      updateData.password = userProfile.newPassword;
    }

    const { error } = await supabase
      .from('users_auth')
      .update(updateData)
      .eq('id', user?.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update profile',
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Success',
        description: 'Profile updated successfully'
      });
      setUserProfile({
        ...userProfile,
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    }
  };

  if (loading) {
    return (
      <MainLayout title="Settings">
        <div className="flex items-center justify-center h-full">
          Loading...
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Settings">
      <div className="space-y-6 animate-fade-in">
        <Tabs defaultValue="profile" className="space-y-4">
          <TabsList>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            {user?.is_admin && <TabsTrigger value="user-management">User Management</TabsTrigger>}
            <TabsTrigger value="security">Security</TabsTrigger>
            
          </TabsList>
          
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Profile Settings</CardTitle>
                <CardDescription>Manage your account details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Username</Label>
                    <InputWithIcon 
                      value={userProfile.username} 
                      onChange={e => setUserProfile({...userProfile, username: e.target.value})}
                      icon={<UserCircle className="h-4 w-4" />} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email Address</Label>
                    <InputWithIcon 
                      value={userProfile.email} 
                      onChange={e => setUserProfile({...userProfile, email: e.target.value})}
                      icon={<Mail className="h-4 w-4" />}
                      placeholder="Enter your email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone Number</Label>
                    <InputWithIcon 
                      value={userProfile.phone || ''} 
                      onChange={e => setUserProfile({...userProfile, phone: e.target.value})}
                      icon={<Phone className="h-4 w-4" />}
                      placeholder="Enter your phone number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Account Type</Label>
                    <Input value={user?.is_admin ? 'Administrator' : 'User'} readOnly />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={logout}>Logout</Button>
                <Button onClick={handleUpdateProfile}>Save Changes</Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>Update your password</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Current Password</Label>
                  <InputWithIcon 
                    type="password"
                    value={userProfile.oldPassword}
                    onChange={e => setUserProfile({...userProfile, oldPassword: e.target.value})}
                    icon={<Lock className="h-4 w-4" />}
                  />
                </div>
                <div className="space-y-2">
                  <Label>New Password</Label>
                  <InputWithIcon 
                    type="password"
                    value={userProfile.newPassword}
                    onChange={e => setUserProfile({...userProfile, newPassword: e.target.value})}
                    icon={<Lock className="h-4 w-4" />}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Confirm New Password</Label>
                  <InputWithIcon 
                    type="password"
                    value={userProfile.confirmPassword}
                    onChange={e => setUserProfile({...userProfile, confirmPassword: e.target.value})}
                    icon={<Lock className="h-4 w-4" />}
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handleUpdateProfile}>Update Password</Button>
              </CardFooter>
            </Card>
          </TabsContent>


          {user?.is_admin && (
            <TabsContent value="user-management">
              <Card>
                <CardHeader>
                  <CardTitle>User Management</CardTitle>
                  <CardDescription>Manage application users</CardDescription>
                </CardHeader>
                <CardContent>
                  <AddUserDialog newUser={newUser} setNewUser={setNewUser} handleAddUser={handleAddUser} />
                  <UsersTable users={users} handleDeleteUser={handleDeleteUser} />
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </MainLayout>
  );
}
