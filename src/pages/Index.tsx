import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Users, Calendar, IndianRupee, Award, BookOpen } from "lucide-react";
import Navbar from "@/components/Navbar";
import heroImage from "@/assets/school-photo.png";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function Index() {
  const [stats, setStats] = useState({
    totalAlumni: 0,
    totalDonations: 0,
    upcomingEvents: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const [alumniCount, donationsSum, eventsCount] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('donations').select('amount').eq('verified', true),
      supabase.from('events').select('id', { count: 'exact', head: true }).gte('event_date', new Date().toISOString()),
    ]);

    const totalDonations = donationsSum.data?.reduce((sum, d) => sum + Number(d.amount), 0) || 0;

    setStats({
      totalAlumni: alumniCount.count || 0,
      totalDonations: Math.round(totalDonations),
      upcomingEvents: eventsCount.count || 0,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative h-[600px] flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImage})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/80 to-transparent" />
        </div>
        
        <div className="relative z-10 container mx-auto px-4 text-center">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            Welcome Home,
            <br />
            <span className="bg-gradient-warm bg-clip-text text-transparent">SVCHS Alumni</span>
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Reconnect with classmates, relive memories, and empower the next generation of leaders from Swami Vivekananda Composite High School
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/auth">
              <Button size="lg" className="text-lg shadow-warm">
                <Heart className="mr-2 h-5 w-5" />
                Join Our Community
              </Button>
            </Link>
            <Link to="/donate">
              <Button size="lg" variant="outline" className="text-lg">
                <IndianRupee className="mr-2 h-5 w-5" />
                Support SVCHS
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="text-center shadow-soft">
              <CardHeader>
                <Users className="h-12 w-12 mx-auto text-primary mb-2" />
                <CardTitle className="text-4xl font-bold">{stats.totalAlumni}+</CardTitle>
                <CardDescription className="text-base">Alumni Connected</CardDescription>
              </CardHeader>
            </Card>
            <Card className="text-center shadow-soft">
              <CardHeader>
                <IndianRupee className="h-12 w-12 mx-auto text-accent mb-2" />
                <CardTitle className="text-4xl font-bold">₹{stats.totalDonations.toLocaleString('en-IN')}</CardTitle>
                <CardDescription className="text-base">Raised for SVCHS Fund</CardDescription>
              </CardHeader>
            </Card>
            <Card className="text-center shadow-soft">
              <CardHeader>
                <Calendar className="h-12 w-12 mx-auto text-secondary mb-2" />
                <CardTitle className="text-4xl font-bold">{stats.upcomingEvents}</CardTitle>
                <CardDescription className="text-base">Upcoming Events</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <Award className="h-16 w-16 mx-auto text-primary mb-6" />
          <h2 className="text-4xl font-bold mb-6">Our Mission</h2>
          <p className="text-lg text-muted-foreground leading-relaxed mb-8">
            Inspired by the teachings of Swami Vivekananda, we unite SVCHS alumni to foster lifelong connections, 
            celebrate our shared heritage, and create opportunities that empower current and future students. 
            Together, we build a legacy of excellence, compassion, and community service.
          </p>
          <blockquote className="italic text-xl text-foreground/80 border-l-4 border-primary pl-6 py-4">
            "Arise, awake, and stop not till the goal is reached."
            <footer className="text-sm text-muted-foreground mt-2">— Swami Vivekananda</footer>
          </blockquote>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-12">What We Offer</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="shadow-soft hover:shadow-warm transition-shadow">
              <CardHeader>
                <Users className="h-10 w-10 text-primary mb-4" />
                <CardTitle>Alumni Directory</CardTitle>
                <CardDescription>
                  Find and reconnect with classmates from your batch. Search by year, name, or location.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link to="/directory">
                  <Button variant="outline" className="w-full">Explore Directory</Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="shadow-soft hover:shadow-warm transition-shadow">
              <CardHeader>
                <Calendar className="h-10 w-10 text-secondary mb-4" />
                <CardTitle>Reunions & Events</CardTitle>
                <CardDescription>
                  Stay updated on reunions, webinars, and community gatherings. RSVP and never miss out.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link to="/events">
                  <Button variant="outline" className="w-full">View Events</Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="shadow-soft hover:shadow-warm transition-shadow">
              <CardHeader>
                <IndianRupee className="h-10 w-10 text-accent mb-4" />
                <CardTitle>SVCHS Alumni Fund</CardTitle>
                <CardDescription>
                  Support scholarships, infrastructure, and student programs. Every contribution makes a difference.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link to="/donate">
                  <Button variant="outline" className="w-full">Donate Now</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <BookOpen className="h-16 w-16 mx-auto text-primary mb-6" />
          <h2 className="text-4xl font-bold mb-6">Your Story Matters</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Whether you graduated in 1990 or 2020, you're part of the SVCHS family. 
            Join us in building a vibrant, supportive community for generations to come.
          </p>
          <Link to="/auth">
            <Button size="lg" className="text-lg shadow-warm">
              Register Today
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-muted py-12 border-t border-border">
        <div className="container mx-auto px-4 text-center">
          <p className="text-muted-foreground mb-4">
            © {new Date().getFullYear()} SVCHS Alumni Association. All rights reserved.
          </p>
          <p className="text-sm text-muted-foreground">
            Swami Vivekananda Composite High School, Yenigadale, Chelur Road
          </p>
          <div className="mt-6 flex justify-center gap-6 text-sm">
            <Link to="/about" className="text-muted-foreground hover:text-primary transition-colors">About Us</Link>
            <Link to="/privacy" className="text-muted-foreground hover:text-primary transition-colors">Privacy Policy</Link>
            <Link to="/contact" className="text-muted-foreground hover:text-primary transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
