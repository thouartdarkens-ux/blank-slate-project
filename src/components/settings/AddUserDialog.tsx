
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import React from "react";

interface AddUserDialogProps {
  newUser: any;
  setNewUser: (cb: (prev: any) => any) => void;
  handleAddUser: () => void;
}

export function AddUserDialog({ newUser, setNewUser, handleAddUser }: AddUserDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="mb-4">
          <Plus className="mr-2 h-4 w-4" /> Add New User
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Username</Label>
            <Input 
              value={newUser.username}
              onChange={(e) => setNewUser(prev => ({ ...prev, username: e.target.value }))}
            />
          </div>
          <div>
            <Label>Email</Label>
            <Input 
              type="email"
              value={newUser.email}
              onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
            />
          </div>
          <div>
            <Label>Phone Number</Label>
            <Input 
              type="tel"
              value={newUser.phone}
              onChange={(e) => setNewUser(prev => ({ ...prev, phone: e.target.value }))}
            />
          </div>
          <div>
            <Label>Password</Label>
            <Input 
              type="password"
              value={newUser.password}
              onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
            />
          </div>
          <Button onClick={handleAddUser}>Create User</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
