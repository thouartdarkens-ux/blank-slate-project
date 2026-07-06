import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, Share2, ChartBar as BarChart3, Check, TrendingUp } from "lucide-react";
import BackgroundImageSlider from "@/components/BackgroundImageSlider";

const Affiliate = () => {
  return (
    <div className="min-h-screen w-full overflow-x-hidden relative">
      <BackgroundImageSlider />
      <div className="relative z-10 w-full">
        {/* Hero */}
        <section className="py-20 px-4 text-center">
          <div className="max-w-5xl mx-auto">
            <span className="inline-block px-4 py-1.5 rounded-full bg-green-600/80 backdrop-blur-sm text-white text-sm font-medium mb-6 border border-green-400/50">
              Affiliate Program
            </span>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 text-white drop-shadow-lg">
              Become an Affiliate Partner
            </h1>
            <p className="text-lg md:text-xl text-gray-100 mb-8 max-w-2xl mx-auto drop-shadow">
              Earn competitive commissions by helping students access their WAEC results
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                asChild
                size="lg"
                className="bg-green-700 hover:bg-green-800 text-white border border-green-500/50"
              >
                <Link to="/affiliate/login">Join Now</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="bg-white/10 backdrop-blur-sm border-white/40 text-white hover:bg-white/20 hover:text-white"
              >
                <Link to="/affiliate/login">Sign In</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Stats strip */}
        <section className="px-4 pb-8">
          <div className="max-w-4xl mx-auto grid grid-cols-3 gap-4">
            {[
              { value: "17%", label: "Max Commission" },
              { value: "24/7", label: "Live Tracking" },
              { value: "0", label: "Signup Fee" },
            ].map((s) => (
              <div
                key={s.label}
                className="text-center bg-black/50 backdrop-blur-md rounded-lg p-4 border border-white/10"
              >
                <p className="text-2xl md:text-3xl font-bold text-green-400">{s.value}</p>
                <p className="text-xs md:text-sm text-gray-200 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Why join */}
        <section className="py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-3 text-white drop-shadow-lg">
                Why Join Our Affiliate Program?
              </h2>
              <p className="text-gray-200 max-w-2xl mx-auto drop-shadow">
                Partner with Ghana's trusted WAEC voucher provider and earn money while
                helping students
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  icon: DollarSign,
                  title: "Competitive Commission",
                  items: ["Up to 17% commission per sale", "Instant commission tracking", "Quick payouts"],
                },
                {
                  icon: Share2,
                  title: "Easy to Promote",
                  items: ["Unique referral links", "Social media graphics", "Assigned Shortcodes"],
                },
                {
                  icon: BarChart3,
                  title: "Real-Time Dashboard",
                  items: ["Live sales tracking", "Earnings analytics", "Performance reports"],
                },
              ].map((f) => (
                <Card
                  key={f.title}
                  className="bg-black/50 backdrop-blur-md border border-white/10 hover:border-green-500/60 transition-all duration-300"
                >
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-lg bg-green-600/30 border border-green-500/40 flex items-center justify-center mb-4">
                      <f.icon className="w-6 h-6 text-green-400" />
                    </div>
                    <h3 className="text-xl font-semibold mb-4 text-white">{f.title}</h3>
                    <ul className="space-y-2">
                      {f.items.map((i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-gray-100">
                          <Check className="w-4 h-4 text-green-400 flex-shrink-0" /> {i}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-16 px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-3 text-white drop-shadow-lg">
                How It Works
              </h2>
              <p className="text-gray-200 drop-shadow">Start earning in 3 simple steps</p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  n: 1,
                  title: "Sign Up",
                  desc: "Create your free affiliate account in minutes. No fees, no commitments.",
                },
                {
                  n: 2,
                  title: "Get Your Agent Code",
                  desc: "Get your unique agent code with our shortcode and share it with students, parents, and educators through social media, WhatsApp, or your website.",
                },
                {
                  n: 3,
                  title: "Earn Commission",
                  desc: "When someone purchases a voucher using your agent code, you earn a commission. Track your earnings in real-time and get paid regularly.",
                },
              ].map((s) => (
                <Card
                  key={s.n}
                  className="bg-black/50 backdrop-blur-md border border-white/10 hover:border-green-500/60 transition-all duration-300"
                >
                  <CardContent className="p-6 text-center">
                    <div className="w-14 h-14 rounded-full bg-green-700 border border-green-500/50 text-white flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                      {s.n}
                    </div>
                    <h3 className="text-xl font-semibold mb-3 text-white">{s.title}</h3>
                    <p className="text-sm text-gray-200">{s.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="text-center mt-12">
              <Button
                asChild
                size="lg"
                className="bg-green-700 hover:bg-green-800 text-white border border-green-500/50"
              >
                <Link to="/affiliate/login">
                  <TrendingUp className="w-4 h-4 mr-2" /> Get Started
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Affiliate;
