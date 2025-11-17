import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Heart } from "lucide-react";
import { Link } from "react-router-dom";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [batchYear, setBatchYear] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/");
      }
    });
  }, [navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        toast({
          title: "Welcome back!",
          description: "You've successfully signed in.",
        });
        navigate("/");
      } else {
        if (!fullName || !batchYear || !dateOfBirth) {
          toast({
            title: "Missing information",
            description: "Please provide your full name, batch year, and date of birth.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        // Validate date of birth
        const dob = new Date(dateOfBirth);
        const today = new Date();
        const age = today.getFullYear() - dob.getFullYear();
        
        if (age < 10 || age > 120) {
          toast({
            title: "Invalid date of birth",
            description: "Please provide a valid date of birth.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              full_name: fullName.trim(),
              batch_year: batchYear,
              date_of_birth: dateOfBirth,
            },
          },
        });

        if (error) throw error;

        toast({
          title: "Welcome to SVCHS Alumni!",
          description: "Your account has been created. Please complete your profile.",
        });
        navigate("/");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const batchYears = Array.from({ length: 36 }, (_, i) => (1990 + i).toString());

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 font-bold text-2xl mb-4">
            <Heart className="h-8 w-8 text-primary" />
            <span className="bg-gradient-warm bg-clip-text text-transparent">SVCHS Alumni</span>
          </Link>
          <p className="text-muted-foreground">
            {isLogin ? "Welcome back! Sign in to your account." : "Join our vibrant alumni community."}
          </p>
        </div>

        <Card className="shadow-warm">
          <CardHeader>
            <CardTitle>{isLogin ? "Sign In" : "Register"}</CardTitle>
            <CardDescription>
              {isLogin
                ? "Enter your credentials to access your account"
                : "Create your alumni profile to connect with fellow graduates"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAuth} className="space-y-4">
              {!isLogin && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="Your full name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required={!isLogin}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="batchYear">Batch Year</Label>
                    <Select value={batchYear} onValueChange={setBatchYear} required={!isLogin}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your batch year" />
                      </SelectTrigger>
                      <SelectContent>
                        {batchYears.map((year) => (
                          <SelectItem key={year} value={year}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                    <Input
                      id="dateOfBirth"
                      type="date"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                      required={!isLogin}
                    />
                  </div>
                </>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <Button type="submit" className="w-full shadow-warm" disabled={loading}>
                {loading ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {isLogin ? "Don't have an account? Register here" : "Already have an account? Sign in"}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
