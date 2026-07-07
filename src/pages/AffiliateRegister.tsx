import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { UserPlus, ArrowLeft } from "lucide-react";
import BackgroundImageSlider from "@/components/BackgroundImageSlider";

const AffiliateRegister = () => {
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.info("Registration coming soon. Please contact 0557956020 for now.");
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden relative flex items-center justify-center px-4 py-12">
      <BackgroundImageSlider />
      <div className="relative z-10 w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-700 border border-green-500/50 mb-4">
            <UserPlus className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white drop-shadow-lg">Create Affiliate Account</h1>
          <p className="text-gray-200 mt-2 drop-shadow">Join the affiliate program</p>
        </div>

        <Card className="bg-black/60 backdrop-blur-md border border-white/10 shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl text-center text-white">Register</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-gray-100">Full Name</Label>
                <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required
                  className="bg-white/95 border-white/20 text-gray-900 placeholder:text-gray-500" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username" className="text-gray-100">Username</Label>
                <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} required
                  className="bg-white/95 border-white/20 text-gray-900 placeholder:text-gray-500" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-gray-100">Phone</Label>
                <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required
                  className="bg-white/95 border-white/20 text-gray-900 placeholder:text-gray-500" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-100">Email (optional)</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="bg-white/95 border-white/20 text-gray-900 placeholder:text-gray-500" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-100">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                  className="bg-white/95 border-white/20 text-gray-900 placeholder:text-gray-500" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm" className="text-gray-100">Confirm Password</Label>
                <Input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required
                  className="bg-white/95 border-white/20 text-gray-900 placeholder:text-gray-500" />
              </div>
              <Button type="submit" size="lg"
                className="w-full bg-green-700 hover:bg-green-800 text-white border border-green-500/50">
                Create Account
              </Button>
              <div className="text-center text-sm text-gray-200 pt-2">
                Already have an account?{" "}
                <Link to="/affiliate/login" className="text-green-400 hover:text-green-300 underline">
                  Sign in
                </Link>
              </div>
              <div className="text-center pt-1">
                <Link to="/affiliate"
                  className="inline-flex items-center gap-1.5 text-sm text-gray-200 hover:text-white transition-colors">
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

export default AffiliateRegister;