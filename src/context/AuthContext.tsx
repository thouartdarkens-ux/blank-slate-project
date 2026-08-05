  import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';

interface AuthContextType {
  user: any;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser ] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check for existing session on mount and setup session listener
  useEffect(() => {
    // Check if there's a stored session timestamp
    const lastLoginTime = localStorage.getItem('lastLoginTime');
    if (lastLoginTime) {
      const timeDiff = Date.now() - parseInt(lastLoginTime);
      const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds
      
      // If more than 1 hour has passed, clear the session
      if (timeDiff > oneHour) {
        console.log('Session expired, clearing user data.');
        setUser (null);
        localStorage.removeItem('lastLoginTime');
        localStorage.removeItem('userSession');
        return;
      }
    }

    // Try to restore session from localStorage
    const storedSession = localStorage.getItem('userSession');
    if (storedSession) {
      console.log('Restoring session:', storedSession);
      setUser (JSON.parse(storedSession));
    }
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const { data, error } = await supabase
        .from('users_auth')
        .select('*')
        .eq('username', username)
        .eq('password', password)
        .single();

      if (error || !data) {
        throw new Error('Invalid credentials');
      }

      // Store session data and timestamp
      localStorage.setItem('userSession', JSON.stringify(data));
      localStorage.setItem('lastLoginTime', Date.now().toString());
      
      setUser (data);
      navigate('/dashboard');
      toast({
        title: 'Login Successful',
        description: `Welcome back, ${username}!`
      });
    } catch (error) {
      toast({
        title: 'Login Failed',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive'
      });
    }
  };

  const logout = async () => {
    const confirmed = window.confirm('Are you sure you want to log out?');
    if (!confirmed) {
      return; // User cancelled logout
    }
    // Clear session data and timestamps
    localStorage.removeItem('userSession');
    localStorage.removeItem('lastLoginTime');
    setUser (null);
    navigate('/');
    toast({
      title: 'Logged Out',
      description: 'You have been successfully logged out.'
    });
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      isAuthenticated: !!user 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
