import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { ImageIcon, Upload, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Photo {
  id: string;
  image_url: string;
  title: string;
  description: string | null;
  uploaded_by: string;
  created_at: string;
}

export default function Gallery() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [userPhotos, setUserPhotos] = useState<Photo[]>([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    fetchPhotos();

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      fetchUserPhotos();
    }
  }, [user]);

  const fetchPhotos = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('photos')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setPhotos(data);
    }
    setLoading(false);
  };

  const fetchUserPhotos = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('photos')
      .select('*')
      .eq('uploaded_by', user.id);

    if (data) {
      setUserPhotos(data);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to upload photos.",
        variant: "destructive",
      });
      return;
    }

    if (userPhotos.length >= 3) {
      toast({
        title: "Upload limit reached",
        description: "You can only upload up to 3 photos. Please delete an existing photo first.",
        variant: "destructive",
      });
      return;
    }

    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file (JPEG, PNG, WEBP).",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB.",
        variant: "destructive",
      });
      return;
    }

    if (!title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a title for your photo.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError, data } = await supabase.storage
        .from('photos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('photos')
        .getPublicUrl(fileName);

      const { error: dbError } = await supabase
        .from('photos')
        .insert({
          image_url: publicUrl,
          title: title.trim(),
          description: description.trim() || null,
          uploaded_by: user.id,
        });

      if (dbError) throw dbError;

      toast({
        title: "Photo uploaded successfully!",
        description: "Your photo has been added to the gallery.",
      });

      setTitle("");
      setDescription("");
      fetchPhotos();
      fetchUserPhotos();
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload photo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (photo: Photo) => {
    if (!user || photo.uploaded_by !== user.id) return;

    try {
      const fileName = photo.image_url.split('/').slice(-2).join('/');

      const { error: storageError } = await supabase.storage
        .from('photos')
        .remove([fileName]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('photos')
        .delete()
        .eq('id', photo.id);

      if (dbError) throw dbError;

      toast({
        title: "Photo deleted",
        description: "Your photo has been removed from the gallery.",
      });

      fetchPhotos();
      fetchUserPhotos();
    } catch (error: any) {
      toast({
        title: "Delete failed",
        description: error.message || "Failed to delete photo. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <ImageIcon className="h-16 w-16 mx-auto text-primary mb-4" />
          <h1 className="text-4xl font-bold mb-4">Photo Gallery</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Browse through memories and moments from SVCHS events and reunions
          </p>
        </div>

        {user && (
          <Card className="mb-12 max-w-2xl mx-auto">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Photo Title *</Label>
                  <Input
                    id="title"
                    placeholder="Enter photo title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    disabled={uploading}
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Input
                    id="description"
                    placeholder="Add a description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={uploading}
                  />
                </div>
                <div>
                  <Label htmlFor="photo">
                    Upload Photo ({userPhotos.length}/3 used)
                  </Label>
                  <Input
                    id="photo"
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    disabled={uploading || userPhotos.length >= 3}
                    className="cursor-pointer"
                  />
                  {userPhotos.length >= 3 && (
                    <p className="text-sm text-destructive mt-2">
                      Upload limit reached. Delete a photo to upload new ones.
                    </p>
                  )}
                </div>
                {uploading && (
                  <p className="text-sm text-muted-foreground">Uploading...</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {!user && (
          <Card className="mb-12 max-w-2xl mx-auto">
            <CardContent className="pt-6 text-center">
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                Sign in to upload your photos to the gallery
              </p>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading photos...</p>
          </div>
        ) : photos.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No photos yet. Be the first to share your memories!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {photos.map((photo) => (
              <Card key={photo.id} className="overflow-hidden">
                <div className="aspect-square relative">
                  <img
                    src={photo.image_url}
                    alt={photo.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-lg mb-1">{photo.title}</h3>
                  {photo.description && (
                    <p className="text-sm text-muted-foreground mb-3">{photo.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground mb-3">
                    {new Date(photo.created_at).toLocaleDateString('en-IN')}
                  </p>
                  {user && photo.uploaded_by === user.id && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(photo)}
                      className="w-full"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
