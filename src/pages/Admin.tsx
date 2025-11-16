import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Shield, Users, DollarSign, Calendar, CheckCircle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Admin() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pendingDonations, setPendingDonations] = useState([]);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/auth");
      return;
    }

    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!data) {
      toast({
        title: "Access Denied",
        description: "You don't have admin privileges.",
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    setIsAdmin(true);
    fetchPendingDonations();
    setLoading(false);
  };

  const fetchPendingDonations = async () => {
    const { data, error } = await supabase
      .from('donations')
      .select('*')
      .eq('verified', false)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setPendingDonations(data);
    }
  };

  const handleVerifyDonation = async (donationId: string, verify: boolean) => {
    try {
      if (verify) {
        const { error } = await supabase
          .from('donations')
          .update({ verified: true })
          .eq('id', donationId);

        if (error) throw error;

        toast({
          title: "Donation verified",
          description: "The donation has been verified and will appear on the donor wall.",
        });
      } else {
        const { error } = await supabase
          .from('donations')
          .delete()
          .eq('id', donationId);

        if (error) throw error;

        toast({
          title: "Donation rejected",
          description: "The donation has been removed.",
        });
      }

      fetchPendingDonations();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to process donation.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-12 text-center">
          <p className="text-muted-foreground">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <Shield className="h-16 w-16 mx-auto text-primary mb-4" />
          <h1 className="text-4xl font-bold mb-4">Admin Dashboard</h1>
          <p className="text-xl text-muted-foreground">
            Manage alumni, donations, and events
          </p>
        </div>

        <div className="grid md:grid-cols-4 gap-6 mb-12">
          <Card className="text-center shadow-soft">
            <CardHeader>
              <Users className="h-8 w-8 mx-auto text-primary mb-2" />
              <CardTitle className="text-2xl">Alumni</CardTitle>
              <CardDescription>Manage Members</CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center shadow-soft">
            <CardHeader>
              <DollarSign className="h-8 w-8 mx-auto text-accent mb-2" />
              <CardTitle className="text-2xl">Donations</CardTitle>
              <CardDescription>Verify & Track</CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center shadow-soft">
            <CardHeader>
              <Calendar className="h-8 w-8 mx-auto text-secondary mb-2" />
              <CardTitle className="text-2xl">Events</CardTitle>
              <CardDescription>Create & Manage</CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center shadow-soft">
            <CardHeader>
              <Shield className="h-8 w-8 mx-auto text-primary mb-2" />
              <CardTitle className="text-2xl">Roles</CardTitle>
              <CardDescription>Assign Access</CardDescription>
            </CardHeader>
          </Card>
        </div>

        <Card className="shadow-warm">
          <CardHeader>
            <CardTitle>Pending Donation Verifications</CardTitle>
            <CardDescription>
              Review and verify donations before they appear on the donor wall
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pendingDonations.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No pending donations to verify
              </p>
            ) : (
              <div className="space-y-4">
                {pendingDonations.map((donation: any) => (
                  <div key={donation.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <p className="font-semibold">{donation.donor_name}</p>
                        <Badge variant="outline" className="text-primary font-bold">
                          ₹{Number(donation.amount).toLocaleString('en-IN')}
                        </Badge>
                      </div>
                      {donation.message && (
                        <p className="text-sm text-muted-foreground mb-2">
                          "{donation.message}"
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {new Date(donation.created_at).toLocaleString('en-IN')}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleVerifyDonation(donation.id, true)}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Verify
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleVerifyDonation(donation.id, false)}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
