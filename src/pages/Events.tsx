import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Calendar, MapPin, Users, Clock, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Event {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  location: string | null;
  image_url: string | null;
}

interface RSVP {
  event_id: string;
  status: string;
}

export default function Events() {
  const [events, setEvents] = useState<Event[]>([]);
  const [rsvps, setRsvps] = useState<RSVP[]>([]);
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    event_date: "",
    location: "",
    image_url: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchRSVPs(session.user.id);
        checkAdminRole(session.user.id);
      }
    });
    fetchEvents();
  }, []);

  const checkAdminRole = async (userId: string) => {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();
    
    setIsAdmin(!!data);
  };

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('event_date', { ascending: true });

    if (!error && data) {
      setEvents(data);
    }
    setLoading(false);
  };

  const fetchRSVPs = async (userId: string) => {
    const { data } = await supabase
      .from('event_rsvps')
      .select('event_id, status')
      .eq('user_id', userId);

    if (data) {
      setRsvps(data);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !isAdmin) {
      toast({
        title: "Permission denied",
        description: "Only admins can create events.",
        variant: "destructive",
      });
      return;
    }

    if (!newEvent.title || !newEvent.event_date) {
      toast({
        title: "Missing information",
        description: "Please provide at least a title and date for the event.",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);

    try {
      const { error } = await supabase.from('events').insert({
        title: newEvent.title,
        description: newEvent.description || null,
        event_date: new Date(newEvent.event_date).toISOString(),
        location: newEvent.location || null,
        image_url: newEvent.image_url || null,
        created_by: user.id,
      });

      if (error) throw error;

      toast({
        title: "Event created!",
        description: "The event has been added successfully.",
      });

      setNewEvent({
        title: "",
        description: "",
        event_date: "",
        location: "",
        image_url: "",
      });
      setDialogOpen(false);
      fetchEvents();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create event. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleRSVP = async (eventId: string) => {
    if (!user) {
      toast({
        title: "Please sign in",
        description: "You need to be logged in to RSVP to events.",
        variant: "destructive",
      });
      return;
    }

    try {
      const existingRSVP = rsvps.find(r => r.event_id === eventId);
      
      if (existingRSVP) {
        const { error } = await supabase
          .from('event_rsvps')
          .delete()
          .eq('event_id', eventId)
          .eq('user_id', user.id);

        if (error) throw error;

        setRsvps(rsvps.filter(r => r.event_id !== eventId));
        toast({
          title: "RSVP cancelled",
          description: "You've cancelled your RSVP for this event.",
        });
      } else {
        const { error } = await supabase.from('event_rsvps').insert({
          event_id: eventId,
          user_id: user.id,
          status: 'attending',
        });

        if (error) throw error;

        setRsvps([...rsvps, { event_id: eventId, status: 'attending' }]);
        toast({
          title: "RSVP confirmed!",
          description: "We look forward to seeing you at the event.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update RSVP. Please try again.",
        variant: "destructive",
      });
    }
  };

  const hasRSVPd = (eventId: string) => {
    return rsvps.some(r => r.event_id === eventId);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isPastEvent = (dateString: string) => {
    return new Date(dateString) < new Date();
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-12">
          <div className="text-center flex-1">
            <Calendar className="h-16 w-16 mx-auto text-primary mb-4" />
            <h1 className="text-4xl font-bold mb-4">Alumni Events</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Join reunions, webinars, and community gatherings to stay connected with fellow SVCHS alumni
            </p>
          </div>
          {isAdmin && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="ml-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Event
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Event</DialogTitle>
                  <DialogDescription>
                    Add a new event for the alumni community
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateEvent} className="space-y-4">
                  <div>
                    <Label htmlFor="title">Event Title *</Label>
                    <Input
                      id="title"
                      value={newEvent.title}
                      onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={newEvent.description}
                      onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                      rows={4}
                    />
                  </div>
                  <div>
                    <Label htmlFor="event_date">Date & Time *</Label>
                    <Input
                      id="event_date"
                      type="datetime-local"
                      value={newEvent.event_date}
                      onChange={(e) => setNewEvent({ ...newEvent, event_date: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={newEvent.location}
                      onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                      placeholder="Event venue"
                    />
                  </div>
                  <div>
                    <Label htmlFor="image_url">Image URL (Optional)</Label>
                    <Input
                      id="image_url"
                      value={newEvent.image_url}
                      onChange={(e) => setNewEvent({ ...newEvent, image_url: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button type="submit" disabled={creating} className="flex-1">
                      {creating ? "Creating..." : "Create Event"}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading events...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No upcoming events at the moment. Check back soon!</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => {
              const past = isPastEvent(event.event_date);
              const rsvpd = hasRSVPd(event.id);

              return (
                <Card key={event.id} className="shadow-soft hover:shadow-warm transition-shadow">
                  {event.image_url && (
                    <div className="h-48 overflow-hidden rounded-t-lg">
                      <img
                        src={event.image_url}
                        alt={event.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <CardTitle className="text-xl">{event.title}</CardTitle>
                      {past ? (
                        <Badge variant="secondary">Past Event</Badge>
                      ) : rsvpd ? (
                        <Badge className="bg-gradient-warm text-white">Attending</Badge>
                      ) : null}
                    </div>
                    <CardDescription className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(event.event_date)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4" />
                        <span>{formatTime(event.event_date)}</span>
                      </div>
                      {event.location && (
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="h-4 w-4" />
                          <span>{event.location}</span>
                        </div>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {event.description && (
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                        {event.description}
                      </p>
                    )}
                    {!past && (
                      <Button
                        onClick={() => handleRSVP(event.id)}
                        variant={rsvpd ? "outline" : "default"}
                        className={rsvpd ? "" : "shadow-warm"}
                        disabled={!user}
                      >
                        <Users className="mr-2 h-4 w-4" />
                        {rsvpd ? "Cancel RSVP" : user ? "RSVP Now" : "Sign In to RSVP"}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
