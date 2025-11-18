import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, Heart, Award, Users } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface Donation {
  id: string;
  donor_name: string;
  amount: number;
  message: string | null;
  is_anonymous: boolean;
  created_at: string;
}

export default function Donate() {
  const [amount, setAmount] = useState("");
  const [donorName, setDonorName] = useState("");
  const [message, setMessage] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [totalRaised, setTotalRaised] = useState(0);
  const [user, setUser] = useState(null);
  const [transactionId, setTransactionId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      }
    });
    fetchDonations();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .maybeSingle();
    
    if (data) {
      setDonorName(data.full_name);
    }
  };

  const fetchDonations = async () => {
    const { data, error } = await supabase
      .from('donations')
      .select('*')
      .eq('verified', true)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!error && data) {
      setDonations(data);
      const total = data.reduce((sum, d) => sum + Number(d.amount), 0);
      setTotalRaised(total);
    }
  };

  const handleDonate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!user) {
      toast({
        title: "Please sign in",
        description: "You need to be logged in to make a donation.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    try {
      let screenshotUrl = null;

      // Upload screenshot if provided
      if (screenshotFile) {
        const fileExt = screenshotFile.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const filePath = `donation-proofs/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('photos')
          .upload(filePath, screenshotFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('photos')
          .getPublicUrl(filePath);

        screenshotUrl = urlData.publicUrl;
      }

      const { error } = await supabase.from('donations').insert({
        donor_id: user.id,
        donor_name: isAnonymous ? "Anonymous" : donorName,
        amount: parseFloat(amount),
        message: message || null,
        is_anonymous: isAnonymous,
        verified: false,
        transaction_id: transactionId || null,
        payment_method: paymentMethod || null,
        screenshot_url: screenshotUrl,
      });

      if (error) throw error;

      toast({
        title: "Thank you for your generosity!",
        description: "Your donation has been recorded and is pending verification. You'll receive a confirmation soon.",
      });

      setAmount("");
      setMessage("");
      setTransactionId("");
      setPaymentMethod("");
      setScreenshotFile(null);
      fetchDonations();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to process donation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <Heart className="h-16 w-16 mx-auto text-primary mb-4" />
          <h1 className="text-4xl font-bold mb-4">SVCHS Alumni Fund</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Support scholarships, infrastructure improvements, and programs that empower the next generation of SVCHS students
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card className="text-center shadow-soft">
            <CardHeader>
              <DollarSign className="h-10 w-10 mx-auto text-accent mb-2" />
              <CardTitle className="text-3xl font-bold">₹{totalRaised.toLocaleString('en-IN')}</CardTitle>
              <CardDescription>Total Raised</CardDescription>
            </CardHeader>
          </Card>
          <Card className="text-center shadow-soft">
            <CardHeader>
              <Users className="h-10 w-10 mx-auto text-primary mb-2" />
              <CardTitle className="text-3xl font-bold">{donations.length}+</CardTitle>
              <CardDescription>Generous Donors</CardDescription>
            </CardHeader>
          </Card>
          <Card className="text-center shadow-soft">
            <CardHeader>
              <Award className="h-10 w-10 mx-auto text-secondary mb-2" />
              <CardTitle className="text-3xl font-bold">100%</CardTitle>
              <CardDescription>Transparent & Secure</CardDescription>
            </CardHeader>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <Card className="shadow-warm">
            <CardHeader>
              <CardTitle>Make a Donation</CardTitle>
              <CardDescription>
                Every contribution, big or small, makes a lasting impact on our students' futures
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleDonate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Donation Amount (₹)</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="1000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min="1"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="donorName">Your Name</Label>
                  <Input
                    id="donorName"
                    type="text"
                    placeholder="Your full name"
                    value={donorName}
                    onChange={(e) => setDonorName(e.target.value)}
                    required
                    disabled={isAnonymous}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Message (Optional)</Label>
                  <Textarea
                    id="message"
                    placeholder="Share a message of support or why you're giving..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={3}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="transactionId">Transaction ID (Optional)</Label>
                  <Input
                    id="transactionId"
                    placeholder="Enter transaction/reference ID"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="paymentMethod">Payment Method (Optional)</Label>
                  <Input
                    id="paymentMethod"
                    placeholder="e.g., UPI, Bank Transfer, Cash"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="screenshot">Payment Screenshot (Optional)</Label>
                  <Input
                    id="screenshot"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setScreenshotFile(e.target.files?.[0] || null)}
                    className="cursor-pointer"
                  />
                  {screenshotFile && (
                    <p className="text-xs text-muted-foreground">
                      Selected: {screenshotFile.name}
                    </p>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="anonymous"
                    checked={isAnonymous}
                    onCheckedChange={(checked) => setIsAnonymous(checked as boolean)}
                  />
                  <Label htmlFor="anonymous" className="cursor-pointer">
                    Make this donation anonymous
                  </Label>
                </div>
                <Button type="submit" className="w-full shadow-warm" disabled={loading || !user}>
                  {loading ? "Processing..." : user ? "Submit Donation" : "Sign In to Donate"}
                </Button>
                {!user && (
                  <p className="text-sm text-muted-foreground text-center">
                    Please sign in to make a donation
                  </p>
                )}
              </form>

              <div className="mt-6 p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-2">Payment Details</h4>
                <p className="text-sm text-muted-foreground mb-2">Bank Transfer:</p>
                <p className="text-sm font-mono">SVCHS Alumni Fund</p>
                <p className="text-sm font-mono">Account: 1234567890</p>
                <p className="text-sm font-mono">IFSC: SBIN0001234</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Note: After making payment, your donation will be verified by our team within 24 hours.
                </p>
              </div>
            </CardContent>
          </Card>

          <div>
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-primary" />
                  Donor Wall
                </CardTitle>
                <CardDescription>
                  Celebrating our generous supporters
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {donations.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    Be the first to contribute to the SVCHS Alumni Fund!
                  </p>
                ) : (
                  donations.map((donation) => (
                    <div key={donation.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <Avatar>
                        <AvatarFallback className="bg-gradient-warm text-white">
                          {donation.is_anonymous ? "?" : getInitials(donation.donor_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-semibold text-sm">
                            {donation.is_anonymous ? "Anonymous Donor" : donation.donor_name}
                          </p>
                          <span className="text-primary font-bold text-sm">
                            ₹{Number(donation.amount).toLocaleString('en-IN')}
                          </span>
                        </div>
                        {donation.message && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            "{donation.message}"
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(donation.created_at).toLocaleDateString('en-IN')}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
