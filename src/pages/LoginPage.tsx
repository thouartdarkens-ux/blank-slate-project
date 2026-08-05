
// Add a forgot password button and handling to request password reset email

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import { Lock, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const { toast } = useToast();
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login(username, password);
  };

  const handleForgotPasswordReset = async () => {
    if (!forgotPasswordEmail) {
      toast({
        title: 'Error',
        description: 'Please enter your email address.',
        variant: 'destructive',
      });
      return;
    }
    setIsSendingReset(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotPasswordEmail, {
      redirectTo: window.location.origin + '/login',
    });
    setIsSendingReset(false);
    if (error) {
      toast({
        title: 'Reset Failed',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Reset Email Sent',
        description: 'Check your email for password reset instructions.',
      });
      setShowForgotPassword(false);
      setForgotPasswordEmail('');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Login to MOVAconsult</CardTitle>
        </CardHeader>
        <CardContent>
          {!showForgotPassword ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="username">Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                  <Input 
                    id="username" 
                    placeholder="Enter your username" 
                    className="pl-10" 
                    value={username} 
                    onChange={e => setUsername(e.target.value)} 
                    required 
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                  <Input 
                    id="password" 
                    type="password" 
                    placeholder="Enter your password" 
                    className="pl-10" 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    required 
                  />
                </div>
              </div>
              <Button type="submit" className="w-full">Login</Button>
              <div className="mt-2 text-center">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-primary hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email address"
                  value={forgotPasswordEmail}
                  onChange={(e) => setForgotPasswordEmail(e.target.value)}
                  required
                />
              </div>
              <Button onClick={handleForgotPasswordReset} disabled={isSendingReset} className="w-full">
                {isSendingReset ? "Sending..." : "Send Reset Email"}
              </Button>
              <div className="mt-2 text-center">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(false)}
                  className="text-sm text-primary hover:underline"
                >
                  Back to Login
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
