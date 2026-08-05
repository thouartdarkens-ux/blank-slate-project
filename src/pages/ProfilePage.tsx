import { useState, useEffect } from "react";
import { MainLayout } from "@/components/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  department: string | null;
}
export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile>({
    id: '',
    first_name: '',
    last_name: '',
    phone: '',
    department: ''
  });
  const [loading, setLoading] = useState(true);
  const {
    toast
  } = useToast();
  useEffect(() => {
    // Get current user and their profile
    const fetchUserAndProfile = async () => {
      try {
        const {
          data: {
            user
          }
        } = await supabase.auth.getUser();
        if (user) {
          setUser(user);
          const {
            data,
            error
          } = await supabase.from('profiles').select('*').eq('id', user.id).single();
          if (error) throw error;
          if (data) setProfile(data);
        }
      } catch (error) {
        toast({
          title: "Error fetching profile",
          description: error instanceof Error ? error.message : "Failed to fetch profile",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    fetchUserAndProfile();
  }, []);
  const handleProfileUpdate = async () => {
    try {
      const {
        error
      } = await supabase.from('profiles').update({
        first_name: profile.first_name,
        last_name: profile.last_name,
        phone: profile.phone,
        department: profile.department
      }).eq('id', user?.id);
      if (error) throw error;
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully."
      });
    } catch (error) {
      toast({
        title: "Error updating profile",
        description: error instanceof Error ? error.message : "Failed to update profile",
        variant: "destructive"
      });
    }
  };
  if (loading) {
    return <MainLayout title="Profile">
        <div className="flex items-center justify-center h-full">
          Loading...
        </div>
      </MainLayout>;
  }
  return <MainLayout title="Profile">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile Settings</CardTitle>
            <CardDescription>
              Manage your account details and preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input id="firstName" value={profile.first_name || ''} onChange={e => setProfile({
                ...profile,
                first_name: e.target.value
              })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" value={profile.last_name || ''} onChange={e => setProfile({
                ...profile,
                last_name: e.target.value
              })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" value={profile.phone || ''} onChange={e => setProfile({
                ...profile,
                phone: e.target.value
              })} />
              </div>
              
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleProfileUpdate}>
              Save Changes
            </Button>
          </CardFooter>
        </Card>
      </div>
    </MainLayout>;
}