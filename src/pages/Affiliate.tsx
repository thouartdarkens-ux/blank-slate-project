import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, Share2, BarChart3, Check } from "lucide-react";

const Affiliate = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-20 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Become an Affiliate Partner
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Earn competitive commissions by helping students access their WAEC results
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg">
              <Link to="/affiliate/login">Join Now</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/affiliate/login">Sign In</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Why join */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">
              Why Join Our Affiliate Program?
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
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
              <Card key={f.title}>
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <f.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-4">{f.title}</h3>
                  <ul className="space-y-2">
                    {f.items.map((i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-primary" /> {i}
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
      <section className="py-16 px-4 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">How It Works</h2>
            <p className="text-muted-foreground">Start earning in 3 simple steps</p>
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
              <Card key={s.n}>
                <CardContent className="p-6 text-center">
                  <div className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                    {s.n}
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{s.title}</h3>
                  <p className="text-sm text-muted-foreground">{s.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center mt-12">
            <Button asChild size="lg">
              <Link to="/affiliate/login">Get Started</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Affiliate;
