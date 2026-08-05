
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import React from "react";

interface UsersTableProps {
  users: any[];
  handleDeleteUser: (id: string) => void;
}

export function UsersTable({ users, handleDeleteUser }: UsersTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Username</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Phone</TableHead>
          <TableHead>Created At</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user.id}>
            <TableCell>{user.username}</TableCell>
            <TableCell>{user.email || '-'}</TableCell>
            <TableCell>{user.phone || '-'}</TableCell>
            <TableCell>{new Date(user.created_at).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</TableCell>
            <TableCell>
              <Button 
                variant="destructive" 
                size="icon" 
                onClick={() => handleDeleteUser(user.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
