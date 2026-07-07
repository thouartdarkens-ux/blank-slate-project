import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { LogIn, Phone, ArrowLeft } from "lucide-react";
import BackgroundImageSlider from "@/components/BackgroundImageSlider";
import { Link } from "react-router-dom";

const AffiliateLogin = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("affiliate-login", {
        body: { username, password },
      });
      if (error || !data?.token) {
        throw new Error(data?.error || error?.message || "Login failed");
      }
      localStorage.setItem("affiliate_token", data.token);
      localStorage.setItem("affiliate_profile", JSON.stringify(data.affiliate));
      toast.success("Welcome back!");
      navigate("/affiliate/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden relative flex items-center justify-center px-4 py-12">
      <BackgroundImageSlider />
      <div className="relative z-10 w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-700 border border-green-500/50 mb-4">
            <LogIn className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white drop-shadow-lg">Affiliate Sign In</h1>
          <p className="text-gray-200 mt-2 drop-shadow">Access your affiliate dashboard</p>
        </div>

        <Card className="bg-black/60 backdrop-blur-md border border-white/10 shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl text-center text-white">Sign In</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-gray-100">Username</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="bg-white/95 border-white/20 text-gray-900 placeholder:text-gray-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-100">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-white/95 border-white/20 text-gray-900 placeholder:text-gray-500"
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-green-700 hover:bg-green-800 text-white border border-green-500/50"
                disabled={loading}
                size="lg"
              >
                {loading ? "Signing in..." : "Sign In"}
              </Button>
              <div className="flex items-start gap-2 rounded-lg bg-green-900/40 border border-green-500/30 p-3 text-sm text-gray-100">
                <Phone className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-400" />
                <span>Contact 0557956020 to request an affiliate account.</span>
              </div>
              <div className="text-center text-sm text-gray-200">
                Don't have an account?{" "}
                <Link to="/affiliate/register" className="text-green-400 hover:text-green-300 underline">
                  Register
                </Link>
              </div>
              <div className="text-center pt-2">
                <Link
                  to="/affiliate"
                  className="inline-flex items-center gap-1.5 text-sm text-gray-200 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Affiliate Info
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AffiliateLogin;
