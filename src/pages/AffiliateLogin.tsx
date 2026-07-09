import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { LogIn, Phone, ArrowLeft, Eye, EyeOff, KeyRound } from "lucide-react";
import BackgroundImageSlider from "@/components/BackgroundImageSlider";
import { Link } from "react-router-dom";

const AffiliateLogin = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetUsername, setResetUsername] = useState("");
  const [resetPhone, setResetPhone] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirm, setResetConfirm] = useState("");
  const [resetting, setResetting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("affiliate-login", {
        body: { username, password },
      });
      if (error || !data?.token) {
        // Distinguish network errors (503 / NETWORK_ERROR / fetch failure)
        // from genuine invalid credentials (401).
        const isNetworkError =
          error?.context?.status === 503 ||
          data?.code === "NETWORK_ERROR" ||
          (error && !data);
        if (isNetworkError) {
          toast.error("Failed to login, retry");
        } else {
          toast.error(data?.error || "Invalid credentials");
        }
        return;
      }
      localStorage.setItem("affiliate_token", data.token);
      localStorage.setItem("affiliate_profile", JSON.stringify(data.affiliate));
      toast.success("Welcome back!");
      navigate("/affiliate/dashboard");
    } catch {
      // Fetch-level failure (network down, timeout, etc.)
      toast.error("Failed to login, retry");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resetPassword !== resetConfirm) {
      toast.error("Passwords do not match");
      return;
    }
    if (resetPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setResetting(true);
    try {
      const { data, error } = await supabase.functions.invoke("affiliate-reset-password", {
        body: {
          username: resetUsername.trim(),
          phone: resetPhone.trim(),
          new_password: resetPassword,
        },
      });
      if (error || data?.error) {
        const isNetwork = error?.context?.status === 503 || data?.code === "NETWORK_ERROR";
        if (isNetwork) {
          toast.error("Failed to reset, retry");
        } else {
          toast.error(data?.error || "Reset failed");
        }
        return;
      }
      toast.success("Password reset successful. You can now sign in.");
      setResetOpen(false);
      setResetUsername("");
      setResetPhone("");
      setResetPassword("");
      setResetConfirm("");
    } catch {
      toast.error("Failed to reset, retry");
    } finally {
      setResetting(false);
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
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-white/95 border-white/20 text-gray-900 placeholder:text-gray-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-600 hover:text-gray-900"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
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
              <div className="text-center text-sm">
                <button
                  type="button"
                  onClick={() => setResetOpen(true)}
                  className="inline-flex items-center gap-1.5 text-amber-400 hover:text-amber-300 transition-colors"
                >
                  <KeyRound className="w-3.5 h-3.5" /> Forgot Password?
                </button>
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

        {/* Reset Password Dialog */}
        <Dialog open={resetOpen} onOpenChange={setResetOpen}>
          <DialogContent className="bg-slate-900 border border-white/10 text-white">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-400" /> Reset Password
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="resetUsername" className="text-gray-200">Username</Label>
                <Input
                  id="resetUsername"
                  value={resetUsername}
                  onChange={(e) => setResetUsername(e.target.value)}
                  required
                  className="bg-white/95 border-white/20 text-gray-900"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="resetPhone" className="text-gray-200">Registered Phone</Label>
                <Input
                  id="resetPhone"
                  type="tel"
                  value={resetPhone}
                  onChange={(e) => setResetPhone(e.target.value.replace(/\D/g, ""))}
                  required
                  maxLength={10}
                  placeholder="0551234567"
                  className="bg-white/95 border-white/20 text-gray-900"
                />
                <p className="text-xs text-gray-400">Enter the phone number you registered with.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="resetPassword" className="text-gray-200">New Password</Label>
                <Input
                  id="resetPassword"
                  type="password"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  required
                  className="bg-white/95 border-white/20 text-gray-900"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="resetConfirm" className="text-gray-200">Confirm New Password</Label>
                <Input
                  id="resetConfirm"
                  type="password"
                  value={resetConfirm}
                  onChange={(e) => setResetConfirm(e.target.value)}
                  required
                  className="bg-white/95 border-white/20 text-gray-900"
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setResetOpen(false)}
                  className="border-white/20 text-gray-200 hover:bg-white/10"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={resetting}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  {resetting ? "Resetting..." : "Reset Password"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AffiliateLogin;
