
import { Table, TableHeader, TableRow, TableBody, TableCell, TableHead } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil } from "lucide-react";

interface CustomersTableProps {
  customers: any[];
  user: any;
  editingEmailRow: string | null;
  emailInput: string;
  setEditingEmailRow: (phone: string | null) => void;
  setEmailInput: (val: string) => void;
  handlePairEmail: (phone: string, email: string) => void;
}

export function CustomersTable({
  customers,
  user,
  editingEmailRow,
  emailInput,
  setEditingEmailRow,
  setEmailInput,
  handlePairEmail,
}: CustomersTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Phone Number</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Transactions</TableHead>
          <TableHead>Total Spent</TableHead>
          {user?.is_admin && <TableHead>Actions</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {customers.length === 0 ? (
          <TableRow>
            <TableCell colSpan={user?.is_admin ? 5 : 4} className="text-center py-4 text-muted-foreground">
              No customers found.
            </TableCell>
          </TableRow>
        ) : customers.map((c) => (
          <TableRow key={c.phone_number}>
            <TableCell>{c.phone_number}</TableCell>
            <TableCell>
              {editingEmailRow === c.phone_number ? (
                <div className="flex items-center gap-2">
                  <Input
                    autoFocus
                    value={emailInput}
                    onChange={e => setEmailInput(e.target.value)}
                    placeholder="Enter email"
                    type="email"
                    className="max-w-xs"
                    onKeyDown={e => {
                      if (e.key === "Enter") {
                        handlePairEmail(c.phone_number, emailInput);
                      }
                      if (e.key === "Escape") {
                        setEditingEmailRow(null);
                        setEmailInput("");
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    onClick={() => handlePairEmail(c.phone_number, emailInput)}
                  >
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingEmailRow(null);
                      setEmailInput("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span>{c.email || <span className="text-muted-foreground italic">No email</span>}</span>
                  {user?.is_admin && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setEditingEmailRow(c.phone_number);
                        setEmailInput(c.email || "");
                      }}
                      title="Edit email"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              )}
            </TableCell>
            <TableCell>{c.transaction_count}</TableCell>
            <TableCell>₵{Number(c.total_spent).toLocaleString()}</TableCell>
            {user?.is_admin && (
              <TableCell>{/* Add/Update button is part of email cell as edit icon */}</TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
