import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, LogIn } from "lucide-react";
import BackgroundImageSlider from "@/components/BackgroundImageSlider";

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
    <div className="min-h-screen w-full relative flex items-center justify-center px-4 py-12">
      <BackgroundImageSlider />
      <div className="relative z-10 w-full max-w-md">
        <Link
          to="/affiliate"
          className="inline-flex items-center gap-2 text-sm text-gray-100 hover:text-white mb-6 drop-shadow transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to affiliate
        </Link>

        <Card className="bg-black/55 backdrop-blur-md border border-white/15 shadow-2xl">
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <div className="w-14 h-14 rounded-full bg-green-700 border border-green-500/50 flex items-center justify-center mx-auto mb-4">
                <LogIn className="w-7 h-7 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white drop-shadow">
                Affiliate Sign In
              </h1>
              <p className="text-sm text-gray-200 mt-2">
                Access your affiliate dashboard
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-gray-100">
                  Username
                </Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="bg-white/10 border-white/25 text-white placeholder:text-gray-300 focus:border-green-500 focus:bg-white/15"
                  placeholder="Enter your username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-100">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-white/10 border-white/25 text-white placeholder:text-gray-300 focus:border-green-500 focus:bg-white/15"
                  placeholder="Enter your password"
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-green-700 hover:bg-green-800 text-white border border-green-500/50"
                disabled={loading}
              >
                {loading ? "Signing in..." : "Sign In"}
              </Button>
              <p className="text-xs text-gray-200 text-center drop-shadow">
                Contact 0557956020 to request an affiliate account.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AffiliateLogin;
